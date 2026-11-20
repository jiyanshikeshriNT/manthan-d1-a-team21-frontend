import { useEffect, useRef } from 'react'
import { AlertCircle, ImageIcon } from 'lucide-react'
import Segmented from '../../components/ui/Segmented'
import { reasonLabel } from '../../domain/returns'
import { formatINR } from '../../lib/format'
import { refundForItem } from '../../lib/refund'

const GRADES = [
  { value: 'A', label: 'A', sub: 'Like new', key: '1' },
  { value: 'B', label: 'B', sub: 'Minor wear', key: '2' },
  { value: 'C', label: 'C', sub: 'Damaged · 50%', key: '3' },
]

const decisions = (quantity) => [
  { value: 'ACCEPT', label: 'Accept', key: 'A' },
  { value: 'PARTIAL', label: 'Partial', key: 'P', disabled: quantity < 2, title: quantity < 2 ? 'Partial needs 2 or more units' : undefined },
  { value: 'REJECT', label: 'Reject', key: 'R' },
]

const FieldError = ({ id, children }) => (
  <p id={id} className="flex items-start gap-1.5 text-sm font-medium text-danger">
    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    {children}
  </p>
)

/**
 * One item in the inspection form. Number keys pick the grade and a/p/r the decision for the row
 * that has focus (handled by InspectionForm); acceptedQty only exists for Partial.
 */
export default function ItemInspection({ item, line, errors = {}, onChange, onFocusRow, onOpenPhoto }) {
  const id = item.returnItemId
  const qtyRef = useRef(null)

  useEffect(() => {
    if (line.decision === 'PARTIAL') qtyRef.current?.focus()
  }, [line.decision])

  const refund = refundForItem(item, line)
  const max = item.quantity - 1

  return (
    <li onFocusCapture={() => onFocusRow(id)} className="grid gap-4 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-4">
        {item.photoUrl ? (
          <button
            type="button"
            onClick={() => onOpenPhoto({ url: item.photoUrl, title: item.productName })}
            className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas"
            aria-label={`View customer photo of ${item.productName}`}
          >
            <img src={item.photoUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
          </button>
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-lg border border-dashed border-line-strong text-muted" title="No photo">
            <ImageIcon className="size-6" aria-hidden="true" />
            <span className="sr-only">No customer photo</span>
          </span>
        )}
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="font-semibold">{item.productName}</h3>
          <p className="text-sm text-muted">
            <span className="font-mono text-xs">{item.sku}</span> · Qty {item.quantity} · {formatINR(item.unitPricePaise)} each
          </p>
          <p className="text-sm">
            <span className="text-muted">Customer said:</span> {reasonLabel(item.reason)}
            {item.reasonNote && <span className="text-muted"> — “{item.reasonNote}”</span>}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Segmented
            name={`grade-${id}`}
            legend="Condition grade"
            value={line.grade}
            onChange={(grade) => onChange(id, { grade })}
            options={GRADES}
            error={errors.grade}
            describedBy={errors.grade ? `${id}-grade-error` : undefined}
          />
          {errors.grade && <FieldError id={`${id}-grade-error`}>{errors.grade}</FieldError>}
        </div>
        <div className="grid gap-1.5">
          <Segmented
            name={`decision-${id}`}
            legend="Decision"
            value={line.decision}
            onChange={(decision) => onChange(id, { decision, ...(decision !== 'PARTIAL' && { acceptedQty: '' }) })}
            options={decisions(item.quantity)}
            error={errors.decision}
            describedBy={errors.decision ? `${id}-decision-error` : undefined}
          />
          {errors.decision && <FieldError id={`${id}-decision-error`}>{errors.decision}</FieldError>}
        </div>
      </div>

      {line.decision === 'PARTIAL' && (
        <div className="grid max-w-xs gap-1.5">
          <label htmlFor={`${id}-qty`} className="text-sm font-medium">Accepted quantity (1 to {max})</label>
          <input
            id={`${id}-qty`}
            ref={qtyRef}
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={line.acceptedQty}
            onChange={(e) => onChange(id, { acceptedQty: e.target.value })}
            aria-describedby={errors.acceptedQty ? `${id}-qty-error` : undefined}
            aria-invalid={errors.acceptedQty ? true : undefined}
            className="min-h-12 w-full rounded-lg border border-line-strong bg-surface px-3 text-lg tabular focus:border-accent aria-invalid:border-danger"
          />
          {errors.acceptedQty && <FieldError id={`${id}-qty-error`}>{errors.acceptedQty}</FieldError>}
        </div>
      )}

      <p className="flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <span className="text-muted">Refund for this item</span>
        <strong className="text-base tabular" data-testid={`refund-${id}`}>{formatINR(refund)}</strong>
      </p>
    </li>
  )
}
