import { AlertTriangle, Ban, BadgeCheck, Check, ClipboardList, Clock, SearchCheck, Truck, PackageCheck, Wallet, XCircle } from 'lucide-react'
import { STATUS, isClosedWithoutRefund } from '../domain/returnStatus'
import { buildTimeline } from '../domain/timelineModel'
import { cx, formatDateTime } from '../lib/format'

const ICON = {
  REQUESTED: ClipboardList,
  APPROVED: BadgeCheck,
  IN_TRANSIT: Truck,
  RECEIVED: PackageCheck,
  INSPECTED: SearchCheck,
  REFUNDED: Wallet,
  REJECTED: XCircle,
  CANCELLED: Ban,
}

const CIRCLE = {
  done: 'border-success bg-success-soft text-success',
  current: 'border-info bg-info-soft text-info animate-pulse-ring',
  upcoming: 'border-line-strong bg-surface text-muted',
  failed: 'border-warning bg-warning-soft text-warning',
}

/** Small glyph in the corner of the circle: state by icon, not only colour. */
function Corner({ step }) {
  const rejected = isClosedWithoutRefund(step.key)
  if (step.state === 'done') return <Glyph className="bg-success"><Check className="size-3" aria-hidden="true" /></Glyph>
  if (step.state === 'failed') {
    return (
      <Glyph className={rejected ? 'bg-danger' : 'bg-warning'}>
        {rejected ? <XCircle className="size-3" aria-hidden="true" /> : <AlertTriangle className="size-3" aria-hidden="true" />}
      </Glyph>
    )
  }
  if (step.state === 'current') return <Glyph className="bg-info"><Clock className="size-3" aria-hidden="true" /></Glyph>
  return null
}

const Glyph = ({ className, children }) => (
  <span className={cx('absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full border-2 border-surface text-white animate-pop-in', className)}>
    {children}
  </span>
)

/**
 * Return progress. Vertical on mobile, horizontal from md. An ordered list, with aria-current="step"
 * on the active step. Every state is shown as text and icon as well as colour.
 * @param {{ status: string, events?: { status: string, at: string }[] }} props
 */
export default function StatusTimeline({ status, events }) {
  const steps = buildTimeline(status, events)

  return (
    <ol aria-label="Return progress" className="grid md:auto-cols-fr md:grid-flow-col">
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const Icon = ICON[step.key]
        const rejected = isClosedWithoutRefund(step.key)
        const active = step.state === 'current' || step.state === 'failed'
        const delay = { animationDelay: `${i * 90}ms` }

        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className="grid grid-cols-[2.5rem_1fr] gap-x-4 animate-fade-up md:grid-cols-1 md:gap-y-3"
            style={delay}
          >
            <div className="flex flex-col items-center md:flex-row">
              <span
                className={cx(
                  'relative grid size-10 shrink-0 place-items-center rounded-full border-2',
                  rejected ? 'border-danger bg-danger-soft text-danger' : CIRCLE[step.state],
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <Corner step={step} />
              </span>
              {!last && (
                <span aria-hidden="true" className="relative my-1 min-h-6 w-0.5 flex-1 overflow-hidden rounded-full bg-line md:mx-2 md:my-0 md:h-0.5 md:min-h-0 md:w-auto">
                  {step.state === 'done' && (
                    <span className="absolute inset-0 origin-top bg-success animate-grow-y md:origin-left md:animate-grow-x" style={{ animationDelay: `${i * 90 + 150}ms` }} />
                  )}
                </span>
              )}
            </div>

            <div className={cx('grid content-start gap-0.5 pb-7 md:pr-3 md:pb-0', last && 'pb-0')}>
              <p className={cx('font-semibold', step.state === 'upcoming' && 'font-medium text-muted')}>{step.label}</p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                <span className={cx('font-medium', step.state === 'failed' && (rejected ? 'text-danger' : 'text-warning'), step.state === 'current' && 'text-info', step.state === 'done' && 'text-success')}>
                  {step.stateText}
                </span>
                {step.at && (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={step.at} className="tabular">{formatDateTime(step.at)}</time>
                  </>
                )}
              </p>
              {step.message && <p className="mt-1 text-[13px] leading-5 text-ink">{step.message}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
