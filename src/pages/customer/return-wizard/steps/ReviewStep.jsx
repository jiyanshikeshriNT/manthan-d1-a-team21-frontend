import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Camera, Info, Send } from 'lucide-react'
import Button from '../../../../components/ui/Button'
import Alert from '../../../../components/ui/Alert'
import { useCreateReturn } from '../../../../api/hooks'
import { ineligibleInfo, reasonLabel, refundMethodLabel } from '../../../../domain/returns'
import { formatINR } from '../../../../lib/format'
import { estimatedRefundPaise, selectedLines, useWizard } from '../wizardState'

export default function ReviewStep() {
  const { state, dispatch } = useWizard()
  const navigate = useNavigate()
  const createReturn = useCreateReturn()
  const lines = selectedLines(state)
  const estimate = estimatedRefundPaise(state)

  // Ref guard blocks a second click before React re-renders the disabled button.
  const inFlight = useRef(false)
  const [error, setError] = useState(null)
  const busy = createReturn.isPending
  const hasPhotos = lines.some((l) => l.photo)

  async function submit() {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    try {
      // One multipart request: the return plus its photos. The same Idempotency-Key on a retry
      // returns the return that was already created instead of a second one.
      const created = await createReturn.mutateAsync({
        idempotencyKey: state.idempotencyKey,
        body: {
          orderNumber: state.order.orderNumber,
          refundMethod: state.refundMethod,
          items: lines.map((l) => ({
            orderLineId: Number(l.orderItemId),
            qty: l.quantity,
            reasonCode: l.reason,
            ...(l.reasonNote.trim() ? { reasonText: l.reasonNote.trim() } : {}),
          })),
        },
        photos: Object.fromEntries(lines.filter((l) => l.photo).map((l) => [l.orderItemId, [l.photo]])),
      })
      navigate(`/return/${encodeURIComponent(created.returnId)}`, { replace: true, state: { justCreated: true } })
    } catch (e) {
      inFlight.current = false
      setError(e)
    }
  }

  // 422 ITEM_NOT_RETURNABLE lists a reason per order line.
  const refusals = error?.code === 'ITEM_NOT_RETURNABLE' ? (error.data?.items ?? []) : []
  const nameOf = (orderLineId) => lines.find((l) => l.orderItemId === String(orderLineId))?.productName ?? `Item ${orderLineId}`

  return (
    <div className="grid gap-6">
      {error && (
        <Alert tone="danger" title="We couldn’t submit your return">
          {error.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : error.status === 401
              ? 'Your session has expired. Please look up your order again; your choices are kept.'
              : `${error.message} ${refusals.length ? '' : 'Your details are saved, so you can try again.'}`}
          {refusals.length > 0 && (
            <ul className="mt-2 grid list-disc gap-1 pl-5">
              {refusals.map((r) => (
                <li key={r.orderLineId}><strong className="font-semibold">{nameOf(r.orderLineId)}:</strong> {r.message || ineligibleInfo(r.code).fallback}</li>
              ))}
            </ul>
          )}
          {error.status === 401 && (
            <Button variant="secondary" className="mt-3" onClick={() => dispatch({ type: 'GO_TO', step: 0 })}>Look up order</Button>
          )}
        </Alert>
      )}

      <section aria-labelledby="review-items" className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 id="review-items" className="font-semibold">Items</h2>
          <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO', step: 1 })} disabled={busy}>Edit</Button>
        </div>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {lines.map((l) => (
            <li key={l.orderItemId} className="flex flex-wrap items-start justify-between gap-2 p-4">
              <div className="grid gap-0.5">
                <span className="font-medium">{l.productName}</span>
                <span className="text-sm text-muted">
                  Qty {l.quantity} · {reasonLabel(l.reason)}
                  {l.photo && (
                    <span className="ml-2 inline-flex items-center gap-1"><Camera className="size-3.5" aria-hidden="true" />Photo added</span>
                  )}
                </span>
              </div>
              <span className="font-semibold tabular">{formatINR(l.unitPricePaise * l.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="review-refund" className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 id="review-refund" className="font-semibold">Refund</h2>
          <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO', step: 2 })} disabled={busy}>Edit</Button>
        </div>
        <dl className="grid gap-2 rounded-xl border border-line p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Refund to</dt>
            <dd className="font-medium">{refundMethodLabel(state.refundMethod)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-base">
            <dt className="font-semibold">Estimated refund</dt>
            <dd className="font-semibold tabular" data-testid="estimate">{formatINR(estimate)}</dd>
          </div>
        </dl>
        <p className="flex gap-2 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          The final amount depends on the warehouse inspection. Items graded C (damaged or used) are refunded at 50%.
        </p>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <Button variant="secondary" onClick={() => dispatch({ type: 'GO_TO', step: 2 })} disabled={busy}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Button>
        <Button onClick={submit} loading={busy} size="lg">
          {busy ? (hasPhotos ? 'Submitting and uploading photos…' : 'Submitting…') : (
            <>Submit return <Send className="size-4" aria-hidden="true" /></>
          )}
        </Button>
      </div>
    </div>
  )
}
