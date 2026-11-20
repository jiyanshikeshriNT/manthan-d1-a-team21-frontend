import { useLocation, useParams } from 'react-router'
import { FileQuestion, RefreshCw } from 'lucide-react'
import { POLL_MS, useReturn } from '../../api/hooks'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import StatusBadge from '../../components/ui/StatusBadge'
import StatusTimeline from '../../components/StatusTimeline'
import { isFinal } from '../../domain/returnStatus'
import { refundMethodLabel } from '../../domain/returns'
import { buildTimeline } from '../../domain/timelineModel'
import { formatDate, formatTime } from '../../lib/format'
import LabelCard from './return-detail/LabelCard'
import ItemsTable from './return-detail/ItemsTable'
import StatusMessage from './return-detail/StatusMessage'
import ReturnActions from './return-detail/ReturnActions'
import VerifyOrderCard from './return-detail/VerifyOrderCard'

export default function ReturnDetailPage() {
  const { returnId } = useParams()
  const { state } = useLocation()
  const ret = useReturn(returnId)
  const { data } = ret

  if (ret.isPending) {
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner size="lg" label="Loading your return" />
      </div>
    )
  }

  // The status page needs the order-scoped session (2 hours). Without it, confirm the order again.
  if (ret.isError && ret.error.status === 401) {
    return <VerifyOrderCard returnId={returnId} onVerified={() => ret.refetch()} />
  }

  if (ret.isError && !data) {
    const notFound = ret.error.status === 404
    return (
      <EmptyState
        icon={FileQuestion}
        title={notFound ? 'We couldn’t find that return' : 'We couldn’t load this return'}
        description={notFound ? 'Check the return number. It belongs to the order you looked up.' : 'Please try again in a moment.'}
        action={notFound ? <Button as="link" to="/">Go to home</Button> : <Button onClick={() => ret.refetch()}>Try again</Button>}
      />
    )
  }

  const active = buildTimeline(data.status, data.events).find((s) => s.message && s.state !== 'upcoming')
  const final = isFinal(data.status)

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      {/* Screen readers hear status changes that arrive through polling. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{active?.message}</p>

      {state?.justCreated && (
        <Alert tone="success" title="Return requested" className="animate-fade-up">
          Your request is in. Bookmark this page to follow its progress, from shipping to refund.
        </Alert>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div className="grid gap-1.5">
          <p className="text-sm text-muted">
            Order <span className="font-mono">{data.orderNumber}</span> · requested {formatDate(data.createdAt)}
          </p>
          <h1 className="text-2xl font-semibold">
            Return <span className="font-mono">{data.returnId}</span>
          </h1>
          <p className="text-sm text-muted">
            Refund to <strong className="font-semibold text-ink">{refundMethodLabel(data.refundMethod)}</strong>
          </p>
        </div>
        <div key={data.status} className="animate-pop-in">
          <StatusBadge status={data.status} className="px-3 py-1.5 text-sm" />
        </div>
      </header>

      <StatusMessage data={data} />

      <Card aria-labelledby="progress-h" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h2 id="progress-h" className="mb-5 font-semibold">Progress</h2>
        <StatusTimeline status={data.status} events={data.events} />
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_19rem]">
        <ItemsTable items={data.items} estimatedRefundPaise={data.estimatedRefundPaise} status={data.status} />
        <div className="grid gap-6">
          <LabelCard returnId={data.returnId} status={data.status} />
          <ReturnActions ret={data} />
        </div>
      </div>

      {!final && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <RefreshCw className={ret.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden="true" />
          Updates automatically every {POLL_MS / 1000} seconds · last checked {formatTime(ret.dataUpdatedAt)}
        </p>
      )}
    </div>
  )
}
