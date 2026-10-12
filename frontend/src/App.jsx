import { useEffect, useRef, useState } from 'react'
import './extra.css'
import './home.css'
import Heart3D from './Heart3D'
import PatientForm from './PatientForm'
import Results from './Results'
import Performance from './Performance'
import WhatIf from './WhatIf'
import Home from './Home'
import EcgStrip from './EcgStrip'
import { enableSound, disableSound } from './heartbeat'
import { buildSummary, speak, stopSpeaking, canSpeak } from './voice'
import { getFeatures, predict, findKey, PRESETS } from './lib'

const PRESET_NAMES = Object.keys(PRESETS)
const TOUR_STEPS = PRESET_NAMES.length * 2

function WakeOverlay({ text, failed }) {
  return (
    <div className={`wake ${failed ? 'fail' : ''}`}>
      <svg className="wake-heart" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <h2>{failed ? 'Could not reach the server' : 'Waking up the AI server'}</h2>
      <p>{text}</p>
      {failed && <button onClick={() => window.location.reload()}>Try again</button>}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('home')
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
  const [soundOn, setSoundOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [tour, setTour] = useState(null)
  const predsRef = useRef(null)

  useEffect(() => {
    predsRef.current = preds
  }, [preds])

  useEffect(() => () => stopSpeaking(), [])

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
          setError(`The free server was asleep and is starting now. This takes about a minute. Attempt ${attempt + 1}...`)
          setTimeout(() => load(attempt + 1), 6000)
        } else {
          setError('Backend se connect nahi hua. Please refresh the page.')
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

  // ---------- Auto tour ----------
  useEffect(() => {
    if (tour === null || !meta) return
    const i = Math.floor(tour / 2)
    if (tour % 2 === 0) {
      applyPreset(PRESET_NAMES[i])
      setSelected(null)
    } else {
      const p = predsRef.current
      if (p) {
        const top = ['LAD', 'LCX', 'RCA']
          .filter((v) => p[v])
          .sort((a, b) => p[b].probability - p[a].probability)[0]
        setSelected(top || null)
      }
    }
    const timer = setTimeout(() => {
      if (tour + 1 >= TOUR_STEPS) {
        setTour(null)
        setSelected(null)
        setAutoRotate(false)
      } else {
        setTour(tour + 1)
      }
    }, tour % 2 === 0 ? 7000 : 5000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour])

  const startTour = () => {
    setView('3d')
    setAutoRotate(true)
    setTour(0)
  }
  const stopTour = () => {
    setTour(null)
    setSelected(null)
    setAutoRotate(false)
  }

  let caption = ''
  if (tour !== null) {
    const i = Math.floor(tour / 2)
    caption =
      tour % 2 === 0
        ? `Demo patient ${i + 1} of ${PRESET_NAMES.length}: ${PRESET_NAMES[i]}`
        : `Highest-risk artery: ${selected || '...'}. The panel on the right explains why.`
  }

  const toggleSound = () => {
    if (soundOn) {
      disableSound()
      setSoundOn(false)
    } else {
      enableSound()
      setSoundOn(true)
    }
  }

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const ok = speak(buildSummary(preds), () => setSpeaking(false))
    setSpeaking(ok)
  }

  // heart rate follows the Pulse Rate (PR) input
  const prKey = meta ? findKey(meta, 'PR') : null
  const rawPr = prKey ? Number(values[prKey]) : 72
  const bpm = Math.min(150, Math.max(40, Number.isFinite(rawPr) ? rawPr : 72))

  if (page === 'home') {
    return <Home onStart={() => setPage('app')} />
  }

  return (
    <div className="app">
      {!meta && (
        <WakeOverlay
          text={error || 'Connecting to the server...'}
          failed={error.includes('nahi hua')}
        />
      )}

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
        <button className="home-btn" onClick={() => setPage('home')}>Home</button>
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
          <div className="panel-inner">Loading...</div>
        )}
      </aside>

      <main className="stage">
        <div className="view-tabs">
          <button className={`tab ${view === '3d' ? 'active' : ''}`} onClick={() => setView('3d')}>
            3D view
          </button>
          <button className={`tab ${view === 'whatif' ? 'active' : ''}`} onClick={() => setView('whatif')}>
            What-if
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
              bpm={bpm}
              soundOn={soundOn}
            />
            <div className="overlay">
              <button onClick={() => setResetSignal((n) => n + 1)}>Reset view</button>
              <button onClick={() => setAutoRotate((v) => !v)}>
                Auto-rotate: {autoRotate ? 'on' : 'off'}
              </button>
              <button onClick={() => setXray((v) => !v)}>X-ray: {xray ? 'on' : 'off'}</button>
              <button onClick={toggleSound}>Sound: {soundOn ? 'on' : 'off'}</button>
              {tour === null ? (
                <button onClick={startTour} disabled={!meta}>Auto tour</button>
              ) : (
                <button onClick={stopTour}>Stop tour</button>
              )}
              {canSpeak() && (
                <button onClick={toggleSpeak} disabled={!preds}>
                  {speaking ? 'Stop voice' : 'Read aloud'}
                </button>
              )}
            </div>
            <div className="legend">
              <span>Low</span>
              <div className="legend-bar" />
              <span>High risk</span>
            </div>
            <div className="bpm">♥ {Math.round(bpm)} bpm</div>
            <EcgStrip meta={meta} values={values} bpm={bpm} />
            {tour !== null && <div className="tour-cap">{caption}</div>}
          </>
        ) : view === 'whatif' ? (
          <WhatIf meta={meta} values={values} preds={preds} />
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
