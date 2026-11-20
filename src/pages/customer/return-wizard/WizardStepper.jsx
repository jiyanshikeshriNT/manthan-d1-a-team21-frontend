import { Check } from 'lucide-react'
import { cx } from '../../../lib/format'

/** Visible progress + aria-current="step" + polite live announcement of the current step. */
export default function WizardStepper({ steps, current }) {
  return (
    <nav aria-label="Return progress">
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        Step {current + 1} of {steps.length}: {steps[current].title}
      </p>
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s.title} aria-current={active ? 'step' : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                className={cx(
                  'grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold tabular',
                  done && 'border-primary bg-primary text-white',
                  active && 'border-primary bg-primary-soft text-primary',
                  !done && !active && 'border-line-strong bg-surface text-muted',
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                <span className="sr-only">{done ? ' (completed)' : ''}</span>
              </span>
              <span className={cx('hidden text-sm lg:inline', active ? 'font-semibold text-ink' : 'text-muted')}>{s.title}</span>
              {i < steps.length - 1 && (
                <span aria-hidden="true" className={cx('h-0.5 flex-1 rounded-full', done ? 'bg-primary' : 'bg-line')} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
