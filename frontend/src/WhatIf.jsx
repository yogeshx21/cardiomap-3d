import { useEffect, useMemo, useState } from 'react'
import { findKey, predict, riskColor } from './lib'
import './whatif.css'

const ACTIONS = [
  { id: 'bp', label: 'Bring blood pressure down to 120', key: 'BP', differs: (v) => v > 120, apply: (v) => Math.min(v, 120) },
  { id: 'ldl', label: 'Lower LDL cholesterol to 100', key: 'LDL', differs: (v) => v > 100, apply: (v) => Math.min(v, 100) },
  { id: 'smoke', label: 'Stop smoking', key: 'Current Smoker', differs: (v) => v >= 0.5, apply: () => 0 },
  { id: 'bmi', label: 'Reach a BMI of 24', key: 'BMI', differs: (v) => v > 24, apply: (v) => Math.min(v, 24) },
  { id: 'fbs', label: 'Bring fasting blood sugar down to 100', key: 'FBS', differs: (v) => v > 100, apply: (v) => Math.min(v, 100) },
]

const TARGETS = [
  ['CAD', 'Overall CAD'],
  ['LAD', 'LAD'],
  ['LCX', 'LCX'],
  ['RCA', 'RCA'],
]

export default function WhatIf({ meta, values, preds }) {
  const [on, setOn] = useState({})
  const [alt, setAlt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const rows = useMemo(
    () =>
      ACTIONS.map((a) => {
        const k = meta ? findKey(meta, a.key) : null
        const cur = k ? Number(values[k]) : NaN
        return { ...a, k, cur, can: !!k && Number.isFinite(cur) && a.differs(cur) }
      }),
    [meta, values]
  )

  const ids = rows.filter((r) => on[r.id] && r.can).map((r) => r.id).join('|')

  const scenario = useMemo(() => {
    const v = { ...values }
    rows.forEach((r) => {
      if (ids.split('|').includes(r.id)) v[r.k] = r.apply(r.cur)
    })
    return v
  }, [values, rows, ids])

  useEffect(() => {
    if (!ids) {
      setAlt(null)
      return undefined
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        setBusy(true)
        const res = await predict(scenario, ctrl.signal)
        setAlt(res.predictions)
        setErr('')
      } catch (e) {
        if (e.name !== 'AbortError') setErr('Could not compute the what-if result.')
      } finally {
        setBusy(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [ids, scenario])

  return (
    <div className="perf">
      <h2>What-if explorer {busy && <span className="spin">updating...</span>}</h2>
      <p className="note">
        Pick changes to see how the model's risk scores respond for the current patient.
        This shows the model's sensitivity to its inputs. It is not medical advice and does
        not prove that a change would lower a real person's risk.
      </p>
      {err && <div className="error">{err}</div>}

      <div className="wi-grid">
        <div>
          <h3>Changes to try</h3>
          <div className="wi-opts">
            {rows.map((r) => (
              <label key={r.id} className={`wi-opt ${r.can ? '' : 'off'}`}>
                <input
                  type="checkbox"
                  disabled={!r.can}
                  checked={!!on[r.id] && r.can}
                  onChange={(e) => setOn((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                />
                <span>
                  {r.label}
                  <small>
                    {r.can
                      ? `Current value: ${Number.isInteger(r.cur) ? r.cur : r.cur.toFixed(1)}`
                      : 'Already at or below this target'}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {!ids && <p className="wi-hint">Tick one or more changes to compare.</p>}
        </div>

        <div>
          <h3>Risk now vs. with changes</h3>
          {TARGETS.map(([id, name]) => {
            const cur = preds && preds[id] ? preds[id].probability : null
            if (cur == null) return null
            const nw = alt && alt[id] ? alt[id].probability : null
            const delta = nw == null ? null : Math.round(nw * 100) - Math.round(cur * 100)
            const cls = delta == null ? '' : delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat'
            return (
              <div className="wi-row" key={id}>
                <div className="wi-head">
                  <span>{name}</span>
                  <span>
                    {Math.round(cur * 100)}%
                    {nw != null && (
                      <>
                        {' '}
                        → <b>{Math.round(nw * 100)}%</b>{' '}
                        <span className={`wi-delta ${cls}`}>
                          ({delta > 0 ? '+' : ''}
                          {delta} pts)
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="wi-lbl">Current</div>
                <div className="wi-track">
                  <div className="wi-fill" style={{ width: `${cur * 100}%`, background: riskColor(cur) }} />
                </div>
                {nw != null && (
                  <>
                    <div className="wi-lbl">With the selected changes</div>
                    <div className="wi-track">
                      <div className="wi-fill" style={{ width: `${nw * 100}%`, background: riskColor(nw) }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
