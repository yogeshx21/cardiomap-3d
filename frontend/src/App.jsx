import { useEffect, useState } from 'react'
import './extra.css'
import Heart3D from './Heart3D'
import PatientForm from './PatientForm'
import Results from './Results'
import Performance from './Performance'
import { getFeatures, predict, findKey, PRESETS } from './lib'

export default function App() {
  const [meta, setMeta] = useState(null)
  const [defaults, setDefaults] = useState({})
  const [values, setValues] = useState({})
  const [preds, setPreds] = useState(null)
  const [method, setMethod] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRotate, setAutoRotate] = useState(false)
  const [xray, setXray] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [view, setView] = useState('3d')

  useEffect(() => {
    let cancelled = false
    async function load(attempt = 0) {
      try {
        const m = await getFeatures()
        if (cancelled) return
        const d = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.median]))
        setMeta(m)
        setDefaults(d)
        setValues(d)
        setError('')
      } catch {
        if (cancelled) return
        if (attempt < 15) {
          setError(`Server start ho raha hai (free hosting par ~1 min lagta hai)... try ${attempt + 1}`)
          setTimeout(() => load(attempt + 1), 6000)
        } else {
          setError('Backend se connect nahi hua. Page refresh karo.')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!meta) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await predict(values, ctrl.signal)
        setPreds(res.predictions)
        setMethod(res.explanation_method || '')
        setError('')
      } catch (e) {
        if (e.name !== 'AbortError') setError('Prediction fail hui. Backend check karo.')
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [values, meta])

  const setValue = (k, v) => setValues((prev) => ({ ...prev, [k]: v }))

  const applyPreset = (name) => {
    const next = { ...defaults }
    Object.entries(PRESETS[name]).forEach(([n, v]) => {
      const key = findKey(meta, n)
      if (key) next[key] = v
    })
    setValues(next)
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo-crop">
            <img src="/logo.jpeg" alt="Visionaries logo" />
          </div>
          <div className="brand-text">
            <b>VISIONARIES</b>
            <small>DREAM · INNOVATE · BUILD</small>
          </div>
        </div>
        <div className="title">
          <h1>CardioMap 3D</h1>
          <span>Cardiovascular risk prediction on an interactive 3D heart</span>
        </div>
      </header>
      <div className="disclaimer">
        Clinical safety notice: predictions are for decision support / educational purposes
        only and are not a substitute for formal diagnostic imaging.
      </div>

      <aside className="left">
        {meta ? (
          <PatientForm
            meta={meta}
            values={values}
            setValue={setValue}
            applyPreset={applyPreset}
            reset={() => setValues(defaults)}
          />
        ) : (
          <div className="panel-inner">{error || 'Loading...'}</div>
        )}
      </aside>

      <main className="stage">
        <div className="view-tabs">
          <button className={`tab ${view === '3d' ? 'active' : ''}`} onClick={() => setView('3d')}>
            3D view
          </button>
          <button className={`tab ${view === 'perf' ? 'active' : ''}`} onClick={() => setView('perf')}>
            Model performance
          </button>
        </div>

        {view === '3d' ? (
          <>
            <Heart3D
              preds={preds}
              selected={selected}
              onSelect={setSelected}
              autoRotate={autoRotate}
              xray={xray}
              resetSignal={resetSignal}
            />
            <div className="overlay">
              <button onClick={() => setResetSignal((n) => n + 1)}>Reset view</button>
              <button onClick={() => setAutoRotate((v) => !v)}>
                Auto-rotate: {autoRotate ? 'on' : 'off'}
              </button>
              <button onClick={() => setXray((v) => !v)}>X-ray: {xray ? 'on' : 'off'}</button>
            </div>
            <div className="legend">
              <span>Low</span>
              <div className="legend-bar" />
              <span>High risk</span>
            </div>
          </>
        ) : (
          <Performance />
        )}
      </main>

      <aside className="right">
        <Results
          preds={preds}
          selected={selected}
          onSelect={setSelected}
          loading={loading}
          error={error}
          method={method}
        />
      </aside>
    </div>
  )
}