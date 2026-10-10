# backend/train_baseline.py
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import RepeatedStratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from data import prepare

warnings.filterwarnings("ignore")
SEED = 42

X, targets, _ = prepare()


def make_models(y):
    # Imbalance ke liye weight
    pos, neg = y.sum(), len(y) - y.sum()
    spw = neg / max(pos, 1)
    return {
        "LogReg": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("sc", StandardScaler()),
            ("clf", LogisticRegression(max_iter=2000, class_weight="balanced",
                                       random_state=SEED)),
        ]),
        "RandomForest": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(n_estimators=300, class_weight="balanced",
                                           random_state=SEED, n_jobs=-1)),
        ]),
        "XGBoost": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", XGBClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                                  subsample=0.8, colsample_bytree=0.8,
                                  scale_pos_weight=spw, eval_metric="logloss",
                                  random_state=SEED)),
        ]),
    }


scoring = {
    "accuracy": "accuracy",
    "precision": "precision",
    "recall": "recall",
    "f1": "f1",
    "roc_auc": "roc_auc",
}

rows = []
for tname, y in targets.items():
    min_class = int(min(y.sum(), len(y) - y.sum()))
    n_splits = min(5, min_class)
    if n_splits < 2:
        print(f"[SKIP] {tname}: ek class bahut kam hai")
        continue

    cv = RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=3, random_state=SEED)
    print(f"\n=== Target: {tname} (positive={int(y.sum())}/{len(y)}) ===")

    for mname, model in make_models(y).items():
        res = cross_validate(model, X, y, cv=cv, scoring=scoring, n_jobs=1)
        row = {"Target": tname, "Model": mname}
        for m in scoring:
            row[m] = res[f"test_{m}"].mean()
            row[m + "_std"] = res[f"test_{m}"].std()
        rows.append(row)
        print(f"  {mname:13s} acc={row['accuracy']:.3f}  prec={row['precision']:.3f}  "
              f"rec={row['recall']:.3f}  f1={row['f1']:.3f}  auc={row['roc_auc']:.3f}")

results = pd.DataFrame(rows)
results.to_csv("results/day1_baseline_results.csv", index=False)

print("\n" + "=" * 70)
print("FINAL COMPARISON (mean over repeated CV)")
show = results[["Target", "Model", "accuracy", "precision", "recall", "f1", "roc_auc"]]
print(show.round(3).to_string(index=False))

print("\nBEST MODEL PER TARGET (by ROC-AUC):")
best = results.loc[results.groupby("Target")["roc_auc"].idxmax()]
print(best[["Target", "Model", "roc_auc", "f1"]].round(3).to_string(index=False))
print("\nSaved: results/day1_baseline_results.csv")