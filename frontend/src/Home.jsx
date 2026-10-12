import { useEffect, useState } from 'react'
import Heart3D from './Heart3D'

const STATS = [
  ['0.93', 'ROC-AUC for overall CAD'],
  ['303', 'patients in the dataset'],
  ['4', 'predictions: CAD, LAD, LCX, RCA'],
  ['50+', 'clinical inputs from ECG, labs and echo'],
]

const STEPS = [
  ['1', 'Enter patient data', 'Type values or load a ready-made patient. Inputs cover vitals, symptoms, ECG, lab and echo findings.'],
  ['2', 'AI predicts four risks', 'Separate models estimate overall CAD and the narrowing risk in the LAD, LCX and RCA arteries.'],
  ['3', 'See it on the heart', 'Each coronary artery changes color live, and the dashboard explains which factors pushed the score.'],
]

const TECH = ['React', 'Three.js', 'FastAPI', 'scikit-learn', 'XGBoost', 'SHAP', 'Vercel', 'Render']

export default function Home({ onStart }) {
  const [t, setT] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setT(Date.now() / 1000), 200)
    return () => clearInterval(id)
  }, [])

  const wave = (phase) => 0.5 + 0.5 * Math.sin(t * 0.7 + phase)
  const preds = {
    LAD: { probability: wave(0) },
    LCX: { probability: wave(2.1) },
    RCA: { probability: wave(4.2) },
  }

  const scrollToHow = () =>
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="home">
      <div className="home-nav">
        <div className="brand">
          <div className="logo-crop">
            <img src="/logo.jpeg" alt="Visionaries logo" />
          </div>
          <div className="brand-text">
            <b>VISIONARIES</b>
            <small>DREAM · INNOVATE · BUILD</small>
          </div>
        </div>
        <button onClick={onStart}>Open the app</button>
      </div>

      <section className="hero">
        <div className="hero-text">
          <span className="badge">Multimodal AI Hackathon 2026 · Track A</span>
          <h1>
            See heart risk
            <br />
            on a living 3D heart
          </h1>
          <p>
            CardioMap 3D turns clinical data into an interactive heart. Four AI models estimate
            overall coronary artery disease and the risk in each major artery, and every score
            comes with a clear explanation.
          </p>
          <div className="hero-actions">
            <button className="cta" onClick={onStart}>Start analysis</button>
            <button className="ghost-btn" onClick={scrollToHow}>How it works</button>
          </div>
          <div className="legend-inline">
            <span>Low risk</span>
            <div className="legend-bar" />
            <span>High risk</span>
          </div>
          <p className="hint">Drag the heart to rotate it.</p>
        </div>

        <div className="hero-heart">
          <Heart3D
            preds={preds}
            selected={null}
            onSelect={() => {}}
            autoRotate={true}
            xray={false}
            resetSignal={0}
          />
        </div>
      </section>

      <div className="stats">
        {STATS.map(([big, small]) => (
          <div className="stat" key={small}>
            <b>{big}</b>
            <span>{small}</span>
          </div>
        ))}
      </div>

      <section className="section" id="how">
        <h2>How it works</h2>
        <p className="sub">From patient data to a clear, explainable picture in three steps.</p>
        <div className="steps">
          {STEPS.map(([n, title, text]) => (
            <div className="step" key={n}>
              <i>{n}</i>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Under the hood</h2>
        <p className="sub">Explainable machine learning, a code-built 3D heart and a live web API.</p>
        <div className="chips">
          {TECH.map((x) => (
            <span className="chip" key={x}>{x}</span>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <b>TEAM VISIONARIES</b> · Dream · Innovate · Build
        <br />
        Educational / decision-support prototype. Not a substitute for formal diagnostic imaging.
      </footer>
    </div>
  )
}