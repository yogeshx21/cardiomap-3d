export const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')

export async function getFeatures() {
  const r = await fetch(`${API}/features`)
  if (!r.ok) throw new Error('features failed')
  return r.json()
}

export async function predict(features, signal) {
  const r = await fetch(`${API}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }),
    signal,
  })
  if (!r.ok) throw new Error('predict failed')
  return r.json()
}

export async function getMetrics() {
  const r = await fetch(`${API}/metrics`)
  if (!r.ok) throw new Error('metrics failed')
  return r.json()
}

export function findKey(meta, name) {
  const n = norm(name)
  return Object.keys(meta).find((k) => norm(k) === n)
}

export function riskColor(p) {
  const hue = 120 - 120 * Math.min(1, Math.max(0, p))
  return `hsl(${hue}, 80%, 45%)`
}

export const PRIORITY = [
  'Age', 'Sex', 'BMI', 'BP', 'PR', 'DM', 'HTN', 'Current Smoker', 'FH',
  'Typical Chest Pain', 'Atypical', 'Nonanginal', 'Dyspnea', 'Exertional CP',
  'Function Class', 'Q Wave', 'St Elevation', 'St Depression', 'Tinversion',
  'LVH', 'Region RWMA', 'EF-TTE', 'FBS', 'LDL', 'HDL', 'TG',
]

// Demo patients (illustrative inputs only, not real people)
export const PRESETS = {
  'Healthy, 35 y': {
    Age: 35, Sex: 0, BMI: 22, BP: 110, PR: 68, DM: 0, HTN: 0, 'Current Smoker': 0, FH: 0,
    'Typical Chest Pain': 0, Atypical: 0, Dyspnea: 0, Tinversion: 0, 'Region RWMA': 0,
    'EF-TTE': 60, LDL: 90, HDL: 55, TG: 100, FBS: 85,
  },
  'Hypertensive, 58 y': {
    Age: 58, Sex: 1, BMI: 29, BP: 150, PR: 78, DM: 0, HTN: 1, 'Current Smoker': 0, FH: 0,
    'Typical Chest Pain': 1, Atypical: 0, Dyspnea: 0, Tinversion: 0, 'Region RWMA': 0,
    'EF-TTE': 55, LDL: 135, HDL: 42, TG: 170, FBS: 100,
  },
  'Diabetic smoker, 66 y': {
    Age: 66, Sex: 1, BMI: 31, BP: 160, PR: 88, DM: 1, HTN: 1, 'Current Smoker': 1, FH: 0,
    'Typical Chest Pain': 1, Dyspnea: 1, Tinversion: 1, 'Region RWMA': 2,
    'EF-TTE': 40, LDL: 160, HDL: 35, TG: 250, FBS: 180,
  },
}