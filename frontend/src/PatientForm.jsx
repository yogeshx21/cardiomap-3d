import { useEffect, useState } from 'react'
import { PRIORITY, PRESETS, findKey } from './lib'

const fmt = (x) => String(Math.round(x * 100) / 100); function NumField({ name, info, value, onChange, slider }) {
  const [text, setText] = useState(fmt(value))
  useEffect(() => {
    if (parseFloat(text) !== value) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const range = info.max - info.min
  return (
    <div className="field">
      <label>
        {name}
        <span className="hint">
          {fmt(info.min)}-{fmt(info.max)}
        </span>
      </label>
      <input
        type="number"
        step="any"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const v = parseFloat(e.target.value)
          if (!Number.isNaN(v)) onChange(v)
        }}
      />
      {slider && (
        <input
          type="range"
          min={info.min}
          max={info.max}
          step={range >= 20 ? 1 : range / 100}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      )}
    </div>
  )
}

function BinField({ name, value, onChange }) {
  return (
    <label className="field check">
      <input
        type="checkbox"
        checked={value >= 0.5}
        onChange={(e) => onChange(e.target.checked ? 1 : 0)}
      />
      <span>{name}</span>
    </label>
  )
}

function Field({ k, meta, values, setValue, slider }) {
  const info = meta[k]
  return info.binary ? (
    <BinField name={k} value={values[k]} onChange={(v) => setValue(k, v)} />
  ) : (
    <NumField
      name={k}
      info={info}
      value={values[k]}
      slider={slider}
      onChange={(v) => setValue(k, v)}
    />
  )
}

export default function PatientForm({ meta, values, setValue, applyPreset, reset }) {
  const priority = PRIORITY.map((n) => findKey(meta, n)).filter(Boolean)
  const rest = Object.keys(meta).filter((k) => !priority.includes(k))

  return (
    <div className="panel-inner">
      <h2>Patient data</h2>
      <div className="btn-row">
        {Object.keys(PRESETS).map((n) => (
          <button key={n} onClick={() => applyPreset(n)}>
            {n}
          </button>
        ))}
        <button className="ghost" onClick={reset}>
          Reset
        </button>
      </div>

      <h3>Key inputs</h3>
      {priority.map((k) => (
        <Field key={k} k={k} meta={meta} values={values} setValue={setValue} slider />
      ))}

      <details>
        <summary>All other features ({rest.length})</summary>
        {rest.map((k) => (
          <Field key={k} k={k} meta={meta} values={values} setValue={setValue} />
        ))}
      </details>
    </div>
  )
}