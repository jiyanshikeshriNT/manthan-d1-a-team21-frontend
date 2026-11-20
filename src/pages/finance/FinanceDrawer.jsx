import { useRef, useState } from 'react'
import { Flag, ImageIcon, RotateCw, X } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { Textarea } from '../../components/ui/Field'
import { useFinanceDecision, useFinanceReturn, useRetryRefund } from '../../api/staff'
import { refundMethodLabel } from '../../domain/returns'
import { formatAge, formatINR } from '../../lib/format'
import PhotoLightbox from '../warehouse/PhotoLightbox'
import { GradeSummary, StatusCell } from './QueueTable'

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `fin-${Date.now()}-${Math.random().toString(16).slice(2)}`

const DECISION_LABEL = (i) =>
  i.decision === 'REJECT' ? 'Rejected' : i.decision === 'PARTIAL' ? `Partial: ${i.acceptedQty} of ${i.quantity}` : 'Accepted'

function errorMessage(e) {
  if (e.code === 'SEPARATION_OF_DUTIES') {
    return { title: 'You can’t decide on this return', text: 'To keep refunds independent, the person who inspected or previously handled a return can’t approve it. Ask another finance reviewer to take it.', reload: false }
  }
  if (e.code === 'STALE_VERSION' || e.code === 'ILLEGAL_TRANSITION') {
    return { title: 'This return changed', text: 'It was updated by someone else, or it has already been decided. Reload it to see the latest details before you decide.', reload: true }
  }
  return { title: 'We couldn’t complete that', text: `${e.message} Nothing was changed. You can try again.`, reload: false }
}

/** Review a return and approve or reject it. A confirm step shows the amount before anything is sent. */
export default function FinanceDrawer({ returnId, onClose }) {
  const q = useFinanceReturn(returnId)
  const decide = useFinanceDecision()
  const retry = useRetryRefund()
  const [mode, setMode] = useState('review') // review | approve | reject
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [reloading, setReloading] = useState(false)
  const attemptKey = useRef(newKey()) // one Idempotency-Key per confirmed attempt
  const inFlight = useRef(false)
  const pending = decide.isPending || retry.isPending

  if (q.isPending) {
    return <div className="flex h-full items-center justify-center gap-3 p-8 text-muted"><Spinner label="" /> Loading return…</div>
  }
  if (q.isError && !q.data) {
    return (
      <div className="grid gap-4 p-6">
        <Alert tone="danger" title="We couldn’t load this return">{q.error.message}</Alert>
        <div className="flex gap-2"><Button onClick={() => q.refetch()}>Try again</Button><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    )
  }

  const d = q.data
  const status = result?.status ?? d.status
  const failureReason = result ? result.failureReason : d.failureReason
  const canDecide = status === 'PENDING_FINANCE'

  function finish(fn) {
    return {
      onSuccess: (r) => {
        inFlight.current = false
        setResult(r)
        setMode('review')
        setError(null)
        fn?.(r)
      },
      onError: (e) => {
        inFlight.current = false
        setError(e)
      },
    }
  }

  function confirm(decision) {
    if (inFlight.current) return
    if (decision === 'REJECT' && !note.trim()) {
      setNoteError('Add a note explaining why this refund is rejected.')
      return
    }
    inFlight.current = true
    setError(null)
    decide.mutate({ returnId, version: d.version, decision, note: note.trim(), idempotencyKey: attemptKey.current }, finish())
  }

  function retryRefund() {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    retry.mutate({ returnId, idempotencyKey: newKey() }, finish())
  }

  async function reload() {
    setReloading(true)
    await q.refetch()
    setResult(null)
    setError(null)
    setMode('review')
    attemptKey.current = newKey()
    setReloading(false)
  }

  const err = error && errorMessage(error)

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Return <span className="font-mono">{d.returnId}</span></h2>
          <p className="text-sm text-muted">Order <span className="font-mono">{d.orderNumber}</span> · waiting {formatAge(d.submittedAt)}</p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close" className="-mr-2"><X className="size-5" aria-hidden="true" /></Button>
      </header>

      <div className="grid flex-1 content-start gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{d.customerName}</span>
          {d.flagged && <Badge tone="warning" icon={Flag}>Flagged</Badge>}
          <StatusCell status={status === 'REFUNDED' || status === 'REJECTED' ? 'PENDING_FINANCE' : status} />
        </div>
        {d.flagged && d.flagReason && <p className="-mt-2 text-sm text-warning">{d.flagReason}. Check the history before approving.</p>}

        <ul className="grid divide-y divide-line rounded-xl border border-line" aria-label="Items">
          {d.items.map((i) => (
            <li key={i.returnItemId} className="flex items-start gap-3 p-3.5">
              {i.photoUrl ? (
                <button type="button" onClick={() => setPhoto({ url: i.photoUrl, title: i.productName })} aria-label={`View customer photo of ${i.productName}`} className="size-14 shrink-0 overflow-hidden rounded-lg border border-line">
                  <img src={i.photoUrl} alt="" className="size-full object-cover" />
                </button>
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-line-strong text-muted"><ImageIcon className="size-5" aria-hidden="true" /><span className="sr-only">No photo</span></span>
              )}
              <div className="grid min-w-0 flex-1 gap-1">
                <p className="font-medium">{i.productName}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">Qty {i.quantity} · {DECISION_LABEL(i)} {i.grade && <GradeSummary summary={{ [i.grade]: 1 }} />}</p>
              </div>
              <span className="font-semibold tabular">{formatINR(i.refundPaise)}</span>
            </li>
          ))}
        </ul>

        <dl className="grid gap-1.5 rounded-xl bg-canvas p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Refund to</dt><dd className="font-medium">{refundMethodLabel(d.refundMethod)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-semibold">Refund total</dt><dd className="font-semibold tabular" data-testid="drawer-total">{formatINR(d.refundPaise)}</dd></div>
        </dl>

        {err && (
          <Alert tone="danger" title={err.title}>
            <p>{err.text}</p>
            {err.reload && <Button variant="secondary" className="mt-3" onClick={reload} loading={reloading}>Reload return</Button>}
          </Alert>
        )}

        {status === 'REFUNDED' && <Alert tone="success" title={`Refund of ${formatINR(d.refundPaise)} sent`}>The customer has been notified.</Alert>}
        {status === 'REJECTED' && <Alert tone="info" title="Return rejected">The customer has been told, with your note.</Alert>}
        {status === 'REFUND_FAILED' && (
          <Alert tone="warning" title="The refund failed">
            <p>{(failureReason || 'The payment gateway did not complete the refund').replace(/\.*$/, '.')} Nothing was paid, so it is safe to retry.</p>
            <Button className="mt-3" onClick={retryRefund} loading={retry.isPending} disabled={pending}>
              <RotateCw className="size-4" aria-hidden="true" /> {retry.isPending ? 'Retrying…' : 'Retry refund'}
            </Button>
          </Alert>
        )}

        {canDecide && mode === 'review' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={() => setMode('approve')} disabled={pending}>Approve</Button>
            <Button size="lg" variant="danger" className="flex-1" onClick={() => setMode('reject')} disabled={pending}>Reject</Button>
          </div>
        )}

        {canDecide && mode === 'approve' && (
          <section aria-label="Confirm approval" className="grid gap-3 rounded-xl border-2 border-primary bg-primary-soft p-4 animate-pop-in">
            <p className="font-semibold">Approve a refund of {formatINR(d.refundPaise)}?</p>
            <p className="text-sm text-muted">It is sent to {refundMethodLabel(d.refundMethod).toLowerCase()} straight away and can’t be undone here.</p>
            <div className="flex gap-3">
              <Button onClick={() => confirm('APPROVE')} loading={decide.isPending} disabled={pending}>{decide.isPending ? 'Approving…' : `Confirm and pay ${formatINR(d.refundPaise)}`}</Button>
              <Button variant="secondary" onClick={() => setMode('review')} disabled={pending}>Back</Button>
            </div>
          </section>
        )}

        {canDecide && mode === 'reject' && (
          <section aria-label="Confirm rejection" className="grid gap-3 rounded-xl border-2 border-danger bg-danger-soft p-4 animate-pop-in">
            <p className="font-semibold">Reject the {formatINR(d.refundPaise)} refund?</p>
            <Textarea
              label="Note for the customer record"
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteError('') }}
              error={noteError}
              disabled={pending}
              maxLength={500}
            />
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => confirm('REJECT')} loading={decide.isPending} disabled={pending}>{decide.isPending ? 'Rejecting…' : 'Confirm rejection'}</Button>
              <Button variant="secondary" onClick={() => setMode('review')} disabled={pending}>Back</Button>
            </div>
          </section>
        )}
      </div>

      <PhotoLightbox photo={photo} onClose={() => setPhoto(null)} />
    </div>
  )
}
