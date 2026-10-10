\# CardioMap 3D: Cardiovascular Risk Visualization \& Prediction



Team \*\*Visionaries\*\* (Dream · Innovate · Build)



An interactive web app that predicts overall coronary artery disease (CAD) and

vessel-level stenosis (LAD, LCX, RCA) from clinical, ECG, laboratory and

echocardiographic features, and maps the predictions onto an interactive 3D heart.



> \*\*Clinical safety notice:\*\* educational / decision-support tool only. Not a

> substitute for formal diagnostic imaging.



\*\*Live demo:\*\* https://YOUR-APP.vercel.app

\*\*Backend API:\*\* https://YOUR-API.onrender.com/docs

\*\*Demo video:\*\* https://youtube.com/YOUR-LINK



(The backend runs on a free tier and sleeps when idle; the first load can take about a minute.)



\## Features

\- 4 classifiers: overall CAD, LAD, LCX, RCA (leakage-free inputs)

\- Interactive 3D heart (React Three Fiber): rotate, zoom, select an artery, X-ray mode

\- Artery colors update live from predicted probabilities

\- Explainability: per-patient SHAP factors and global SHAP importance

\- Model performance tab: metrics table, ROC curves, SHAP plots

\- Sample low-risk / high-risk patients for quick demos



\## Tech stack

Python, pandas, scikit-learn, XGBoost, SHAP, FastAPI | React, Vite, Three.js, @react-three/fiber



\## Dataset

Extension of the Z-Alizadeh Sani dataset (UCI Machine Learning Repository), 303 patients.

Target columns (Cath, LAD, LCX, RCA) are excluded from model inputs to prevent leakage.



\## Evaluation

Nested 5-fold stratified cross-validation (inner 3-fold randomized search for tuning).

Full table: `results/day2\_final\_metrics.csv`, ROC curves: `results/roc\_curves.png`.



| Target | Best model | ROC-AUC |

|---|---|---|

| CAD | Logistic Regression | 0.926 |

| LAD | Random Forest | 0.849 |

| LCX | Random Forest | 0.734 |

| RCA | Random Forest | 0.712 |



\## Project structure

```

backend/    data.py, train\_baseline.py, train\_final.py, explain\_\*.py, main.py, models/

frontend/   React + Three.js app

results/    metrics, ROC curve, SHAP plots

data/       dataset

```



\## Run locally

```bash

\# backend

python -m venv venv

venv\\Scripts\\activate           # Windows

pip install -r backend/requirements.txt

uvicorn main:app --app-dir backend --reload



\# frontend (new terminal)

cd frontend

npm install

npm run dev

```

Open http://localhost:5173



\## Limitations

Small dataset; LCX/RCA are weaker and indicative only; scores are not calibrated;

missing inputs use the training median; the 3D artery layout is schematic.

