\# CardioMap 3D: Cardiovascular Risk Visualization \& Prediction



\*\*Multimodal AI Hackathon | Track A: Cardiovascular Risk Visualization and Prediction\*\*



> \*\*Clinical safety notice:\*\* CardioMap 3D is an educational / decision-support prototype.

> It is not a medical device and is not a substitute for formal diagnostic imaging

> or a clinician's judgement.



\## Live links



| What | Link |

|---|---|

| Live demo (web app) | https://cardiomap-3d.vercel.app |

| Backend API docs (Swagger) | https://cardiomap-api.onrender.com/docs |

| Source code | https://github.com/yogeshx21/cardiomap-3d |

| Demo video | https://youtube.com/YOUR-LINK |



> The backend runs on a free hosting tier and goes to sleep when idle. If the demo shows

> "Server start ho raha hai...", wait about a minute and it will load automatically.



\## Team Visionaries (Dream · Innovate · Build)



| Name | Role |

|---|---|

| \*\*Yogesh Mondhe\*\* | Team Leader |

| \*\*Khushi Wanjari\*\* | Team Member |



\## Problem statement



Heart disease risk is usually reported as a few numbers in a table, which is hard to

interpret quickly. Doctors and students have to mentally connect "this patient's

risk score" with "which coronary artery is probably affected".



\## Our solution



CardioMap 3D takes a patient's clinical information and shows the predicted risk on an

\*\*interactive 3D heart\*\*. Each coronary artery (LAD, LCX, RCA) is colored from green

(low risk) to red (high risk), and the app explains \*\*why\*\* a score was given.



1\. The user enters patient data (or loads a sample patient).

2\. Four machine learning models predict: overall coronary artery disease (CAD) and

&#x20;  narrowing in each of the three main arteries (LAD, LCX, RCA).

3\. The 3D heart updates live, and SHAP explanations show the top factors behind the score.



\*\*Multimodal inputs:\*\* the model combines several kinds of clinical information in one

prediction: demographics and risk factors, symptoms, ECG findings, laboratory tests and

echocardiography measurements (59 features from the Z-Alizadeh Sani dataset). The output

is also multimodal: numbers, explanations and a 3D visualization.



\## Key features



\- 4 prediction targets: overall CAD, LAD, LCX and RCA

\- Interactive 3D heart: rotate, zoom, click an artery, X-ray (transparent) mode, auto-rotate, reset view

\- Artery colors update live (about 0.3 s after any input changes)

\- Explainable AI: top contributing factors per patient (SHAP) and global feature importance

\- "Model performance" tab with metrics table, ROC curves and SHAP plots

\- Ready-made low-risk and high-risk sample patients for quick demos

\- "Highest-risk vessel" summary and a clear clinical safety disclaimer

\- Leakage-safe training (target columns removed from inputs)



\## Who can use it and why



| User | Use |

|---|---|

| Medical students | Learn which risk factors drive coronary disease and how they relate to specific arteries |

| Clinicians (decision support) | Quick visual overview of a patient's risk profile |

| Patients / public education | Understand risk factors through a visual, interactive model |

| Researchers / developers | Reusable pipeline: training, explainability and a web API |



\## Tech stack



\### Languages

Python 3.14, JavaScript (React JSX), HTML, CSS



\### Machine learning and backend

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

| openpyxl, matplotlib | | Reading the Excel dataset, plots (training only) |



\### Frontend

| Tool | Used for |

|---|---|

| React + Vite | Web app and build tooling |

| Three.js | 3D graphics |

| @react-three/fiber, @react-three/drei | React bindings for Three.js, orbit controls and labels |



The 3D heart is \*\*procedurally generated in code\*\* (no downloaded 3D model), so there

are no licence issues and each artery is mapped directly to a model output.



\### Platforms and tools

| Platform / tool | Used for |

|---|---|

| \*\*Vercel\*\* | Hosting the frontend |

| \*\*Render\*\* (free web service) | Hosting the FastAPI backend |

| \*\*GitHub\*\* | Source control and automatic deployments |

| Node.js 24 and npm | Frontend build |

| Git | Version control |



\### APIs

We use \*\*our own REST API\*\* (FastAPI). No paid third-party API or external AI service is needed.



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



\## System architecture



```

&#x20;Browser (React + Three.js)                     Render (FastAPI)

&#x20;┌───────────────────────────┐   POST /predict  ┌──────────────────────────┐

&#x20;│ Patient form + sliders    │ ───────────────► │ 4 trained models         │

&#x20;│ 3D heart (artery colors)  │                  │ (CAD, LAD, LCX, RCA)     │

&#x20;│ Risk dashboard + SHAP     │ ◄─────────────── │ SHAP explanations        │

&#x20;│ Model performance tab     │   JSON result    │ /health /features /metrics│

&#x20;└───────────────────────────┘                  └──────────────────────────┘

&#x20;       hosted on Vercel                                hosted on Render

```



\## Dataset



Z-Alizadeh Sani dataset (extended version, UCI Machine Learning Repository):

303 patients and 59 columns covering demographics, symptoms, ECG, laboratory tests,

echocardiography and the angiography outcome for LAD, LCX and RCA.



\## Machine learning pipeline



1\. \*\*Cleaning:\*\* no missing values; categorical columns encoded numerically.

2\. \*\*Leakage control:\*\* target columns (`Cath`, `LAD`, `LCX`, `RCA`) are removed from the inputs.

3\. \*\*Models compared:\*\* Logistic Regression, Random Forest, XGBoost, for each of the 4 targets.

4\. \*\*Evaluation:\*\* nested 5-fold stratified cross-validation (hyperparameters tuned in an

&#x20;  inner 3-fold loop, scores measured on held-out outer folds) for honest estimates.

5\. \*\*Explainability:\*\* SHAP values per prediction and global SHAP importance plots.



\### Results (nested cross-validation)



| Target | Best model | ROC-AUC | Accuracy | Precision | Recall | F1 |

|---|---|---|---|---|---|---|

| CAD (overall) | Logistic Regression | 0.926 | 0.878 | 0.945 | 0.880 | 0.911 |

| LAD | Random Forest | 0.849 | 0.795 | 0.804 | 0.859 | 0.831 |

| LCX | Random Forest | 0.734 | 0.680 | 0.587 | 0.622 | 0.604 |

| RCA | Random Forest | 0.712 | 0.673 | 0.565 | 0.570 | 0.568 |



Most influential features for overall CAD: Typical Chest Pain, Age, Atypical chest pain,

Region RWMA, hypertension, T-wave inversion, diabetes and dyspnea, which is consistent

with clinical knowledge.



\## 3D visualization



\- The heart (ventricles, atria, aorta, pulmonary trunk, vena cava) is built from

&#x20; mathematical surfaces in Three.js.

\- LAD, LCX and RCA (with their main branches) are drawn as tubes on the heart surface.

\- Probability to color: green (low) to yellow (medium) to red (high).

\- Clicking an artery (or its card) shows that artery's own explanation.



\## Project structure



```

cardio-3d/

├── backend/

│   ├── data.py              Loads and cleans the dataset, removes leakage columns

│   ├── eda.py               Exploratory data analysis

│   ├── train\_baseline.py    Baseline models for 4 targets

│   ├── train\_final.py       Tuning, nested CV, saves final models

│   ├── explain\_utils.py     SHAP (and lightweight fallback) explainers

│   ├── explain\_global.py    Global SHAP plots

│   ├── main.py              FastAPI app

│   ├── requirements.txt     Backend dependencies

│   └── models/              Trained models (.joblib) and feature metadata

├── frontend/

│   ├── index.html

│   ├── package.json

│   ├── public/              Logo and result images

│   └── src/

│       ├── App.jsx          Layout, tabs, live prediction

│       ├── Heart3D.jsx      3D heart and arteries

│       ├── PatientForm.jsx  Input form and sliders

│       ├── Results.jsx      Risk dashboard and SHAP factors

│       ├── Performance.jsx  Model performance tab

│       ├── lib.js           API calls, colors, sample patients

│       ├── index.css        Main theme

│       └── extra.css        Tabs and performance page styles

├── data/dataset.xlsx        Z-Alizadeh Sani dataset

├── results/                 Metrics, ROC curves, SHAP plots

└── README.md

```



\## Run locally



Requirements: Python 3.14 (or compatible) and Node.js 20+.



```bash

\# 1) Backend

python -m venv venv

venv\\Scripts\\activate

pip install -r backend/requirements.txt

uvicorn main:app --app-dir backend --reload



\# 2) Frontend (new terminal)

cd frontend

npm install

npm run dev

```



Open http://localhost:5173 (the API runs on http://127.0.0.1:8000).



To use another backend, set `VITE\_API\_URL` before building the frontend.



\## Deployment



\- \*\*Backend:\*\* Render web service. Build: `pip install -r backend/requirements.txt`,

&#x20; start: `uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT`.

\- \*\*Frontend:\*\* Vercel with root directory `frontend` and environment variable

&#x20; `VITE\_API\_URL` pointing to the Render URL.

\- Pushing to the `main` branch on GitHub redeploys both automatically.



\## Limitations and safety



\- The dataset is small (303 patients), so LCX and RCA predictions are weaker and should

&#x20; be treated as indicative only.

\- Scores are model risk scores, not calibrated probabilities.

\- Inputs the user does not provide are filled with the training median.

\- The 3D artery layout is schematic (anatomically inspired), not patient-specific imaging.

\- The dataset has no lesion location, so regional wall-motion abnormality (RWMA) is used

&#x20; only as an input feature.

\- Not validated on external hospitals; not for real clinical decisions.



\## Acknowledgements



\- Z-Alizadeh Sani dataset, UCI Machine Learning Repository

\- Open-source libraries: scikit-learn, XGBoost, SHAP, FastAPI, React, Three.js



\---

Built by \*\*Team Visionaries\*\* for the Multimodal AI Hackathon.

