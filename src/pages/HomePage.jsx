import { Camera, PackageOpen, ShieldCheck, Truck } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const STEPS = [
  { icon: PackageOpen, title: 'Find your order', text: 'Use the order number and email from your confirmation.' },
  { icon: Camera, title: 'Tell us what’s wrong', text: 'Pick the items, add a reason and a photo if it’s damaged.' },
  { icon: Truck, title: 'Ship it back', text: 'Print the label or show the QR code at the courier counter.' },
  { icon: ShieldCheck, title: 'Get your refund', text: 'Paid once the warehouse has checked the item.' },
]

export default function HomePage() {
  return (
    <div className="grid gap-10">
      <section className="grid gap-5 pt-2 sm:pt-6">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Returns & refunds</p>
        <h1 className="max-w-2xl text-3xl leading-tight font-semibold sm:text-4xl">Return an item in a few minutes</h1>
        <p className="max-w-xl text-lg text-muted">
          No account needed. You’ll see straight away which items can be returned and how much you’ll get back.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button as="link" to="/return/new" size="lg">
            Start a return
          </Button>
        </div>
      </section>

      <section aria-labelledby="how" className="grid gap-4">
        <h2 id="how" className="text-lg font-semibold">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Card as="li" key={title} className="grid content-start gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-muted">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                Step {i + 1}
              </span>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted">{text}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section aria-labelledby="policy" className="grid gap-3 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="policy" className="text-lg font-semibold">Return policy at a glance</h2>
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>Most items: <strong className="text-ink">30 days</strong> from delivery</li>
          <li>Electronics: <strong className="text-ink">10 days</strong> from delivery</li>
          <li>Innerwear and perishables <strong className="text-ink">can’t be returned</strong></li>
          <li>Damaged items (Grade C) are refunded at <strong className="text-ink">50%</strong></li>
        </ul>
      </section>
    </div>
  )
}
