import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Input } from '../../../../components/ui/Field'
import Button from '../../../../components/ui/Button'
import Alert from '../../../../components/ui/Alert'
import { useOrderLookup } from '../../../../api/hooks'
import { useWizard } from '../wizardState'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const LOOKUP_FAILED =
  "We couldn't find an order with those details. Check the order number and email and try again."
export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a minute and try again.'

export default function FindOrderStep() {
  const { state, dispatch } = useWizard()
  const lookup = useOrderLookup()
  const [errors, setErrors] = useState({})
  const { orderNumber, email } = state.lookup

  const set = (field) => (e) => dispatch({ type: 'SET_LOOKUP', field, value: e.target.value })

  function submit(e) {
    e.preventDefault()
    if (lookup.isPending) return
    const next = {}
    if (!orderNumber.trim()) next.orderNumber = 'Enter your order number.'
    if (!email.trim()) next.email = 'Enter the email address used for the order.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter an email address like name@example.com.'
    setErrors(next)
    if (Object.keys(next).length) return

    lookup.mutate(
      { orderNumber: orderNumber.trim().toUpperCase(), email: email.trim().toLowerCase() },
      { onSuccess: (order) => dispatch({ type: 'ORDER_FOUND', order }) },
    )
  }

  // One generic message for every failure (no hint about which field was wrong), except rate limiting.
  const failure = lookup.error && (lookup.error.status === 429 ? TOO_MANY_ATTEMPTS : LOOKUP_FAILED)

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      {failure && <Alert tone="danger">{failure}</Alert>}
      <Input
        label="Order number"
        hint="Starts with ORD, for example ORD-100245."
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={orderNumber}
        onChange={set('orderNumber')}
        error={errors.orderNumber}
        className="[&_input]:font-mono"
      />
      <Input
        label="Email address"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={set('email')}
        error={errors.email}
      />
      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" loading={lookup.isPending} className="w-full sm:w-auto">
          {lookup.isPending ? 'Finding your order…' : 'Find order'}
          {!lookup.isPending && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </div>
    </form>
  )
}
