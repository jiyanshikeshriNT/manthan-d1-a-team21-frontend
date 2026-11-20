import { useLocation, useParams } from 'react-router'
import { FileQuestion } from 'lucide-react'
import { useReturn } from '../../api/hooks'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import StatusBadge from '../../components/ui/StatusBadge'
import StatusTimeline from '../../components/StatusTimeline'
import { reasonLabel, refundMethodLabel } from '../../domain/returns'
import { formatDate, formatINR } from '../../lib/format'

export default function ReturnDetailPage() {
  const { returnId } = useParams()
  const { state } = useLocation()
  const { data, isPending, error } = useReturn(returnId)

  if (isPending) {
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner size="lg" label="Loading your return" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={error.status === 404 ? 'We couldn’t find that return' : 'We couldn’t load this return'}
        description={error.status === 404 ? 'Check the link in your confirmation email.' : 'Please try again in a moment.'}
        action={<Button as="link" to="/">Go to home</Button>}
      />
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      {state?.justCreated && (
        <Alert tone="success" title="Return requested">
          Your request is in. Bookmark this page to follow its progress, from shipping to refund.
        </Alert>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm text-muted">
            Order <span className="font-mono">{data.orderNumber}</span> · requested {formatDate(data.createdAt)}
          </p>
          <h1 className="text-2xl font-semibold">
            Return <span className="font-mono">{data.returnId}</span>
          </h1>
        </div>
        <StatusBadge status={data.status} className="px-3 py-1 text-sm" />
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <Card aria-labelledby="progress-h">
          <h2 id="progress-h" className="mb-4 font-semibold">Progress</h2>
          <StatusTimeline status={data.status} history={data.history} />
        </Card>

        <div className="grid content-start gap-6">
          <Card aria-labelledby="refund-h" className="grid gap-3">
            <h2 id="refund-h" className="font-semibold">Refund</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Method</dt><dd className="font-medium">{refundMethodLabel(data.refundMethod)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Estimated</dt><dd className="font-semibold tabular">{formatINR(data.estimatedRefundPaise)}</dd></div>
            </dl>
            <p className="text-xs text-muted">Final amount is set after inspection. Grade C items are refunded at 50%.</p>
          </Card>

          <Card aria-labelledby="items-h" className="grid gap-3">
            <h2 id="items-h" className="font-semibold">Items</h2>
            <ul className="grid gap-3 text-sm">
              {data.items.map((i) => (
                <li key={i.returnItemId} className="grid gap-0.5">
                  <span className="font-medium">{i.productName}</span>
                  <span className="text-muted">Qty {i.quantity} · {reasonLabel(i.reason)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
