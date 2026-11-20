import { Check, X } from 'lucide-react'
import { STATUS, STATUS_LABEL, TIMELINE } from '../domain/returnStatus'
import { cx, formatDateTime } from '../lib/format'

/**
 * Vertical status timeline. Each step shows a text state ("Done", "Current") as well as colour.
 * @param {{ status: string, history?: { status: string, at: string }[] }} props
 */
export default function StatusTimeline({ status, history = [] }) {
  const at = Object.fromEntries(history.map((h) => [h.status, h.at]))
  const rejected = status === STATUS.REJECTED
  const steps = rejected ? [...TIMELINE.filter((s) => at[s]), STATUS.REJECTED] : TIMELINE
  const idx = steps.indexOf(status)

  return (
    <ol className="grid">
      {steps.map((s, i) => {
        const done = i < idx || (i === idx && s === STATUS.REFUNDED)
        const current = i === idx && !done
        const isRejected = s === STATUS.REJECTED
        const last = i === steps.length - 1
        return (
          <li key={s} className="grid grid-cols-[2rem_1fr] gap-3" aria-current={current ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cx(
                  'grid size-8 place-items-center rounded-full border-2',
                  isRejected && 'border-danger bg-danger text-white',
                  !isRejected && done && 'border-success bg-success text-white',
                  !isRejected && current && 'border-info bg-info-soft',
                  !isRejected && !done && !current && 'border-line-strong bg-surface',
                )}
              >
                {isRejected ? <X className="size-4" aria-hidden="true" /> : done ? <Check className="size-4" aria-hidden="true" /> : current ? <span className="size-2.5 rounded-full bg-info" /> : null}
              </span>
              {!last && <span aria-hidden="true" className={cx('w-0.5 flex-1 min-h-6', done ? 'bg-success' : 'bg-line')} />}
            </div>
            <div className={cx('pb-6', last && 'pb-0')}>
              <p className={cx('font-medium', !done && !current && !isRejected && 'text-muted')}>
                {STATUS_LABEL[s]}
                <span className="sr-only">
                  {isRejected ? ', return rejected' : done ? ', done' : current ? ', current step' : ', not started'}
                </span>
              </p>
              <p className="text-sm text-muted tabular">
                {at[s] ? formatDateTime(at[s]) : current ? 'In progress' : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
