import { riskColor } from './lib'

const NAMES = {
  CAD: 'Overall CAD',
  LAD: 'LAD (Left Anterior Descending)',
  LCX: 'LCX (Left Circumflex)',
  RCA: 'RCA (Right Coronary Artery)',
}

function Card({ id, data, active, onClick }) {
  if (!data) return null
  const p = data.probability
  return (
    <div className={`card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="card-top">
        <span>{NAMES[id]}</span>
        <b>{Math.round(p * 100)}%</b>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${p * 100}%`, background: riskColor(p) }} />
      </div>
      <small className={`lvl ${data.risk_level}`}>{data.risk_level} risk</small>
    </div>
  )
}

export default function Results({ preds, selected, onSelect, loading, error, method }) {
  const target = selected || 'CAD'
  const factors = preds?.[target]?.top_factors || []
  const maxC = Math.max(0.0001, ...factors.map((f) => Math.abs(f.contribution)))

  const vessels = preds
    ? ['LAD', 'LCX', 'RCA'].filter((v) => preds[v]).map((v) => [v, preds[v].probability])
    : []
  const top = [...vessels].sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="panel-inner">
      <h2>
        Risk dashboard {loading && <span className="spin">updating...</span>}
      </h2>
      {error && <div className="error">{error}</div>}

      {preds && (
        <>
          {top && (
            <p className="summary">
              Highest-risk vessel: <b>{top[0]}</b> ({Math.round(top[1] * 100)}%)
            </p>
          )}
          <Card id="CAD" data={preds.CAD} active={!selected} onClick={() => onSelect(null)} />
          {['LAD', 'LCX', 'RCA'].map((id) => (
            <Card
              key={id}
              id={id}
              data={preds[id]}
              active={selected === id}
              onClick={() => onSelect(id)}
            />
          ))}
          <p className="note">
            Model risk score (not a calibrated probability). Click an artery in the 3D view
            or a card to inspect it.
          </p>

          <h3>Why this score? ({target})</h3>
          {method && <p className="note">Explanation method: {method}</p>}
          {factors.map((f) => (
            <div className="factor" key={f.feature}>
              <div className="factor-top">
                <span>
                  {f.feature} = {Number.isInteger(f.value) ? f.value : f.value.toFixed(1)}
                </span>
                <span className={f.direction}>
                  {f.direction === 'increases' ? '↑ risk' : '↓ risk'}
                </span>
              </div>
              <div className="bar small">
                <div
                  className={`bar-fill ${f.direction}`}
                  style={{ width: `${(Math.abs(f.contribution) / maxC) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}