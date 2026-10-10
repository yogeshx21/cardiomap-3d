# backend/train_final.py
import json
import time
import warnings
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import loguniform, randint, uniform
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from data import prepare, save_feature_list

warnings.filterwarnings("ignore")

SEED = 42
QUICK = False           # pehli test run ke liye True kar do (jaldi chalegi)
N_ITER = 5 if QUICK else 12

MODELS_DIR = Path("backend/models")
RESULTS_DIR = Path("results")
MODELS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)

X, targets, _ = prepare()
save_feature_list(X)
X.to_csv(MODELS_DIR / "background.csv", index=False)

# Frontend form ke liye feature info (Day 3/4 mein kaam aayega)
meta = {}
for c in X.columns:
    col = X[c]
    vals = set(col.dropna().unique().tolist())
    meta[c] = {
        "min": float(col.min()),
        "max": float(col.max()),
        "median": float(col.median()),
        "binary": vals.issubset({0.0, 1.0}),
    }
with open(MODELS_DIR / "feature_meta.json", "w") as f:
    json.dump(meta, f, indent=2)


def make_model(name, y):
    pos = int(y.sum())
    neg = len(y) - pos
    spw = neg / max(pos, 1)

    if name == "LogReg":
        pipe = Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("sc", StandardScaler()),
            ("clf", LogisticRegression(max_iter=3000, class_weight="balanced",
                                       random_state=SEED)),
        ])
        dist = {"clf__C": loguniform(1e-2, 1e2)}

    elif name == "RandomForest":
        pipe = Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(class_weight="balanced",
                                           random_state=SEED, n_jobs=1)),
        ])
        dist = {
            "clf__n_estimators": randint(150, 400),
            "clf__max_depth": [3, 5, 8, None],
            "clf__min_samples_leaf": randint(1, 6),
            "clf__max_features": ["sqrt", "log2", 0.3],
        }

    else:  # XGBoost
        pipe = Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", XGBClassifier(scale_pos_weight=spw, eval_metric="logloss",
                                  random_state=SEED, n_jobs=1)),
        ])
        dist = {
            "clf__n_estimators": randint(100, 400),
            "clf__max_depth": randint(2, 5),
            "clf__learning_rate": loguniform(0.02, 0.2),
            "clf__subsample": uniform(0.6, 0.4),
            "clf__colsample_bytree": uniform(0.5, 0.5),
            "clf__min_child_weight": randint(1, 6),
            "clf__reg_lambda": loguniform(0.5, 10),
        }
    return pipe, dist


def nested_cv(model_name, y):
    """Outer fold = honest test. Inner fold = hyperparameter tuning."""
    outer = StratifiedKFold(5, shuffle=True, random_state=SEED)
    oof = np.zeros(len(y))
    fold_aucs = []
    for tr, te in outer.split(X, y):
        base, dist = make_model(model_name, y.iloc[tr])
        search = RandomizedSearchCV(
            base, dist, n_iter=N_ITER, scoring="roc_auc",
            cv=StratifiedKFold(3, shuffle=True, random_state=SEED),
            random_state=SEED, n_jobs=-1, refit=True,
        )
        search.fit(X.iloc[tr], y.iloc[tr])
        p = search.predict_proba(X.iloc[te])[:, 1]
        oof[te] = p
        fold_aucs.append(roc_auc_score(y.iloc[te], p))
    return oof, fold_aucs


def summarize(y, oof, fold_aucs):
    pred = (oof >= 0.5).astype(int)
    return {
        "accuracy": accuracy_score(y, pred),
        "precision": precision_score(y, pred, zero_division=0),
        "recall": recall_score(y, pred, zero_division=0),
        "f1": f1_score(y, pred, zero_division=0),
        "roc_auc": roc_auc_score(y, oof),
        "auc_fold_mean": float(np.mean(fold_aucs)),
        "auc_fold_std": float(np.std(fold_aucs)),
    }


rows, oofs = [], {}
t0 = time.time()
for tname, y in targets.items():
    print(f"\n=== Target: {tname}  (positive={int(y.sum())}/{len(y)}) ===")
    for mname in ["LogReg", "RandomForest", "XGBoost"]:
        oof, fold_aucs = nested_cv(mname, y)
        oofs[(tname, mname)] = oof
        s = summarize(y, oof, fold_aucs)
        rows.append({"Target": tname, "Model": mname, **s})
        print(f"  {mname:13s} auc={s['roc_auc']:.3f} (+-{s['auc_fold_std']:.3f})  "
              f"acc={s['accuracy']:.3f}  prec={s['precision']:.3f}  "
              f"rec={s['recall']:.3f}  f1={s['f1']:.3f}   "
              f"[{(time.time()-t0)/60:.1f} min]")

results = pd.DataFrame(rows)
best = results.loc[results.groupby("Target")["roc_auc"].idxmax()].reset_index(drop=True)

# Final models: best model ko poore data par tune + fit karke save
best_info = {}
for _, r in best.iterrows():
    tname, mname = r["Target"], r["Model"]
    y = targets[tname]
    base, dist = make_model(mname, y)
    final = RandomizedSearchCV(
        base, dist, n_iter=30, scoring="roc_auc",
        cv=StratifiedKFold(5, shuffle=True, random_state=SEED),
        random_state=SEED, n_jobs=-1, refit=True,
    )
    final.fit(X, y)
    joblib.dump(final.best_estimator_, MODELS_DIR / f"{tname}_model.joblib")
    params = {k: (v.item() if hasattr(v, "item") else v)
              for k, v in final.best_params_.items()}
    best_info[tname] = {
        "model": mname,
        "params": params,
        "nested_cv": {k: float(r[k]) for k in
                      ["accuracy", "precision", "recall", "f1", "roc_auc"]},
    }
    print(f"Saved: {tname}_model.joblib  ({mname})")

with open(MODELS_DIR / "best_models.json", "w") as f:
    json.dump(best_info, f, indent=2)

# Metrics table
results.to_csv(RESULTS_DIR / "day2_all_models.csv", index=False)
best.to_csv(RESULTS_DIR / "day2_final_metrics.csv", index=False)

# ROC curves (out-of-fold predictions, best model per target)
styles = {"CAD": ("-", "black"), "LAD": ("--", "black"),
          "LCX": (":", "black"), "RCA": ("-.", "#666666")}
fig, ax = plt.subplots(figsize=(6, 5.5))
for _, r in best.iterrows():
    t, m = r["Target"], r["Model"]
    fpr, tpr, _ = roc_curve(targets[t], oofs[(t, m)])
    ls, col = styles.get(t, ("-", "black"))
    ax.plot(fpr, tpr, ls=ls, color=col, lw=2,
            label=f"{t} ({m}) AUC={r['roc_auc']:.2f}")
ax.plot([0, 1], [0, 1], color="#bbbbbb", lw=1)
ax.set_xlabel("False Positive Rate")
ax.set_ylabel("True Positive Rate")
ax.set_title("ROC curves (nested CV, out-of-fold)")
ax.legend(loc="lower right", fontsize=8)
plt.tight_layout()
plt.savefig(RESULTS_DIR / "roc_curves.png", dpi=150)

print("\n" + "=" * 70)
print("FINAL (best model per target, nested CV):")
print(best[["Target", "Model", "accuracy", "precision", "recall", "f1",
            "roc_auc"]].round(3).to_string(index=False))
print(f"\nTotal time: {(time.time()-t0)/60:.1f} min")