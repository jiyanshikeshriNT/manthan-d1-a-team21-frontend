import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { useFinanceQueue } from '../../api/staff'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { ageMs } from '../../lib/format'
import FinanceDrawer from './FinanceDrawer'
import QueueTable from './QueueTable'

const SORT_VALUE = { age: (r) => ageMs(r.submittedAt), amount: (r) => r.refundPaise }

export default function ApprovalsPage() {
  const queue = useFinanceQueue()
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [sort, setSort] = useState({ key: 'age', dir: 'desc' }) // oldest first
  const [openId, setOpenId] = useState(null)

  const all = queue.data?.items
  const rows = useMemo(() => {
    const list = (all ?? []).filter((r) => !flaggedOnly || r.flagged)
    const value = SORT_VALUE[sort.key]
    return [...list].sort((a, b) => (sort.dir === 'desc' ? value(b) - value(a) : value(a) - value(b)))
  }, [all, flaggedOnly, sort])

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  const flaggedCount = (all ?? []).filter((r) => r.flagged).length

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Refund approvals</h1>
          <p className="text-muted">Refunds above ₹10,000, plus refunds that failed and need a retry. Oldest first.</p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="size-5 accent-primary" />
          Flagged only <span className="text-muted tabular">({flaggedCount})</span>
        </label>
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
          title={flaggedOnly ? 'No flagged returns waiting' : 'The queue is clear'}
          description={flaggedOnly ? 'Turn off the filter to see every return.' : 'New returns above ₹10,000 appear here after inspection.'}
          action={flaggedOnly && <Button variant="secondary" onClick={() => setFlaggedOnly(false)}>Show all</Button>}
        />
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted" aria-live="polite">{rows.length} {rows.length === 1 ? 'return' : 'returns'} waiting</p>
          <QueueTable rows={rows} sort={sort} onSort={onSort} onOpen={setOpenId} />
        </>
      )}

      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} label="Return review" variant="drawer">
        {openId && <FinanceDrawer returnId={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  )
}
