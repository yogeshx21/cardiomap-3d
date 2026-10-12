const VESSEL = {
  LAD: 'left anterior descending artery',
  LCX: 'left circumflex artery',
  RCA: 'right coronary artery',
}

const SAY = {
  DM: 'diabetes',
  HTN: 'hypertension',
  Tinversion: 'T wave inversion',
  'Region RWMA': 'regional wall motion abnormality',
  'EF-TTE': 'ejection fraction',
  FBS: 'fasting blood sugar',
  BP: 'blood pressure',
  PR: 'pulse rate',
  LDL: 'LDL cholesterol',
  HDL: 'HDL cholesterol',
  TG: 'triglycerides',
  FH: 'family history',
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function buildSummary(preds) {
  const cad = preds && preds.CAD
  if (!cad) return ''
  const pct = (x) => `${Math.round(x * 100)} percent`
  const parts = [
    `Overall coronary artery disease risk is ${cad.risk_level}, at ${pct(cad.probability)}.`,
  ]
  const vessels = ['LAD', 'LCX', 'RCA']
    .filter((v) => preds[v])
    .sort((a, b) => preds[b].probability - preds[a].probability)
  if (vessels.length) {
    const v = vessels[0]
    parts.push(`The highest risk vessel is the ${VESSEL[v]}, at ${pct(preds[v].probability)}.`)
  }
  const ups = (cad.top_factors || [])
    .filter((f) => f.direction === 'increases')
    .slice(0, 3)
    .map((f) => SAY[f.feature] || f.feature)
  if (ups.length) parts.push(`The main factors raising the score are ${ups.join(', ')}.`)
  parts.push('This is an educational tool and not a medical diagnosis.')
  return parts.join(' ')
}

export function speak(text, onEnd) {
  if (!canSpeak() || !text) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.95
  u.onend = onEnd
  u.onerror = onEnd
  window.speechSynthesis.speak(u)
  return true
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
