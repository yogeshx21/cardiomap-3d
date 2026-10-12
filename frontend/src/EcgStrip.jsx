import { useEffect, useRef } from 'react'
import { findKey } from './lib'
import './ecg.css'

const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2))
const sig = (x) => 1 / (1 + Math.exp(-x))

// One heartbeat of an illustrative ECG (phase 0..1)
function ecg(p, f) {
  const r = f.lvh ? 1.35 : 1
  const q = f.qwave ? -0.32 : -0.1
  let y = 0.12 * g(p, 0.13, 0.03) // P wave
  y += q * g(p, 0.195, 0.011) // Q
  y += r * g(p, 0.22, 0.012) // R
  y += -0.22 * g(p, 0.245, 0.012) // S
  const st = f.stDep ? -0.22 : f.stElev ? 0.22 : 0
  y += st * (sig((p - 0.26) * 90) - sig((p - 0.4) * 90)) // ST segment
  y += (f.tInv ? -0.32 : 0.3) * g(p, 0.45, 0.055) // T wave
  return y
}

export default function EcgStrip({ meta, values, bpm }) {
  const canvasRef = useRef(null)
  const flagsRef = useRef({})
  const bpmRef = useRef(bpm)

  const on = (name) => {
    const k = meta ? findKey(meta, name) : null
    return k ? Number(values[k]) >= 0.5 : false
  }
  const flags = {
    tInv: on('Tinversion'),
    stDep: on('St Depression'),
    stElev: on('St Elevation'),
    qwave: on('Q Wave'),
    lvh: on('LVH'),
  }

  useEffect(() => {
    flagsRef.current = flags
    bpmRef.current = bpm
  })

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return undefined
    const ctx = c.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.max(1, Math.round(c.clientWidth * dpr))
    c.height = Math.max(1, Math.round(c.clientHeight * dpr))
    const span = 3 // seconds shown on screen
    let raf = 0

    const draw = (now) => {
      const t = now / 1000
      const w = c.width
      const h = c.height
      ctx.clearRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= 12; i++) {
        const x = (w / 12) * i
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      for (let j = 0; j <= 4; j++) {
        const y = (h / 4) * j
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()

      ctx.beginPath()
      for (let i = 0; i <= w; i += 2) {
        const tt = t - (1 - i / w) * span
        const p = (((tt * bpmRef.current) / 60) % 1 + 1) % 1
        const y = h * 0.66 - ecg(p, flagsRef.current) * h * 0.5
        if (i === 0) ctx.moveTo(i, y)
        else ctx.lineTo(i, y)
      }
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.6 * dpr
      ctx.lineJoin = 'round'
      ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  const tags = []
  if (flags.tInv) tags.push('T inverted')
  if (flags.stDep) tags.push('ST depression')
  if (flags.stElev) tags.push('ST elevation')
  if (flags.qwave) tags.push('Q wave')
  if (flags.lvh) tags.push('LVH')

  return (
    <div className="ecg">
      <div className="ecg-top">
        <span>ECG (illustrative, from inputs)</span>
        <b>{tags.length ? tags.join(' · ') : 'Normal pattern'}</b>
      </div>
      <canvas ref={canvasRef} />
    </div>
  )
}