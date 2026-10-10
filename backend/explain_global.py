# backend/explain_global.py
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from data import TARGET_KEYS
from explain_utils import ShapExplainer

X = pd.read_csv("backend/models/background.csv")
all_rows = []

for t in TARGET_KEYS:
    path = f"backend/models/{t}_model.joblib"
    try:
        pipe = joblib.load(path)
    except FileNotFoundError:
        print(f"[SKIP] {t}: model file nahi mili")
        continue

    ex = ShapExplainer(pipe, X)
    sv, base = ex.values(X)

    imp = pd.Series(np.abs(sv).mean(axis=0), index=X.columns).sort_values(ascending=False)
    for feat, val in imp.head(15).items():
        all_rows.append({"Target": t, "Feature": feat, "MeanAbsSHAP": val})

    top = imp.head(15)[::-1]
    fig, ax = plt.subplots(figsize=(6.5, 5))
    ax.barh(top.index, top.values, color="black")
    ax.set_title(f"{t}: top features (mean |SHAP|)")
    ax.set_xlabel("Average impact on prediction")
    plt.tight_layout()
    plt.savefig(f"results/shap_global_{t}.png", dpi=150)
    plt.close()

    # Ek patient ka local explanation (sabse zyada risk wala)
    proba = pipe.predict_proba(X)[:, 1]
    i = int(np.argmax(proba))
    contrib = pd.Series(sv[i], index=X.columns)
    top5 = contrib.reindex(contrib.abs().sort_values(ascending=False).index).head(5)
    print(f"\n[{t}] Highest-risk patient #{i}, probability = {proba[i]:.2f}")
    for feat, val in top5.items():
        arrow = "badhata hai" if val > 0 else "ghatata hai"
        print(f"   {feat} = {X.loc[i, feat]:.2f} -> risk {arrow} ({val:+.3f})")

pd.DataFrame(all_rows).to_csv("results/shap_global_importance.csv", index=False)
print("\nSaved: results/shap_global_<TARGET>.png, results/shap_global_importance.csv")