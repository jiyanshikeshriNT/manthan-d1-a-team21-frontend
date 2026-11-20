import { makeQrPng } from './qr'

// In-memory returns for the mock API. "live" returns advance on their own (one step per
// LIVE_STEP_MS) so polling on the status page can be seen working.
const HOUR = 3_600_000
const DAY = 24 * HOUR
export const LIVE_STEP_MS = 20_000

const FULL = ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'PENDING_FINANCE', 'REFUND_PROCESSING', 'REFUNDED']

/** @type {Map<string, any>} */
export const RETURNS = new Map()

export function pathFor(status) {
  if (status === 'REFUND_FAILED') return [...FULL.slice(0, 7), 'REFUND_FAILED']
  if (status === 'REJECTED') return [...FULL.slice(0, 5), 'REJECTED']
  return FULL.slice(0, FULL.indexOf(status) + 1)
}

export function currentStatus(rec) {
  if (!rec.live) return rec.status
  const step = Math.floor((Date.now() - rec.liveStart) / LIVE_STEP_MS)
  return FULL[Math.min(1 + step, FULL.length - 1)]
}

const stamp = (rec, i) => (rec.live ? rec.liveStart + Math.max(0, i - 1) * LIVE_STEP_MS : rec.createdMs + i * 5 * HOUR)

export function toEvents(rec) {
  return pathFor(currentStatus(rec)).map((status, i) => ({ status, at: new Date(stamp(rec, i)).toISOString() }))
}

export function toDetail(rec) {
  const status = currentStatus(rec)
  const inspected = pathFor(status).includes('INSPECTED')
  const items = rec.items.map((i) => {
    const accepted = status !== 'REJECTED' && i.accepted !== false
    const grade = inspected && accepted ? (i.grade ?? 'A') : null
    const full = i.unitPricePaise * i.quantity
    return {
      returnItemId: i.returnItemId,
      productName: i.productName,
      quantity: i.quantity,
      reason: i.reason,
      unitPricePaise: i.unitPricePaise,
      status: !inspected ? 'AWAITING_INSPECTION' : accepted ? 'ACCEPTED' : 'REJECTED',
      grade,
      refundPaise: !inspected ? null : accepted ? Math.round(full * (grade === 'C' ? 0.5 : 1)) : 0,
    }
  })
  return {
    returnId: rec.returnId,
    orderNumber: rec.orderNumber,
    status,
    refundMethod: rec.refundMethod,
    estimatedRefundPaise: rec.items.reduce((s, i) => s + i.unitPricePaise * i.quantity, 0),
    refundedPaise: status === 'REFUNDED' ? items.reduce((s, i) => s + i.refundPaise, 0) : null,
    rejectionReason: status === 'REJECTED' ? rec.rejectionReason : null,
    createdAt: new Date(rec.live ? (rec.liveStart ?? rec.createdMs) : rec.createdMs).toISOString(),
    items,
  }
}

export function toLabel(rec) {
  rec.qr ??= makeQrPng(rec.returnId)
  return {
    labelNumber: `RL-${rec.returnId.slice(-5)}-${rec.returnId.length}`,
    qrPngBase64: rec.qr,
    expiresAt: new Date(rec.createdMs + (rec.labelDays ?? 7) * DAY).toISOString(),
  }
}

const line = (returnId, n, productName, quantity, unitPricePaise, reason, extra = {}) => ({
  returnItemId: `${returnId}-${n}`,
  orderItemId: `seed_${returnId}_${n}`,
  productName,
  quantity,
  unitPricePaise,
  reason,
  ...extra,
})

function seed(returnId, orderNumber, status, daysAgo, items, extra = {}) {
  RETURNS.set(returnId, {
    returnId,
    orderId: 'ord_demo',
    orderNumber,
    status,
    refundMethod: 'ORIGINAL',
    createdMs: Date.now() - daysAgo * DAY,
    items: items.map((it, n) => line(returnId, n + 1, ...it)),
    ...extra,
  })
}

// Label expires in 2 days, so the warning notice shows.
seed('RET-2026-04817', 'RR-099812', 'IN_TRANSIT', 2, [
  ['Linen shirt, white, size L', 1, 129900, 'WRONG_SIZE'],
  ['Ceramic mug set', 1, 64900, 'DAMAGED'],
], { labelDays: 4 })

seed('RET-2026-04820', 'RR-099640', 'REFUNDED', 6, [
  ['Cotton kurta, indigo, size M', 1, 129900, 'WRONG_SIZE', { grade: 'A' }],
  ['Steel water bottle, 1 L', 2, 64900, 'DAMAGED', { grade: 'C' }],
], { refundMethod: 'STORE_CREDIT' })

seed('RET-2026-04821', 'RR-099702', 'REJECTED', 4, [
  ['Running shoes, size 9', 1, 349900, 'CHANGED_MIND'],
], { rejectionReason: 'The shoes showed signs of heavy wear that wasn’t reported, so we couldn’t accept the return.' })

seed('RET-2026-04822', 'RR-099555', 'REFUND_FAILED', 5, [
  ['Wireless earbuds, black', 1, 179900, 'NOT_AS_DESCRIBED', { grade: 'B' }],
])

seed('RET-2026-04823', 'RR-099588', 'PENDING_FINANCE', 4, [
  ['Laptop 14", silver', 1, 5499000, 'NOT_AS_DESCRIBED', { grade: 'A' }],
])

// Starts at "Approved" on first open and advances every 20 s.
seed('RET-2026-04824', 'RR-099920', 'APPROVED', 0, [
  ['Denim jacket, size M', 1, 249900, 'WRONG_SIZE'],
  ['Canvas tote bag', 1, 49900, 'CHANGED_MIND'],
], { live: true, liveStart: null })
