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
import { GradeSummary, StatusCell } from './QueueTable'

const DECISION_LABEL = (i) =>
  i.decision === 'REJECTED'
    ? 'Rejected'
    : i.acceptedQty != null && i.acceptedQty < i.quantity
      ? `Partial: ${i.acceptedQty} of ${i.quantity}`
      : 'Accepted'

function errorMessage(e) {
  if (e.code === 'INVALID_TRANSITION' || e.code === 'CONCURRENT_MODIFICATION') {
    return { title: 'This refund changed', text: `${e.message} Reload it to see the latest details before you decide.`, reload: true }
  }
  return { title: 'We couldn’t complete that', text: `${e.message} Nothing was changed. You can try again.`, reload: false }
}

/**
 * Review a refund and approve or reject it, or retry a failed one. A confirm step shows the amount
 * before anything is sent. The server makes double approvals a no-op and pays with a deterministic
 * gateway key, so a refund can never be paid twice.
 */
export default function FinanceDrawer({ refundId, onClose }) {
  const q = useFinanceReturn(refundId)
  const decide = useFinanceDecision()
  const retry = useRetryRefund()
  const [mode, setMode] = useState('review') // review | approve | reject
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [reloading, setReloading] = useState(false)
  const inFlight = useRef(false)
  const pending = decide.isPending || retry.isPending

  if (q.isPending) {
    return <div className="flex h-full items-center justify-center gap-3 p-8 text-muted"><Spinner label="" /> Loading refund…</div>
  }
  if (q.isError && !q.data) {
    return (
      <div className="grid gap-4 p-6">
        <Alert tone="danger" title="We couldn’t load this refund">{q.error.message}</Alert>
        <div className="flex gap-2"><Button onClick={() => q.refetch()}>Try again</Button><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    )
  }

  const d = q.data
  const status = result?.status ?? d.status
  const failureReason = result ? result.failureReason : d.failureReason
  const canDecide = status === 'AWAITING_APPROVAL'
  const canRetry = status === 'FAILED' || status === 'UNKNOWN'

  const callbacks = {
    onSuccess: (r) => {
      inFlight.current = false
      setResult(r)
      setMode('review')
      setError(null)
    },
    onError: (e) => {
      inFlight.current = false
      setError(e)
    },
  }

  function confirm(decision) {
    if (inFlight.current) return
    if (decision === 'REJECT' && !note.trim()) {
      setNoteError('Add a note explaining why this refund is rejected.')
      return
    }
    inFlight.current = true
    setError(null)
    decide.mutate({ refundId, decision, note: note.trim() }, callbacks)
  }

  function retryRefund() {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    retry.mutate({ refundId }, callbacks)
  }

  async function reload() {
    setReloading(true)
    await q.refetch()
    setResult(null)
    setError(null)
    setMode('review')
    setReloading(false)
  }

  const err = error && errorMessage(error)

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Return <span className="font-mono">{d.returnId}</span></h2>
          <p className="text-sm text-muted">Order <span className="font-mono">{d.orderNumber}</span> · refund #{d.refundId} · waiting {formatAge(d.submittedAt)}</p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close" className="-mr-2"><X className="size-5" aria-hidden="true" /></Button>
      </header>

      <div className="grid flex-1 content-start gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {d.flagged && <Badge tone="warning" icon={Flag}>Flagged customer</Badge>}
          <StatusCell status={status} />
          {d.attempts > 0 && <span className="text-sm text-muted tabular">{d.attempts} payment {d.attempts === 1 ? 'attempt' : 'attempts'}</span>}
        </div>
        {d.flagged && d.flagReason && <p className="-mt-2 text-sm text-warning">{d.flagReason.replace(/\.*$/, '.')} Check the history before approving.</p>}

        <ul className="grid divide-y divide-line rounded-xl border border-line" aria-label="Items">
          {d.items.map((i) => (
            <li key={i.returnItemId} className="flex items-start gap-3 p-3.5">
              <span className="grid size-14 shrink-0 place-items-center content-center rounded-lg border border-dashed border-line-strong text-center text-[11px] text-muted">
                <ImageIcon className="size-5" aria-hidden="true" />
                {i.photoCount > 0 ? <span className="tabular">{i.photoCount}</span> : <span className="sr-only">No photo</span>}
              </span>
              <div className="grid min-w-0 flex-1 gap-1">
                <p className="font-medium">{i.productName}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">Qty {i.quantity} · {DECISION_LABEL(i)} {i.grade && <GradeSummary summary={{ [i.grade]: 1 }} />}</p>
                {i.inspectionNote && <p className="text-sm text-muted">Warehouse note: “{i.inspectionNote}”</p>}
              </div>
              <span className="font-semibold tabular">{formatINR(i.refundPaise ?? 0)}</span>
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
            {err.reload && <Button variant="secondary" className="mt-3" onClick={reload} loading={reloading}>Reload refund</Button>}
          </Alert>
        )}

        {status === 'SUCCEEDED' && <Alert tone="success" title={`Refund of ${formatINR(d.refundPaise)} sent`}>The return is now marked as refunded.</Alert>}
        {(status === 'PENDING' || status === 'PROCESSING') && <Alert tone="info" title="Refund processing">The payment is in progress. This page updates when it settles.</Alert>}
        {status === 'REJECTED' && <Alert tone="info" title="Refund rejected">The return is closed as rejected, with your note in its history.</Alert>}
        {canRetry && (
          <Alert tone="warning" title={status === 'UNKNOWN' ? 'The gateway didn’t confirm this refund' : 'The refund failed'}>
            <p>
              {failureReason ? `${failureReason.replace(/\.*$/, '.')} ` : ''}
              {status === 'UNKNOWN'
                ? 'It is checked again automatically. Retrying reuses the same payment key, so the customer can’t be paid twice.'
                : 'Retrying reuses the same payment key, so the customer can’t be paid twice.'}
            </p>
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
              label="Reason (kept in the return’s history)"
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
    </div>
  )
}
