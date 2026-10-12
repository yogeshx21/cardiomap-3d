let ctx = null

export function enableSound() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return true
}

export function disableSound() {
  if (ctx && ctx.state === 'running') ctx.suspend()
}

function thump(startAt, freq, length, volume) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, startAt)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.45, startAt + length)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + length)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + length + 0.05)
}

export function playBeat(periodSeconds = 0.8) {
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  thump(now, 125, 0.17, 0.9)
  thump(now + periodSeconds * 0.3, 105, 0.14, 0.65)
}