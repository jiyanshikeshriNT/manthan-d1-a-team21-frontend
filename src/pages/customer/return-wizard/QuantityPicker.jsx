import { Minus, Plus } from 'lucide-react'

/** Stepper-style quantity control with 44px buttons. */
export default function QuantityPicker({ value, max, onChange, label }) {
  const btn =
    'grid size-11 place-items-center rounded-lg border border-line-strong bg-surface text-secondary hover:bg-secondary-soft disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-8 text-center font-semibold tabular">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-4" aria-hidden="true" />
      </button>
      <span className="text-sm text-muted">of {max}</span>
    </div>
  )
}
