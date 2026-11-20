import { AlertTriangle, CheckCircle2, Clock, MinusCircle, XCircle } from 'lucide-react'
import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import { reasonLabel } from '../../../domain/returns'
import { formatINR } from '../../../lib/format'

const ITEM_STATUS = {
  AWAITING_INSPECTION: { tone: 'neutral', icon: Clock, text: 'Pending' },
  ACCEPTED: { tone: 'success', icon: CheckCircle2, text: 'Accepted' },
  REJECTED: { tone: 'danger', icon: XCircle, text: 'Not accepted' },
}

// Grade B has no dedicated colour yet (CLAUDE.md "Known gaps"), so it uses neutral plus its label.
const GRADE = {
  A: { tone: 'success', icon: CheckCircle2, text: 'Grade A' },
  B: { tone: 'neutral', icon: MinusCircle, text: 'Grade B' },
  C: { tone: 'warning', icon: AlertTriangle, text: 'Grade C' },
}

/** @param {{ items: import('../../../api/hooks').ReturnDetailItem[], estimatedRefundPaise: number, status: string }} props */
export default function ItemsTable({ items, estimatedRefundPaise, status }) {
  const inspected = items.some((i) => i.status !== 'AWAITING_INSPECTION')
  const total = items.reduce((s, i) => s + (i.refundPaise ?? 0), 0)
  const hasGradeC = items.some((i) => i.grade === 'C')
  const totalLabel = status === 'REFUNDED' ? 'Refunded' : inspected ? 'Refund total' : 'Estimated refund'

  return (
    <Card padded={false} className="animate-fade-up overflow-hidden" style={{ animationDelay: '250ms' }} aria-labelledby="items-h">
      <h2 id="items-h" className="px-5 pt-5 pb-3 font-semibold sm:px-6">Items in this return</h2>
      <div className="overflow-x-auto" role="region" aria-label="Returned items table" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Status, grade and refund for each returned item</caption>
          <thead className="border-y border-line bg-canvas text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold sm:px-6">Item</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Status and grade</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold sm:px-6">Refund</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((i) => {
              const st = ITEM_STATUS[i.status] ?? ITEM_STATUS.AWAITING_INSPECTION
              const gr = i.grade ? GRADE[i.grade] : null
              const accepted = i.acceptedQty ?? i.quantity
              const full = i.unitPricePaise * accepted
              const partial = i.status === 'ACCEPTED' && accepted < i.quantity
              return (
                <tr key={i.returnItemId} className="align-top">
                  <th scope="row" className="px-3 py-3.5 font-medium sm:px-6">
                    {i.productName}
                    <span className="block text-xs font-normal text-muted">Qty {i.quantity} · {reasonLabel(i.reason)}</span>
                  </th>
                  <td className="px-3 py-3.5">
                    <div className="grid justify-items-start gap-1.5">
                      <Badge tone={st.tone} icon={st.icon}>{partial ? `${accepted} of ${i.quantity} accepted` : st.text}</Badge>
                      {gr ? <Badge tone={gr.tone} icon={gr.icon}>{gr.text}</Badge> : <span className="text-xs text-muted">Not graded</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right tabular sm:px-6">
                    {i.refundPaise == null ? (
                      <span className="text-muted">Pending</span>
                    ) : (
                      <>
                        <span className="font-semibold">{formatINR(i.refundPaise)}</span>
                        {i.grade === 'C' && <span className="block text-xs text-warning">50% of {formatINR(full)}</span>}
                        {i.status === 'REJECTED' && <span className="block text-xs text-muted">Not refunded</span>}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-line bg-canvas">
            <tr>
              <th scope="row" colSpan={2} className="px-3 py-3 font-semibold sm:px-6">{totalLabel}</th>
              <td className="px-3 py-3 text-right font-semibold tabular sm:px-6" data-testid="refund-total">
                {formatINR(inspected ? total : estimatedRefundPaise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {hasGradeC && (
        <p className="border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
          <strong className="text-ink">Why is a refund lower?</strong> Items graded C (damaged or used) are refunded at 50% of the item price.
        </p>
      )}
    </Card>
  )
}
