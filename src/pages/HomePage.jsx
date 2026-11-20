import { Link } from 'react-router'
import { ArrowRight, Camera, Check, LogIn, PackageOpen, ShieldCheck, Truck } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { GRADE_C_REFUND_FACTOR, RETURN_WINDOW_DAYS } from '../domain/returns'
import { cx, formatINR } from '../lib/format'

const STEPS = [
  { icon: PackageOpen, title: 'Find your order', text: 'Use the order number and email from your confirmation.' },
  { icon: Camera, title: 'Tell us what’s wrong', text: 'Pick the items, add a reason and a photo if it’s damaged.' },
  { icon: Truck, title: 'Ship it back', text: 'Print the label or show the QR code at the courier counter.' },
  { icon: ShieldCheck, title: 'Get your refund', text: 'Paid once the warehouse has checked the item.' },
]

// Sample timeline for the decorative hero card.
const PREVIEW = [
  { label: 'Requested', state: 'done' },
  { label: 'Approved', state: 'done' },
  { label: 'In transit', state: 'done' },
  { label: 'Received', state: 'current' },
  { label: 'Refunded', state: 'upcoming' },
]

// Staggered one-shot entrance using the shared motion tokens (see "Motion" in CLAUDE.md).
// prefers-reduced-motion zeroes these delays globally in index.css.
const stagger = (step) => ({ animationDelay: `${step * 80}ms` })

export default function HomePage() {
  return (
    <div className="grid gap-12">
      <section className="grid items-center gap-10 pt-2 sm:pt-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid gap-5">
          <p className="animate-fade-up text-sm font-semibold tracking-wide text-primary uppercase" style={stagger(0)}>
            Returns & refunds
          </p>
          <h1 className="max-w-2xl animate-fade-up text-3xl leading-tight font-semibold sm:text-4xl" style={stagger(1)}>
            Return an item in a few minutes
          </h1>
          <p className="max-w-xl animate-fade-up text-lg text-muted" style={stagger(2)}>
            No account needed. You’ll see straight away which items can be returned and how much you’ll get back.
          </p>
          <div className="grid animate-fade-up gap-3" style={stagger(3)}>
            <div className="flex flex-wrap gap-3">
              <Button as="link" to="/return/new" size="lg" className="group">
                Start a return
                <ArrowRight
                  className="size-5 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
              <Button as="link" to="/login" size="lg" variant="secondary" className="group" aria-describedby="staff-hint">
                <LogIn className="size-5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
                Staff sign in
              </Button>
            </div>
            <p id="staff-hint" className="text-sm text-muted">
              Staff sign in is for warehouse, finance and operations teams.
            </p>
          </div>
        </div>

        <ReturnPreview />
      </section>

      <section aria-labelledby="how" className="grid gap-4">
        <h2 id="how" className="animate-fade-up text-lg font-semibold" style={stagger(4)}>
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="grid animate-fade-up" style={stagger(5 + i)}>
              <Card
                as="div"
                className="group grid content-start gap-3 transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-pop"
              >
                <span className="flex items-center gap-3 text-sm font-semibold text-muted">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary-soft transition-transform duration-200 group-hover:scale-110">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  Step {i + 1}
                </span>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="policy"
        className="grid animate-fade-up gap-3 rounded-xl border border-line bg-surface p-5 sm:p-6"
        style={stagger(9)}
      >
        <h2 id="policy" className="text-lg font-semibold">Return policy at a glance</h2>
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>Most items: <strong className="text-ink">{RETURN_WINDOW_DAYS.STANDARD} days</strong> from delivery</li>
          <li>Electronics: <strong className="text-ink">{RETURN_WINDOW_DAYS.ELECTRONICS} days</strong> from delivery</li>
          <li>Innerwear and perishables <strong className="text-ink">can’t be returned</strong></li>
          <li>
            Damaged items (Grade C) are refunded at <strong className="text-ink">{GRADE_C_REFUND_FACTOR * 100}%</strong>
          </li>
        </ul>
        <Link to="/return-policy" className="group inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          Read the full return policy
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}

/** Decorative preview of the status timeline. Hidden from screen readers: it shows sample data. */
function ReturnPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm animate-fade-up select-none" style={stagger(3)}>
      <Card className="grid gap-4 shadow-pop">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Your return</p>
            <p className="font-mono text-base font-medium">RET-1042</p>
          </div>
          <span className="rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info">Received</span>
        </div>

        <ol className="grid gap-0">
          {PREVIEW.map((s, i) => (
            <li key={s.label} className="grid grid-cols-[1.75rem_1fr] gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={cx(
                    'grid size-7 place-items-center rounded-full border-2',
                    s.state === 'done' && 'border-success bg-success-soft text-success',
                    s.state === 'current' && 'animate-pulse-ring border-info bg-info-soft text-info',
                    s.state === 'upcoming' && 'border-line-strong bg-surface',
                  )}
                >
                  {s.state === 'done' && <Check className="size-3.5" strokeWidth={3} />}
                  {s.state === 'current' && <span className="size-2 rounded-full bg-info" />}
                </span>
                {i < PREVIEW.length - 1 && (
                  <span
                    className={cx('my-0.5 h-5 w-0.5 origin-top rounded-full', s.state === 'done' ? 'animate-grow-y bg-success' : 'bg-line')}
                    style={stagger(4 + i)}
                  />
                )}
              </span>
              <span className={cx('pt-0.5 text-sm', s.state === 'upcoming' ? 'text-muted' : 'font-semibold text-ink')}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between rounded-lg bg-secondary-soft px-4 py-3 text-sm">
          <span className="text-muted">Refund on the way</span>
          <span className="tabular font-semibold">{formatINR(349900)}</span>
        </div>
      </Card>

      <span
        className="absolute -top-3 -right-2 rotate-3 animate-pop-in rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-pop sm:-right-4"
        style={stagger(8)}
      >
        QR label ready
      </span>
    </div>
  )
}
