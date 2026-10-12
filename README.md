# CardioMap 3D: Cardiovascular Risk Visualization & Prediction

**Multimodal AI Hackathon | Track A: Cardiovascular Risk Visualization and Prediction**

> **Clinical safety notice:** CardioMap 3D is an educational / decision-support prototype.
> It is not a medical device and is not a substitute for formal diagnostic imaging
> or a clinician's judgement.

📄 **[Read the full project documentation (PDF)](docs/CardioMap3D_documentation.pdf)**

## Live links

| What | Link |
|---|---|
| Live demo (web app) | https://cardiomap-3d.vercel.app |
| Backend API docs (Swagger) | https://cardiomap-api.onrender.com/docs |
| Source code | https://github.com/yogeshx21/cardiomap-3d |
| Project documentation (PDF) | [CardioMap3D_documentation.pdf](docs/CardioMap3D_documentation.pdf) |

> The backend runs on a free hosting tier and goes to sleep when idle. If the demo shows
> "Server start ho raha hai...", wait about a minute and it will load automatically.

## Team Visionaries (Dream · Innovate · Build)

| Name | Role |
|---|---|
| **Yogesh Mondhe** | Team Leader |
| **Khushi Wanjari** | Team Member |

## Problem statement

Heart disease risk is usually reported as a few numbers in a table, which is hard to
interpret quickly. Doctors and students have to mentally connect "this patient's
risk score" with "which coronary artery is probably affected".

## Our solution

CardioMap 3D takes a patient's clinical information and shows the predicted risk on an
**interactive 3D heart**. Each coronary artery (LAD, LCX, RCA) is colored from green
(low risk) to red (high risk), and the app explains **why** a score was given.

1. The user enters patient data (or loads a sample patient).
2. Four machine learning models predict: overall coronary artery disease (CAD) and
   narrowing in each of the three main arteries (LAD, LCX, RCA).
3. The 3D heart updates live, and SHAP explanations show the top factors behind the score.

**Multimodal inputs:** the model combines several kinds of clinical information in one
prediction: demographics and risk factors, symptoms, ECG findings, laboratory tests and
echocardiography measurements (59 input features from the Z-Alizadeh Sani dataset). The output
is also multimodal: numbers, explanations and a 3D visualization.

## Key features

- 4 prediction targets: overall CAD, LAD, LCX and RCA
- Landing page with a live 3D heart whose arteries change color on their own
- Interactive 3D heart: rotate, zoom, X-ray (transparent) mode, auto-rotate, reset view
- Click an artery (or its card) and the camera flies to it while the other arteries fade
- Artery colors update live (about 0.3 s after any input changes)
- Blood-flow pulses and a schematic narrowing on each artery that follow its predicted risk,
  plus a pulsing warning ring on high-risk arteries
- Heartbeat animation and optional heartbeat sound that follow the patient's pulse rate (PR)
- Illustrative ECG strip that changes with ECG inputs (T inversion, ST changes, Q wave, LVH)
- Overall CAD risk gauge and a "Read aloud" voice summary of the result
- What-if explorer: see how the scores respond when blood pressure, LDL, smoking, BMI or
  blood sugar change
- Three demo patients and an automatic guided tour
- Explainable AI: top contributing factors per patient (SHAP) and global feature importance
- "Model performance" tab with metrics table, ROC curves and SHAP plots
- "Highest-risk vessel" summary and a clear clinical safety disclaimer
- Leakage-safe training (target columns removed from inputs)

## Who can use it and why

| User | Use |
|---|---|
| Medical students | Learn which risk factors drive coronary disease and how they relate to specific arteries |
| Clinicians (decision support) | Quick visual overview of a patient's risk profile |
| Patients / public education | Understand risk factors through a visual, interactive model |
| Researchers / developers | Reusable pipeline: training, explainability and a web API |

## Tech stack

### Languages

Python 3.14, JavaScript (React JSX), HTML, CSS

### Machine learning and backend

| Tool | Version | Used for |
|---|---|---|
| scikit-learn | 1.9.1 | Logistic Regression, Random Forest, preprocessing, cross-validation |
| XGBoost | 3.4.1 | Gradient boosting model (candidate) |
| SHAP | 0.53.0 | Explainability |
| pandas / NumPy / SciPy | 3.0.6 / 2.5.3 / 1.18.1 | Data handling |
| joblib | 1.6.0 | Saving and loading trained models |
| FastAPI | 0.143.0 | REST API |
| Uvicorn | 0.54.0 | API server |
| Pydantic | 2.14.0 | Request validation |
| openpyxl, matplotlib | - | Reading the Excel dataset, plots (training only) |

### Frontend

| Tool | Used for |
|---|---|
| React + Vite | Web app and build tooling |
| Three.js | 3D graphics |
| @react-three/fiber, @react-three/drei | React bindings for Three.js, orbit controls and labels |
| Web Audio API, Web Speech API, Canvas 2D | Heartbeat sound, voice summary, ECG strip (built into the browser, no extra libraries) |

The 3D heart is **procedurally generated in code** (no downloaded 3D model), so there
are no licence issues and each artery is mapped directly to a model output.

### Platforms and tools

| Platform / tool | Used for |
|---|---|
| **Vercel** | Hosting the frontend |
| **Render** (free web service) | Hosting the FastAPI backend |
| **GitHub** | Source control and automatic deployments |
| Node.js 24 and npm | Frontend build |
| Git | Version control |

### APIs

We use **our own REST API** (FastAPI). No paid third-party API or external AI service is needed.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Server status, loaded models, explanation method |
| GET | `/features` | Feature names, ranges and median values (used to build the form) |
| GET | `/metrics` | Model evaluation table |
| POST | `/predict` | Risk for CAD, LAD, LCX, RCA plus top SHAP factors |

Example request:

```json
POST /predict
{ "features": { "Age": 63, "HTN": 1, "DM": 1, "BP": 150 } }
```

Features that are not sent are filled with the training median.

## System architecture

```
 Browser (React + Three.js)                     Render (FastAPI)
 +---------------------------+  POST /predict   +----------------------------+
 | Patient form + sliders    | ---------------> | 4 trained models           |
 | 3D heart (artery colors)  |                  | (CAD, LAD, LCX, RCA)       |
 | Risk dashboard + SHAP     | <--------------- | SHAP explanations          |
 | Model performance tab     |   JSON result    | /health /features /metrics |
 +---------------------------+                  +----------------------------+
        hosted on Vercel                                hosted on Render
```

## Dataset

Z-Alizadeh Sani dataset (extended version, UCI Machine Learning Repository):
303 patients with 59 input features covering demographics, symptoms, ECG, laboratory tests
and echocardiography. The angiography outcomes (Cath, LAD, LCX, RCA) are the prediction
targets and are never used as model inputs.

## Machine learning pipeline

1. **Cleaning:** no missing values; categorical columns encoded numerically.
2. **Leakage control:** target columns (`Cath`, `LAD`, `LCX`, `RCA`) are removed from the inputs.
3. **Models compared:** Logistic Regression, Random Forest, XGBoost, for each of the 4 targets.
4. **Evaluation:** nested 5-fold stratified cross-validation (hyperparameters tuned in an
   inner 3-fold loop, scores measured on held-out outer folds) for honest estimates.
5. **Explainability:** SHAP values per prediction and global SHAP importance plots.

### Results (nested cross-validation)

| Target | Best model | ROC-AUC | Accuracy | Precision | Recall | F1 |
|---|---|---|---|---|---|---|
| CAD (overall) | Logistic Regression | 0.926 | 0.878 | 0.945 | 0.880 | 0.911 |
| LAD | Random Forest | 0.849 | 0.795 | 0.804 | 0.859 | 0.831 |
| LCX | Random Forest | 0.734 | 0.680 | 0.587 | 0.622 | 0.604 |
| RCA | Random Forest | 0.712 | 0.673 | 0.565 | 0.570 | 0.568 |

Most influential features for overall CAD: Typical Chest Pain, Age, Atypical chest pain,
Region RWMA, hypertension, T-wave inversion, diabetes and dyspnea, which is consistent
with clinical knowledge.

## 3D visualization

- The heart (ventricles, atria, aorta, pulmonary trunk, vena cava) is built from
  mathematical surfaces in Three.js.
- LAD, LCX and RCA (with their main branches) are drawn as tubes on the heart surface.
- Probability to color: green (low) to yellow (medium) to red (high).
- Clicking an artery (or its card) shows that artery's own explanation.
- Each artery shows moving flow pulses and a narrowed section whose depth follows the
  predicted risk. The location of the narrowing is illustrative only, because the dataset
  gives a risk label per vessel but no lesion position.

## Project structure

```
cardio-3d/
|-- backend/
|   |-- data.py              Loads and cleans the dataset, removes leakage columns
|   |-- eda.py               Exploratory data analysis
|   |-- train_baseline.py    Baseline models for 4 targets
|   |-- train_final.py       Tuning, nested CV, saves final models
|   |-- explain_utils.py     SHAP (and lightweight fallback) explainers
|   |-- explain_global.py    Global SHAP plots
|   |-- main.py              FastAPI app
|   |-- requirements.txt     Backend dependencies
|   `-- models/              Trained models (.joblib) and feature metadata
|-- frontend/
|   |-- index.html
|   |-- package.json
|   |-- public/              Logo and result images
|   `-- src/
|       |-- App.jsx          Pages, tabs, live prediction, auto tour
|       |-- Home.jsx         Landing page
|       |-- Heart3D.jsx      3D heart, arteries, flow, camera focus
|       |-- PatientForm.jsx  Input form and sliders
|       |-- Results.jsx      Risk gauge, dashboard and SHAP factors
|       |-- WhatIf.jsx       What-if explorer
|       |-- Performance.jsx  Model performance tab
|       |-- EcgStrip.jsx     Illustrative ECG strip
|       |-- heartbeat.js     Heartbeat sound (Web Audio)
|       |-- voice.js         Read-aloud summary (Web Speech)
|       |-- lib.js           API calls, colors, demo patients
|       `-- *.css            index, extra, home, ecg, whatif and theme styles
|-- data/dataset.xlsx        Z-Alizadeh Sani dataset
|-- docs/
|   `-- CardioMap3D_documentation.pdf   Full project documentation
|-- results/                 Metrics, ROC curves, SHAP plots
`-- README.md
```

## Prerequisites

| Tool | Version used | How to check |
|---|---|---|
| Git | any recent version | `git --version` |
| Python | 3.14 (tested) | `python --version` |
| Node.js and npm | Node 24 (tested), Node 20+ should work | `node -v` |
| Browser | a recent Chrome or Edge (sound and voice features need Web Audio / Web Speech) | |

No API keys, accounts or paid services are needed. An internet connection is needed once to
install packages (and to load the web fonts). All Python dependencies are pinned in
`backend/requirements.txt`; frontend dependencies are listed in `frontend/package.json`.

## Setup

**1. Get the code**

```bash
git clone https://github.com/yogeshx21/cardiomap-3d.git
cd cardiomap-3d
```

**2. Backend (Python)**

Windows:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```

macOS / Linux:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

**3. Frontend (Node.js)**

```bash
cd frontend
npm install
cd ..
```

## Run the project

Open **two terminals**, both in the repository root (the `cardiomap-3d` folder).

**Terminal 1: backend API** (virtual environment active)

```bash
uvicorn main:app --app-dir backend --reload
```

The API starts on http://127.0.0.1:8000 (interactive docs at http://127.0.0.1:8000/docs).
Wait for the line `Application startup complete.`

**Terminal 2: web app**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and click **Start analysis**.

## Check that it works

- http://127.0.0.1:8000/health should return `"status":"ok"` with the four models
  `CAD`, `LAD`, `LCX`, `RCA` loaded.
- In the app, press **Diabetic smoker, 66 y**: the arteries turn yellow or red, the gauge
  shows a high overall risk and the right panel lists the factors behind the score.
- Click an artery to zoom to it, open the **What-if** and **Model performance** tabs,
  or press **Auto tour** for a guided demo.

## Configuration (optional)

| Setting | Where | Meaning |
|---|---|---|
| `VITE_API_URL` | frontend (for example in `frontend/.env.local`) | Backend URL. Default: `http://127.0.0.1:8000` |
| `LITE_EXPLAIN=1` | backend environment variable | Use lightweight explanations instead of SHAP on low-memory hosts |

## Production build of the frontend

```bash
cd frontend
npm run build
```

The static site is written to `frontend/dist`.

## Training scripts (for reference)

The trained models are already included in `backend/models`, so retraining is not needed
to run the app. The scripts used to build them are in `backend/`: `data.py` (loading and
cleaning), `eda.py`, `train_baseline.py`, `train_final.py` and `explain_global.py`. They read
`data/dataset.xlsx` and need `openpyxl` and `matplotlib` in addition to the backend
requirements.

## Troubleshooting

| Problem | Fix |
|---|---|
| "The system cannot find the path specified" | Run the commands from the repository root |
| The browser says "localhost refused to connect" | The server is not running. Start both terminals and keep them open |
| The app shows "Waking up the AI server" | On the hosted demo the free backend is starting up; wait about a minute |
| Port 8000 is already in use | Start the backend with `--port 8001` and set `VITE_API_URL=http://127.0.0.1:8001` |
| No heartbeat sound or voice | Click the **Sound** or **Read aloud** button first (browsers block automatic audio) and use Chrome or Edge |

## Deployment

- **Backend:** Render web service. Build: `pip install -r backend/requirements.txt`,
  start: `uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT`.
- **Frontend:** Vercel with root directory `frontend` and environment variable
  `VITE_API_URL` pointing to the Render URL.
- Pushing to the `main` branch on GitHub redeploys both automatically.

## Limitations and safety

- The dataset is small (303 patients), so LCX and RCA predictions are weaker and should
  be treated as indicative only.
- Scores are model risk scores, not calibrated probabilities.
- Inputs the user does not provide are filled with the training median.
- The 3D artery layout is schematic (anatomically inspired), not patient-specific imaging.
- The dataset has no lesion location, so regional wall-motion abnormality (RWMA) is used
  only as an input feature.
- The ECG strip is generated from the entered ECG findings; it is not a real recording.
- What-if results show how the model responds to changed inputs. They are not medical advice
  and do not prove that a change would lower a real person's risk.
- Not validated on external hospitals; not for real clinical decisions.

## Acknowledgements

- Z-Alizadeh Sani dataset, UCI Machine Learning Repository
- Open-source libraries: scikit-learn, XGBoost, SHAP, FastAPI, React, Three.js

---

Built by **Team Visionaries** for the Multimodal AI Hackathon.
