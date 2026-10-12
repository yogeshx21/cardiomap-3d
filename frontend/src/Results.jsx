import { useEffect, useRef, useState } from 'react'
import { riskColor } from './lib'

const NAMES = {
  CAD: 'Overall CAD',
  LAD: 'LAD (Left Anterior Descending)',
  LCX: 'LCX (Left Circumflex)',
  RCA: 'RCA (Right Coronary Artery)',
}

// Number that smoothly counts up/down to its new value
function useCountUp(target, ms = 800) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - t, 3)
      const cur = a + (target - a) * e
      from.current = cur
      setV(cur)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function Gauge({ data, active, onClick }) {
  const p = data ? Math.min(1, Math.max(0, data.probability)) : 0
  const shown = useCountUp(p)
  const ARC = Math.PI * 80
  const angle = -90 + p * 180
  const ease = 'cubic-bezier(.2,.9,.2,1)'

  return (
    <div className={`card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="card-top">
        <span>Overall CAD risk</span>
      </div>
      <svg viewBox="0 0 200 140" width="100%" role="img" aria-label="Overall CAD risk gauge">
        <defs>
          <linearGradient id="gaugeGrad" x1="20" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#22c55e" />
            <stop offset="0.5" stopColor="#eab308" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.01, p) * ARC} ${ARC}`}
          style={{ transition: `stroke-dasharray .8s ${ease}` }}
        />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: `transform .8s ${ease}` }}>
          <line x1="100" y1="100" x2="100" y2="38" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="#ffffff" />
        <circle cx="100" cy="100" r="3" fill="#0b1020" />
        <text x="20" y="120" fontSize="9" fill="#8a97ad" textAnchor="middle">Low</text>
        <text x="180" y="120" fontSize="9" fill="#8a97ad" textAnchor="middle">High</text>
        <text x="100" y="134" fontSize="26" fontWeight="700" fill="#ffffff" textAnchor="middle">
          {Math.round(shown * 100)}%
        </text>
      </svg>
      {data && (
        <div style={{ textAlign: 'center' }}>
          <small className={`lvl ${data.risk_level}`}>{data.risk_level} risk</small>
        </div>
      )}
    </div>
  )
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
          <Gauge data={preds.CAD} active={!selected} onClick={() => onSelect(null)} />
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
