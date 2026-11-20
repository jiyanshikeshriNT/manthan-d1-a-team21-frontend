import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { Select, Textarea } from '../../../../components/ui/Field'
import Button from '../../../../components/ui/Button'
import Alert from '../../../../components/ui/Alert'
import { REASON_NEEDS_TEXT, REFUND_METHODS, RETURN_REASONS } from '../../../../domain/returns'
import { cx, formatINR } from '../../../../lib/format'
import { selectedLines, useWizard } from '../wizardState'
import PhotoPicker from '../PhotoPicker'

const noteKey = (id) => `${id}:note`

function validate(state) {
  const errors = {}
  for (const l of selectedLines(state)) {
    if (!l.reason) errors[l.orderItemId] = 'Choose a reason for this item.'
    else if (l.reason === REASON_NEEDS_TEXT && !l.reasonNote.trim()) errors[noteKey(l.orderItemId)] = 'Tell us why you’re returning this item.'
  }
  if (!state.refundMethod) errors.refundMethod = 'Choose how you’d like to be refunded.'
  return errors
}

function RefundMethodCards({ value, onChange, error }) {
  const errorId = 'refund-method-error'
  return (
    <fieldset className="grid gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1 text-base font-semibold">Refund method</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {REFUND_METHODS.map((m) => {
          const checked = value === m.value
          return (
            <label
              key={m.value}
              className={cx(
                'relative flex min-h-11 cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
                checked ? 'border-primary bg-primary-soft' : error ? 'border-danger' : 'border-line hover:border-line-strong',
              )}
            >
              <input
                type="radio"
                name="refundMethod"
                value={m.value}
                checked={checked}
                onChange={() => onChange(m.value)}
                aria-describedby={`rm-${m.value} ${error ? errorId : ''}`.trim()}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span className="grid gap-0.5">
                <span className="font-semibold">{m.label}</span>
                <span id={`rm-${m.value}`} className="text-sm text-muted">{m.description}</span>
              </span>
              {checked && <Check className="absolute top-3 right-3 size-4 text-primary" aria-hidden="true" />}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default function DetailsStep() {
  const { state, dispatch } = useWizard()
  const [submitted, setSubmitted] = useState(false)
  const lines = selectedLines(state)
  const errors = submitted ? validate(state) : {}
  const errorCount = Object.keys(errors).length

  const update = (orderItemId, patch) => dispatch({ type: 'UPDATE_ITEM', orderItemId, patch })

  function next() {
    setSubmitted(true)
    if (Object.keys(validate(state)).length === 0) dispatch({ type: 'GO_TO', step: 3 })
  }

  return (
    <div className="grid gap-6">
      {errorCount > 0 && (
        <Alert tone="danger" title={`Fix ${errorCount} ${errorCount === 1 ? 'problem' : 'problems'} to continue`} />
      )}

      <ul className="grid gap-4">
        {lines.map((l) => (
          <li key={l.orderItemId} className="grid gap-4 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{l.productName}</h2>
              <span className="text-sm text-muted tabular">
                Qty {l.quantity} · {formatINR(l.unitPricePaise * l.quantity)}
              </span>
            </div>
            <Select
              label="Reason for return"
              value={l.reason}
              onChange={(e) => update(l.orderItemId, { reason: e.target.value })}
              error={errors[l.orderItemId]}
            >
              <option value="">Choose a reason</option>
              {RETURN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
            <Textarea
              label={l.reason === REASON_NEEDS_TEXT ? 'Why are you returning it?' : 'Anything else we should know?'}
              optional={l.reason !== REASON_NEEDS_TEXT}
              maxLength={500}
              value={l.reasonNote}
              onChange={(e) => update(l.orderItemId, { reasonNote: e.target.value })}
              error={errors[noteKey(l.orderItemId)]}
              placeholder={l.reason === 'DAMAGED' ? 'For example: the stitching came apart after one wash' : undefined}
            />
            <PhotoPicker file={l.photo} itemName={l.productName} onChange={(photo) => update(l.orderItemId, { photo })} />
          </li>
        ))}
      </ul>

      <RefundMethodCards
        value={state.refundMethod}
        onChange={(value) => dispatch({ type: 'SET_REFUND_METHOD', value })}
        error={errors.refundMethod}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <Button variant="secondary" onClick={() => dispatch({ type: 'GO_TO', step: 1 })}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Button>
        <Button onClick={next}>
          Review return <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
