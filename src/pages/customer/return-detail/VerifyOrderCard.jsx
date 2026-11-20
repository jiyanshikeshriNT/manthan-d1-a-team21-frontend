import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Alert from '../../../components/ui/Alert'
import Button from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Field'
import { useOrderLookup } from '../../../api/hooks'
import { LOOKUP_FAILED, TOO_MANY_ATTEMPTS } from '../return-wizard/steps/FindOrderStep'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Shown when the status page has no valid customer session (it lasts 2 hours, in this tab only).
 * Confirming the order number and email opens a new one; the page then loads the return.
 */
export default function VerifyOrderCard({ returnId, onVerified }) {
  const lookup = useOrderLookup()
  const [form, setForm] = useState({ orderNumber: '', email: '' })
  const [errors, setErrors] = useState({})

  function submit(e) {
    e.preventDefault()
    if (lookup.isPending) return
    const next = {}
    if (!form.orderNumber.trim()) next.orderNumber = 'Enter your order number.'
    if (!form.email.trim()) next.email = 'Enter the email address used for the order.'
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter an email address like name@example.com.'
    setErrors(next)
    if (Object.keys(next).length) return
    lookup.mutate(
      { orderNumber: form.orderNumber.trim().toUpperCase(), email: form.email.trim().toLowerCase() },
      { onSuccess: onVerified },
    )
  }

  const failure = lookup.error && (lookup.error.status === 429 ? TOO_MANY_ATTEMPTS : LOOKUP_FAILED)

  return (
    <div className="mx-auto grid max-w-md gap-6 pt-2 sm:pt-6">
      <div className="grid gap-2 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold">
          Track return <span className="font-mono">{returnId}</span>
        </h1>
        <p className="text-muted">To keep your return private, confirm the order it belongs to.</p>
      </div>
      <Card>
        <form noValidate onSubmit={submit} className="grid gap-4">
          {failure && <Alert tone="danger">{failure}</Alert>}
          <Input
            label="Order number"
            hint="Starts with ORD, for example ORD-100245."
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={form.orderNumber}
            onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
            error={errors.orderNumber}
            className="[&_input]:font-mono"
          />
          <Input
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Button type="submit" block loading={lookup.isPending}>
            {lookup.isPending ? 'Checking…' : 'View return'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
