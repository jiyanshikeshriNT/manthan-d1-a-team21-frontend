import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { useFinanceQueue } from '../../api/staff'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { ageMs, cx } from '../../lib/format'
import FinanceDrawer from './FinanceDrawer'
import QueueTable from './QueueTable'

const SORT_VALUE = { age: (r) => ageMs(r.submittedAt), amount: (r) => r.refundPaise }

const FILTERS = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'approval', label: 'Awaiting approval', match: (r) => r.status === 'AWAITING_APPROVAL' },
  { value: 'retry', label: 'Needs retry', match: (r) => r.status === 'FAILED' || r.status === 'UNKNOWN' },
]

export default function ApprovalsPage() {
  const queue = useFinanceQueue()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'age', dir: 'desc' }) // oldest first
  const [openId, setOpenId] = useState(null)

  const all = queue.data?.items
  const count = (f) => (all ?? []).filter(f.match).length
  const rows = useMemo(() => {
    const match = FILTERS.find((f) => f.value === filter).match
    const list = (all ?? []).filter(match)
    const value = SORT_VALUE[sort.key]
    return [...list].sort((a, b) => (sort.dir === 'desc' ? value(b) - value(a) : value(a) - value(b)))
  }, [all, filter, sort])

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Refund approvals</h1>
          <p className="text-muted">Refunds above ₹10,000, plus refunds that failed or whose outcome is unknown. Oldest first.</p>
        </div>
        <div role="group" aria-label="Show" className="inline-flex flex-wrap gap-1 rounded-lg border border-line-strong bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cx(
                'inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium',
                filter === f.value ? 'bg-secondary text-white' : 'text-muted hover:bg-secondary-soft hover:text-ink',
              )}
            >
              {f.label} <span className="tabular">({count(f)})</span>
            </button>
          ))}
        </div>
      </header>

      {queue.isPending && <div className="flex items-center gap-3 py-10 text-muted"><Spinner label="" /> Loading the queue…</div>}

      {queue.isError && !all && (
        <Alert tone="danger" title="We couldn’t load the queue">
          {queue.error.message}
          <Button variant="secondary" className="mt-3" onClick={() => queue.refetch()}>Try again</Button>
        </Alert>
      )}

      {all && rows.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={filter === 'all' ? 'The queue is clear' : 'Nothing here'}
          description={filter === 'all' ? 'Refunds above ₹10,000 appear here after inspection, and failed refunds appear for a retry.' : 'Show all refunds to see everything waiting.'}
          action={filter !== 'all' && <Button variant="secondary" onClick={() => setFilter('all')}>Show all</Button>}
        />
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted" aria-live="polite">{rows.length} {rows.length === 1 ? 'refund' : 'refunds'} waiting</p>
          <QueueTable rows={rows} sort={sort} onSort={onSort} onOpen={setOpenId} />
        </>
      )}

      <Modal open={openId != null} onClose={() => setOpenId(null)} label="Refund review" variant="drawer">
        {openId != null && <FinanceDrawer refundId={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  )
}
