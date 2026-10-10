# backend/explain_utils.py
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier


class ShapExplainer:
    """SHAP values: LogReg / RandomForest / XGBoost."""
    method = "SHAP"

    def __init__(self, pipe, X_background: pd.DataFrame):
        self.pipe = pipe
        self.clf = pipe[-1]
        self.cols = list(X_background.columns)
        Xb = pipe[:-1].transform(X_background[self.cols])

        if isinstance(self.clf, XGBClassifier):
            self.kind = "xgb"            # native TreeSHAP, shap import nahi chahiye
        else:
            import shap                  # lazy import (memory bachane ke liye)
            if isinstance(self.clf, LogisticRegression):
                self.kind = "linear"
                self.expl = shap.LinearExplainer(self.clf, Xb)
            else:
                self.kind = "tree"
                self.expl = shap.TreeExplainer(self.clf)

    def values(self, X: pd.DataFrame):
        """Returns (shap_values [n, features], base_value)."""
        Xt = self.pipe[:-1].transform(X[self.cols])

        if self.kind == "xgb":
            contrib = self.clf.get_booster().predict(xgb.DMatrix(Xt), pred_contribs=True)
            return contrib[:, :-1], float(contrib[0, -1])

        sv = self.expl.shap_values(Xt)
        if isinstance(sv, list):
            sv = sv[-1]
        sv = np.asarray(sv)
        if sv.ndim == 3:
            sv = sv[:, :, -1]
        base = float(np.ravel(self.expl.expected_value)[-1])
        return sv, base


class OcclusionExplainer:
    """
    Plan B (halka, shap library nahi chahiye).
    Har feature ko typical (median) value se badal kar dekhta hai ki probability
    kitni badli. Positive = ye feature risk badha raha hai.
    """
    method = "Occlusion"

    def __init__(self, pipe, X_background: pd.DataFrame):
        self.pipe = pipe
        self.cols = list(X_background.columns)
        self.median = X_background[self.cols].median()

    def values(self, X: pd.DataFrame):
        x = X[self.cols].iloc[[0]]
        p0 = float(self.pipe.predict_proba(x)[0, 1])
        rows = pd.concat([x] * len(self.cols), ignore_index=True)
        for i, c in enumerate(self.cols):
            rows.iat[i, rows.columns.get_loc(c)] = self.median[c]
        p = self.pipe.predict_proba(rows)[:, 1]
        sv = (p0 - p).reshape(1, -1)
        return sv, float(p0 - sv.sum())