import { useState } from 'react'
import { BookOpen, CheckCircle2, RotateCw, Scale, XCircle } from 'lucide-react'
import { useLedger } from '../../api/staff'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import { Input } from '../../components/ui/Field'
import { formatDate, formatDateTime, formatINR } from '../../lib/format'

const ACCOUNT_LABEL = {
  REFUND_EXPENSE: 'Refund expense',
  GATEWAY_CLEARING: 'Gateway clearing',
  STORE_CREDIT_LIABILITY: 'Store credit liability',
}

/** Double-entry refund ledger for a date range (Asia/Kolkata, inclusive). Defaults to the last 30 days. */
export default function LedgerPage() {
  const [draft, setDraft] = useState({ from: '', to: '' })
  const [range, setRange] = useState({ from: '', to: '' })
  const [rangeError, setRangeError] = useState('')
  const ledger = useLedger(range.from || undefined, range.to || undefined)
  const d = ledger.data

  function apply(e) {
    e.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) {
      setRangeError('The start date must be on or before the end date.')
      return
    }
    setRangeError('')
    setRange(draft)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Refund ledger</h1>
        <p className="text-muted">Every refund posts a balanced debit and credit. Entries are append-only.</p>
      </header>

      <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4 shadow-card" aria-label="Date range">
        <Input label="From" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} error={rangeError} />
        <Input label="To" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <Button type="submit" variant="secondary" disabled={ledger.isFetching}>
          <RotateCw className={ledger.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" /> Show entries
        </Button>
      </form>

      {ledger.isPending && <div className="flex items-center gap-3 py-10 text-muted"><Spinner label="" /> Loading the ledger…</div>}

      {ledger.isError && !d && (
        <Alert tone="danger" title="We couldn’t load the ledger">
          {ledger.error.message}
          <Button variant="secondary" className="mt-3" onClick={() => ledger.refetch()}>Try again</Button>
        </Alert>
      )}

      {d && (
        <>
          <section aria-label="Totals" className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1 rounded-xl border border-line bg-surface p-4 shadow-card">
              <p className="text-sm text-muted">Debits</p>
              <p className="text-2xl font-semibold tabular">{formatINR(d.totalDebitPaise)}</p>
            </div>
            <div className="grid gap-1 rounded-xl border border-line bg-surface p-4 shadow-card">
              <p className="text-sm text-muted">Credits</p>
              <p className="text-2xl font-semibold tabular">{formatINR(d.totalCreditPaise)}</p>
            </div>
            <div className="grid content-start gap-2 rounded-xl border border-line bg-surface p-4 shadow-card">
              <p className="flex items-center gap-1.5 text-sm text-muted"><Scale className="size-4" aria-hidden="true" /> {formatDate(d.from)} – {formatDate(d.to)}</p>
              {d.balanced
                ? <Badge tone="success" icon={CheckCircle2}>Balanced</Badge>
                : <Badge tone="danger" icon={XCircle}>Not balanced</Badge>}
            </div>
          </section>

          {d.entries.length === 0 ? (
            <EmptyState icon={BookOpen} title="No ledger entries in this period" description="Entries appear when refunds are paid." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card" role="region" aria-label="Ledger entries" tabIndex={0}>
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">Ledger entries, oldest first</caption>
                <thead className="border-b border-line bg-canvas text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Posted</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Refund</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Account</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Debit</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 tabular"><time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time></td>
                      <th scope="row" className="px-3 py-2.5 font-mono font-normal">#{e.refundId}</th>
                      <td className="px-3 py-2.5">{ACCOUNT_LABEL[e.account] ?? e.account}</td>
                      <td className="px-3 py-2.5 text-right tabular">{e.direction === 'DEBIT' ? formatINR(e.amountPaise) : ''}</td>
                      <td className="px-4 py-2.5 text-right tabular">{e.direction === 'CREDIT' ? formatINR(e.amountPaise) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
