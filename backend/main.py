# backend/main.py
import json
import os
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from explain_utils import OcclusionExplainer, ShapExplainer

BASE = Path(__file__).resolve().parent.parent
MODELS = BASE / "backend" / "models"
TARGETS = ["CAD", "LAD", "LCX", "RCA"]

# Plan B: Render par memory kam pade to env var LITE_EXPLAIN=1 laga do
LITE = os.getenv("LITE_EXPLAIN", "0") == "1"
Explainer = OcclusionExplainer if LITE else ShapExplainer

app = FastAPI(title="CardioMap 3D API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

cols = json.load(open(MODELS / "feature_columns.json"))
meta = json.load(open(MODELS / "feature_meta.json"))
defaults = {c: meta[c]["median"] for c in cols}
background = pd.read_csv(MODELS / "background.csv")

pipes, explainers = {}, {}
for t in TARGETS:
    p = MODELS / f"{t}_model.joblib"
    if p.exists():
        pipes[t] = joblib.load(p)
        explainers[t] = Explainer(pipes[t], background)


class PatientIn(BaseModel):
    features: dict[str, float] = {}


def risk_level(p: float) -> str:
    return "low" if p < 0.33 else ("medium" if p < 0.66 else "high")


@app.get("/")
def root():
    return {"service": "CardioMap 3D API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": list(pipes.keys()),
            "explanation_method": Explainer.method}


@app.get("/features")
def features():
    return meta


@app.get("/metrics")
def metrics():
    df = pd.read_csv(BASE / "results" / "day2_final_metrics.csv")
    return df.to_dict(orient="records")


@app.post("/predict")
def predict(req: PatientIn):
    row, ignored = dict(defaults), []
    for k, v in req.features.items():
        if k in row:
            row[k] = v
        else:
            ignored.append(k)
    df = pd.DataFrame([row])[cols]

    out = {}
    for t, pipe in pipes.items():
        prob = float(pipe.predict_proba(df)[0, 1])
        sv, _ = explainers[t].values(df)
        contrib = pd.Series(sv[0], index=cols)
        top = contrib.reindex(contrib.abs().sort_values(ascending=False).index).head(8)
        out[t] = {
            "probability": round(prob, 4),
            "risk_level": risk_level(prob),
            "top_factors": [
                {"feature": f, "value": float(df.iloc[0][f]),
                 "contribution": round(float(v), 4),
                 "direction": "increases" if v > 0 else "decreases"}
                for f, v in top.items()
            ],
        }
    return {"predictions": out, "ignored_features": ignored,
            "explanation_method": Explainer.method,
            "disclaimer": "Educational / decision support only. "
                          "Not a substitute for formal diagnostic imaging."}