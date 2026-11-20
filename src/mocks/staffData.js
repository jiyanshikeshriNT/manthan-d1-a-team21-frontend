import { FINANCE_APPROVAL_THRESHOLD_PAISE } from '../domain/returnStatus'
import { refundForItem } from '../lib/refund'

// Mock data for the warehouse and finance screens. Rules mirror docs/api-contract.md.
const HOUR = 3_600_000

/** A plain placeholder "photo" so the lightbox has something to show. */
const photo = (label, a, b) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><text x="320" y="250" font-family="sans-serif" font-size="34" fill="#fff" text-anchor="middle">${label}</text></svg>`,
  )}`

/** @type {Map<string, any>} */
export const STAFF_RETURNS = new Map()

const item = (id, n, productName, sku, quantity, unitPricePaise, reason, extra = {}) => ({
  returnItemId: `${id}-${n}`,
  productName,
  sku,
  quantity,
  unitPricePaise,
  reason,
  reasonNote: '',
  photoUrl: null,
  ...extra,
})

function add(returnId, orderNumber, customerName, status, items, extra = {}) {
  STAFF_RETURNS.set(returnId, {
    returnId,
    orderNumber,
    customerName,
    flagged: false,
    status,
    version: 1,
    refundMethod: 'ORIGINAL',
    submittedAt: new Date(Date.now() - 2 * HOUR).toISOString(),
    items,
    ...extra,
  })
}

// ---- Returns to scan at the warehouse (status IN_TRANSIT) ----
add('RET-2026-04901', 'RR-100411', 'Rahul M.', 'IN_TRANSIT', [
  item('RET-2026-04901', 1, 'Cotton kurta, indigo, size M', 'FSH-KUR-IND-M', 1, 129900, 'DAMAGED', { reasonNote: 'Stitching came apart after one wash', photoUrl: photo('Cotton kurta', '#475569', '#0f766e') }),
  item('RET-2026-04901', 2, 'Steel water bottle, 1 L', 'HOM-BTL-1L', 3, 64900, 'CHANGED_MIND'),
])
add('RET-2026-04902', 'RR-100420', 'Vikram P.', 'IN_TRANSIT', [
  item('RET-2026-04902', 1, 'Laptop 14", silver', 'ELC-LAP-14', 1, 5499000, 'NOT_AS_DESCRIBED', { photoUrl: photo('Laptop 14"', '#334155', '#4f46e5') }),
], { flagged: true })
// The first inspect call on this one fails with STALE_VERSION, to show the reload flow.
add('RET-2026-04903', 'RR-100433', 'Sneha R.', 'IN_TRANSIT', [
  item('RET-2026-04903', 1, 'Wireless headphones', 'ELC-HDP-01', 1, 1299000, 'DAMAGED', { photoUrl: photo('Headphones', '#64748b', '#0369a1') }),
], { staleOnce: true })

// ---- Finance queue (already inspected) ----
function inspected(returnId, orderNumber, customerName, status, lines, extra = {}) {
  const items = lines.map(([, name, sku, quantity, price, grade, decision, acceptedQty, ph], i) => {
    const base = item(returnId, i + 1, name, sku, quantity, price, 'NOT_AS_DESCRIBED', { photoUrl: ph ? photo(ph, '#475569', '#0f766e') : null })
    const line = { grade, decision, acceptedQty }
    return { ...base, grade, decision, acceptedQty, refundPaise: refundForItem(base, line) }
  })
  add(returnId, orderNumber, customerName, status, items, extra)
}

inspected('RET-2026-04911', 'RR-100380', 'Sneha R.', 'PENDING_FINANCE', [[1, 'Smart TV 43"', 'ELC-TV-43', 1, 2900000, 'C', 'ACCEPT', undefined, 'Smart TV']], {
  submittedAt: new Date(Date.now() - 5 * HOUR).toISOString(),
  failOnce: true, // the first approval fails at the gateway, to show retry
})
inspected('RET-2026-04912', 'RR-100391', 'Vikram P.', 'PENDING_FINANCE', [[1, 'Laptop 14", silver', 'ELC-LAP-14', 1, 5499000, 'A', 'ACCEPT', undefined, 'Laptop']], {
  flagged: true,
  flagReason: '4 returns in the last 30 days (limit is 3)',
  submittedAt: new Date(Date.now() - 50 * HOUR).toISOString(),
})
inspected('RET-2026-04913', 'RR-100402', 'Arjun T.', 'PENDING_FINANCE', [
  [1, 'Air fryer 4 L', 'HOM-AFR-4', 1, 699000, 'A', 'ACCEPT'],
  [2, 'Hand mixer', 'HOM-MIX-1', 2, 274500, 'B', 'ACCEPT'],
], { submittedAt: new Date(Date.now() - 3 * HOUR).toISOString(), sod: true }) // 403 SEPARATION_OF_DUTIES on decision
inspected('RET-2026-04914', 'RR-100355', 'Meera J.', 'REFUND_FAILED', [[1, 'Mirrorless camera', 'ELC-CAM-01', 1, 3250000, 'A', 'ACCEPT', undefined, 'Camera']], {
  flagged: true,
  flagReason: '5 returns in the last 30 days (limit is 3)',
  failureReason: 'The payment gateway timed out',
  submittedAt: new Date(Date.now() - 27 * HOUR).toISOString(),
})

// ---- views and rules ----
export const warehouseView = ({ returnId, orderNumber, status, version, items }) => ({
  returnId,
  orderNumber,
  status,
  version,
  items: items.map(({ returnItemId, productName, sku, quantity, unitPricePaise, reason, reasonNote, photoUrl }) => ({ returnItemId, productName, sku, quantity, unitPricePaise, reason, reasonNote, photoUrl })),
})

export const gradeSummary = (rec) =>
  rec.items.reduce((acc, i) => (i.grade && i.decision !== 'REJECT' ? { ...acc, [i.grade]: (acc[i.grade] ?? 0) + 1 } : acc), {})

export const refundTotalOf = (rec) => rec.items.reduce((s, i) => s + (i.refundPaise ?? 0), 0)

export const queueRow = (rec) => ({
  returnId: rec.returnId,
  orderNumber: rec.orderNumber,
  customerName: rec.customerName,
  flagged: rec.flagged,
  status: rec.status,
  refundPaise: refundTotalOf(rec),
  gradeSummary: gradeSummary(rec),
  submittedAt: rec.submittedAt,
})

export const financeView = (rec) => ({
  ...queueRow(rec),
  version: rec.version,
  flagReason: rec.flagReason,
  refundMethod: rec.refundMethod,
  failureReason: rec.status === 'REFUND_FAILED' ? rec.failureReason : null,
  items: rec.items.map(({ returnItemId, productName, quantity, grade, decision, acceptedQty, refundPaise, photoUrl }) => ({
    returnItemId, productName, quantity, grade, decision, acceptedQty, refundPaise, photoUrl,
  })),
})

/** Applies the inspection and returns the next status, mirroring the backend. */
export function applyInspection(rec, lines) {
  rec.items = rec.items.map((i) => {
    const l = lines.find((x) => x.returnItemId === i.returnItemId)
    const line = { grade: l.grade, decision: l.decision, acceptedQty: l.acceptedQty }
    return { ...i, ...line, refundPaise: refundForItem(i, line) }
  })
  const total = refundTotalOf(rec)
  rec.status = total > FINANCE_APPROVAL_THRESHOLD_PAISE ? 'PENDING_FINANCE' : total === 0 ? 'REJECTED' : 'REFUND_PROCESSING'
  rec.submittedAt = new Date().toISOString()
  rec.version += 1
  return total
}
