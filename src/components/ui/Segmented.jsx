import { cx } from '../../lib/format'
import Kbd from './Kbd'

/**
 * Large segmented buttons built on native radios: arrow keys change the value, Tab moves to the
 * next group, and the selected option is shown by border, fill and a check mark, not colour alone.
 * @param {{ name: string, legend: string, value: string, onChange: (v: string) => void,
 *   options: { value: string, label: string, sub?: string, key?: string, disabled?: boolean, title?: string }[],
 *   error?: string, describedBy?: string }} props
 */
export default function Segmented({ name, legend, value, onChange, options, error, describedBy }) {
  return (
    <fieldset className="grid gap-1.5" aria-describedby={describedBy}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {options.map((o) => {
          const checked = value === o.value
          return (
            <label
              key={o.value}
              title={o.title}
              className={cx(
                'relative grid min-h-14 cursor-pointer content-center justify-items-center gap-0.5 rounded-lg border-2 px-2 py-2 text-center transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                checked ? 'border-primary bg-primary-soft' : error ? 'border-danger bg-surface' : 'border-line-strong bg-surface hover:bg-secondary-soft',
                o.disabled && 'cursor-not-allowed opacity-50 hover:bg-surface',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span className="text-lg leading-6 font-semibold">{o.label}</span>
              {o.sub && <span className="text-xs text-muted">{o.sub}</span>}
              {o.key && <span aria-hidden="true" className="absolute top-1 right-1 hidden lg:block"><Kbd>{o.key}</Kbd></span>}
              {checked && <span aria-hidden="true" className="absolute bottom-1 left-1.5 text-xs font-bold text-primary">✓</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
