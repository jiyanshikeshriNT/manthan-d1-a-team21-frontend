import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronsUpDown, Clock, HelpCircle, Loader, XCircle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { refundMethodLabel } from '../../domain/returns'
import { formatAge, formatINR } from '../../lib/format'

const GRADE_TONE = { A: 'success', B: 'neutral', C: 'warning' }

export function GradeSummary({ summary }) {
  const entries = Object.entries(summary ?? {}).filter(([, n]) => n > 0)
  if (!entries.length) return <span className="text-muted">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map(([g, n]) => (
        <Badge key={g} tone={GRADE_TONE[g]}>Grade {g} × {n}</Badge>
      ))}
    </span>
  )
}

/** Refund status (backend RefundStatus) as icon + text. */
const REFUND_STATUS = {
  AWAITING_APPROVAL: { tone: 'info', icon: Clock, text: 'Awaiting approval' },
  PENDING: { tone: 'info', icon: Loader, text: 'Processing' },
  PROCESSING: { tone: 'info', icon: Loader, text: 'Processing' },
  UNKNOWN: { tone: 'warning', icon: HelpCircle, text: 'Outcome unknown' },
  FAILED: { tone: 'warning', icon: AlertTriangle, text: 'Refund failed' },
  SUCCEEDED: { tone: 'success', icon: CheckCircle2, text: 'Paid' },
  REJECTED: { tone: 'danger', icon: XCircle, text: 'Rejected' },
}

export const StatusCell = ({ status }) => {
  const s = REFUND_STATUS[status] ?? { tone: 'neutral', icon: Clock, text: status }
  return <Badge tone={s.tone} icon={s.icon}>{s.text}</Badge>
}

function SortHeader({ label, k, sort, onSort, align }) {
  const active = sort.key === k
  const Icon = !active ? ChevronsUpDown : sort.dir === 'desc' ? ArrowDown : ArrowUp
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'} className={`px-3 py-2.5 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex min-h-11 items-center gap-1 rounded-md px-1 uppercase hover:text-ink ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  )
}

/**
 * @param {{ rows: import('../../api/staff').QueueRow[], sort: {key: string, dir: string}, onSort: (k: string) => void, onOpen: (refundId: number) => void }} props
 */
export default function QueueTable({ rows, sort, onSort, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card" role="region" aria-label="Refund queue" tabIndex={0}>
      <table className="w-full min-w-[42rem] text-left text-sm">
        <caption className="sr-only">Refunds waiting for a finance decision or a retry</caption>
        <thead className="border-b border-line bg-canvas text-xs tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold uppercase">Return</th>
            <th scope="col" className="px-3 py-2.5 font-semibold uppercase">Refund to</th>
            <th scope="col" className="px-3 py-2.5 font-semibold uppercase">Status</th>
            <SortHeader label="Amount" k="amount" sort={sort} onSort={onSort} align="right" />
            <SortHeader label="Age" k="age" sort={sort} onSort={onSort} align="right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.refundId} className="hover:bg-canvas">
              <th scope="row" className="px-4 py-2 font-normal">
                <button
                  type="button"
                  onClick={() => onOpen(r.refundId)}
                  className="grid min-h-11 content-center rounded-md text-left underline-offset-2 hover:underline"
                >
                  {/* Visible text is part of the name (WCAG 2.5.3), so voice users can say what they see. */}
                  <span className="font-mono font-medium text-accent"><span className="sr-only">Review return </span>{r.returnId}</span>
                  <span className="text-xs text-muted">Refund #{r.refundId}{r.attempts > 0 && ` · ${r.attempts} ${r.attempts === 1 ? 'attempt' : 'attempts'}`}</span>
                </button>
              </th>
              <td className="px-3 py-2">{refundMethodLabel(r.refundMethod)}</td>
              <td className="px-3 py-2"><StatusCell status={r.status} /></td>
              <td className="px-3 py-2 text-right font-semibold tabular">{formatINR(r.refundPaise)}</td>
              <td className="px-3 py-2 text-right text-muted tabular">{formatAge(r.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
