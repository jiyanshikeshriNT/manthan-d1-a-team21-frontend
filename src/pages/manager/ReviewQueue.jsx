import { useRef, useState } from 'react'
import { Check, Flag, History, X } from 'lucide-react'
import { useReviewDecision, useReviews } from '../../api/manager'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { refundMethodLabel } from '../../domain/returns'
import { formatAge } from '../../lib/format'
import Panel from './Panel'

/** One return waiting for review, with approve and a reject that needs a reason. */
function ReviewRow({ item, onHistory }) {
  const decide = useReviewDecision()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const inFlight = useRef(false)

  function send(decision) {
    if (inFlight.current) return
    if (decision === 'REJECT' && !reason.trim()) {
      setReasonError('Add a reason. The customer sees it on their return page.')
      return
    }
    inFlight.current = true
    decide.mutate(
      { rma: item.rma, decision, reason: reason.trim() },
      { onSettled: () => (inFlight.current = false) },
    )
  }

  const error = decide.error
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-medium">{item.rma}</span>
            <Badge tone="warning" icon={Flag}>Flagged</Badge>
          </p>
          <p className="text-sm text-muted">
            Order <span className="font-mono">{item.orderNumber}</span> · {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}, {item.units} {item.units === 1 ? 'unit' : 'units'} ·{' '}
            {refundMethodLabel(item.refundMethod)} · waiting {formatAge(item.requestedAt)}
          </p>
          {item.flagReason && <p className="text-sm text-warning">{item.flagReason.replace(/\.*$/, '.')}</p>}
        </div>
        <Button variant="ghost" onClick={() => onHistory(item.returnId)} className="text-sm">
          <History className="size-4" aria-hidden="true" /> History
        </Button>
      </div>

      {error && (
        <Alert tone="danger" title={error.code === 'INVALID_TRANSITION' ? 'This return is no longer waiting for review' : 'That didn’t work'}>
          {error.message}
        </Alert>
      )}

      {!rejecting ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => send('APPROVE')} loading={decide.isPending} disabled={decide.isPending}>
            <Check className="size-4" aria-hidden="true" /> Approve
          </Button>
          <Button variant="secondary" onClick={() => setRejecting(true)} disabled={decide.isPending}>
            <X className="size-4" aria-hidden="true" /> Reject
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 rounded-xl border-2 border-danger bg-danger-soft p-4">
          <Textarea
            label={`Reason for rejecting ${item.rma}`}
            value={reason}
            maxLength={500}
            onChange={(e) => {
              setReason(e.target.value)
              setReasonError('')
            }}
            error={reasonError}
            disabled={decide.isPending}
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => send('REJECT')} loading={decide.isPending} disabled={decide.isPending}>
              {decide.isPending ? 'Rejecting…' : 'Confirm rejection'}
            </Button>
            <Button variant="secondary" onClick={() => setRejecting(false)} disabled={decide.isPending}>Back</Button>
          </div>
        </div>
      )}
    </li>
  )
}

/** Flagged customers' returns are held in PENDING_REVIEW until a manager approves or rejects them. */
export default function ReviewQueue({ onHistory }) {
  const reviews = useReviews()
  const items = reviews.data ?? []
  return (
    <Panel
      id="reviews"
      title="Returns waiting for review"
      description="From customers with more than 3 returns in 30 days. Approving issues their return label."
      isPending={reviews.isPending}
      isError={reviews.isError && !reviews.data}
      onRetry={() => reviews.refetch()}
      isEmpty={items.length === 0}
      empty={{ title: 'Nothing to review', text: 'Returns from flagged customers appear here.' }}
    >
      <ul className="grid divide-y divide-line">
        {items.map((item) => <ReviewRow key={item.rma} item={item} onHistory={onHistory} />)}
      </ul>
    </Panel>
  )
}
