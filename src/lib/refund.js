// Refund maths for the inspection preview. Integer paise only, round half up.
// Rules: grade A and B refund 100%, grade C refunds 50%, a rejected item refunds 0.
// The backend recalculates this; the preview must match it.

export const GRADES = ['A', 'B', 'C']
export const DECISIONS = ['ACCEPT', 'PARTIAL', 'REJECT']

const GRADE_PERCENT = { A: 100, B: 100, C: 50 }

/** Units that will be refunded for an item, given the agent's decision. */
export function acceptedUnits(quantity, { decision, acceptedQty }) {
  if (decision === 'ACCEPT') return quantity
  if (decision === 'PARTIAL') {
    const n = Math.trunc(Number(acceptedQty))
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), quantity) : 0
  }
  return 0
}

/** Refund in paise for one item line. Returns 0 until a grade and decision are chosen. */
export function refundForItem({ unitPricePaise, quantity }, line) {
  const units = acceptedUnits(quantity, line)
  const percent = GRADE_PERCENT[line.grade]
  if (!units || !percent) return 0
  // Round half up with integers: floor((amount * percent + 50) / 100)
  return Math.floor((unitPricePaise * units * percent + 50) / 100)
}

export const refundTotal = (items, lines) =>
  items.reduce((sum, item) => sum + refundForItem(item, lines[item.returnItemId] ?? {}), 0)
