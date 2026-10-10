import { useEffect, useState } from 'react'
import { getMetrics } from './lib'

const f3 = (x) => (typeof x === 'number' ? x.toFixed(3) : x)

export default function Performance() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [shapT, setShapT] = useState('CAD')

  useEffect(() => {
    getMetrics()
      .then(setRows)
      .catch(() => setErr('Metrics load nahi hui (backend check karo).'))
  }, [])

  return (
    <div className="perf">
      <h2>Model performance</h2>
      <p className="note">
        Dataset: Z-Alizadeh Sani (303 patients). Evaluation: nested 5-fold stratified
        cross-validation (hyperparameters tuned in an inner 3-fold loop, scores measured
        on held-out outer folds). Target columns (Cath, LAD, LCX, RCA) are removed from
        the inputs to prevent leakage.
      </p>
      {err && <div className="error">{err}</div>}

      {rows && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Target</th><th>Model</th><th>ROC-AUC</th><th>Accuracy</th>
              <th>Precision</th><th>Recall</th><th>F1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.Target}>
                <td><b>{r.Target}</b></td>
                <td>{r.Model}</td>
                <td>{f3(r.roc_auc)}</td>
                <td>{f3(r.accuracy)}</td>
                <td>{f3(r.precision)}</td>
                <td>{f3(r.recall)}</td>
                <td>{f3(r.f1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>ROC curves (out-of-fold)</h3>
      <div className="imgbox">
        <img src="/results/roc_curves.png" alt="ROC curves" />
      </div>

      <h3>Global feature importance (SHAP)</h3>
      <div className="btn-row">
        {['CAD', 'LAD', 'LCX', 'RCA'].map((t) => (
          <button key={t} className={t === shapT ? '' : 'ghost'} onClick={() => setShapT(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="imgbox">
        <img src={`/results/shap_global_${shapT}.png`} alt={`SHAP ${shapT}`} />
      </div>

      <h3>Limitations</h3>
      <ul className="note-list">
        <li>Small dataset (303 patients); LCX and RCA predictions are weaker and should be treated as indicative.</li>
        <li>Scores are model risk scores, not calibrated probabilities.</li>
        <li>Features not entered by the user are filled with the training median.</li>
        <li>The 3D artery layout is schematic (anatomically inspired), not patient-specific imaging.</li>
        <li>RWMA is used as a clinical input only; the dataset has no lesion location.</li>
      </ul>
    </div>
  )
}