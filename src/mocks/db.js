// In-memory fake of the Spring Boot backend's data, used by the MSW handlers (tests, and the browser
// when VITE_USE_MOCKS=true). Shapes mirror the real API (system/LLD.md §3.4). Money is integer paise.
// Call resetDb() to go back to the fixtures (the test setup does this after every test).

const DAY = 86_400_000
export const ZONE = 'Asia/Kolkata'

/** ISO instant `days` days (and `hours` hours) ago. */
export const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString()

/** YYYY-MM-DD in Asia/Kolkata for an instant (ISO string or ms). */
export const istDate = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date(t))

/** A YYYY-MM-DD date plus n days. */
export const addDays = (isoDate, n) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY)

const longDate = (isoDate) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`))

/** Staff users (HTTP Basic). The seed password of the real backend's `seed` profile. */
export const STAFF_PASSWORD = 'ReturnRight#2026'
export const STAFF_USERS = { warehouse: 'WAREHOUSE', finance: 'FINANCE', manager: 'MANAGER' }

/** Customer bearer token for an order. Real sessions add a counter; tests can use this form directly. */
export const customerToken = (orderNumber) => `mock-session:${orderNumber}`
export const orderFromToken = (token) => (token?.startsWith('mock-session:') ? token.split(':')[1] : null)

export const CATEGORIES = {
  Apparel: { returnable: true, window: 30 },
  Electronics: { returnable: true, window: 10 },
  Home: { returnable: true, window: 30 },
  Beauty: { returnable: true, window: 30 },
  Innerwear: { returnable: false, window: null },
  Perishables: { returnable: false, window: null },
}

const line = (id, sku, productName, category, quantity, unitPricePaise) => ({ id, sku, productName, category, quantity, unitPricePaise })

function orders() {
  return [
    {
      orderNumber: 'ORD-100245', email: 'priya.sharma@example.com', customerId: 1, orderedAt: ago(9), deliveredAt: ago(6),
      lines: [
        line(101, 'HOM-BTL-01', 'Steel water bottle', 'Home', 2, 64900),
        line(102, 'ELE-EAR-02', 'Wireless earbuds', 'Electronics', 1, 249900),
        line(103, 'APP-KUR-03', 'Cotton kurta', 'Apparel', 1, 129900),
        line(104, 'INN-BRF-04', 'Cotton briefs', 'Innerwear', 1, 49900),
        line(105, 'ELE-CSE-05', 'Phone case', 'Electronics', 1, 79900),
      ],
    },
    {
      orderNumber: 'ORD-100198', email: 'rahul.verma@example.com', customerId: 2, orderedAt: ago(45), deliveredAt: ago(40),
      lines: [
        line(201, 'APP-LIN-01', 'Linen shirt', 'Apparel', 2, 99900),
        line(202, 'ELE-LAP-02', 'Laptop 14"', 'Electronics', 1, 5499000),
        line(203, 'HOM-MUG-03', 'Ceramic mug', 'Home', 2, 39900),
        line(204, 'HOM-LMP-04', 'Desk lamp', 'Home', 1, 189900),
        line(205, 'HOM-YOG-05', 'Yoga mat', 'Home', 1, 149900),
        line(206, 'BEA-SER-06', 'Face serum', 'Beauty', 1, 89900),
        line(207, 'APP-DNM-07', 'Denim jacket', 'Apparel', 1, 349900),
        line(208, 'HOM-CND-08', 'Scented candle', 'Home', 1, 59900),
      ],
    },
    {
      orderNumber: 'ORD-100300', email: 'anita.rao@example.com', customerId: 3, orderedAt: ago(1), deliveredAt: null,
      lines: [line(301, 'APP-RUN-01', 'Running shoes', 'Apparel', 1, 459900)],
    },
  ]
}

/** Deterministic 8-hex "signature" so label codes look like the real HMAC-signed ones. */
export function signature(rma) {
  let h = 2166136261
  for (const ch of `label:${rma}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}
export const labelCodeFor = (rma) => `RR-${rma}-${signature(rma)}`

let uuidSeq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++uuidSeq).padStart(12, '0')}`

/** Mutable state. */
export let db

export function resetDb() {
  uuidSeq = 0
  db = {
    orders: orders(),
    returns: new Map(), // rma -> record
    refunds: new Map(), // id -> refund
    ledger: [],
    audit: [],
    idempotency: new Map(), // `${orderNumber}:${key}` -> rma
    lookupFailures: [],
    faults: { mode: 'NONE', latencyMs: 0 },
    rmaSeq: 100120,
    refundSeq: 510,
    ledgerSeq: 1,
    auditSeq: 1,
    sessionSeq: 1,
  }
  seedReturns()
}

// ---- helpers used by the handlers ----

export const findOrder = (orderNumber) => db.orders.find((o) => o.orderNumber.toUpperCase() === String(orderNumber ?? '').toUpperCase())
export const findLine = (orderNumber, lineId) => findOrder(orderNumber)?.lines.find((l) => l.id === Number(lineId))
export const ACTIVE = (r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED'

/** Units of a line already in active (not cancelled or rejected) returns. */
function returnedQty(orderNumber, lineId) {
  let n = 0
  for (const r of db.returns.values()) {
    if (r.orderNumber !== orderNumber || !ACTIVE(r)) continue
    for (const i of r.items) if (i.orderLineId === lineId) n += i.qty
  }
  return n
}

/** Per-line eligibility, as the backend's EligibilityEngine reports it. */
export function eligibility(order, l) {
  const cat = CATEGORIES[l.category] ?? { returnable: true, window: 30 }
  const no = (code, message, deadline = null) => ({ eligible: false, code, message, returnableQty: 0, deadline })
  if (!cat.returnable) return no('CATEGORY_NOT_RETURNABLE', `For hygiene and safety reasons, ${l.category} items can't be returned.`)
  if (!order.deliveredAt) return no('NOT_DELIVERED', 'You can start a return once this item is delivered.')
  const delivered = istDate(order.deliveredAt)
  const deadline = addDays(delivered, cat.window)
  const left = daysBetween(istDate(), deadline)
  if (left < 0) return no('WINDOW_EXPIRED', `The ${cat.window}-day return window for this item closed on ${longDate(deadline)}.`, deadline)
  const returnableQty = l.quantity - returnedQty(order.orderNumber, l.id)
  if (returnableQty <= 0) return no('ALREADY_IN_RETURN', 'All units of this item are already part of a return.', deadline)
  return {
    eligible: true,
    code: 'ELIGIBLE',
    message: `Returnable until ${longDate(deadline)} (${left} ${left === 1 ? 'day' : 'days'} left).`,
    returnableQty,
    deadline,
  }
}

export function audit(entityType, entityId, action, fromState, toState, actor, details, at = new Date().toISOString()) {
  const [kind, id] = actor.includes(':') ? actor.split(':') : [actor, null]
  const actorRole = kind === 'customer' ? 'CUSTOMER' : kind === 'system' ? 'SYSTEM' : (STAFF_USERS[id] ?? 'STAFF')
  db.audit.push({
    id: db.auditSeq++, entityType, entityId: String(entityId), action, fromState, toState, actor, actorRole,
    details: details ?? null, correlationId: null, createdAt: at,
  })
}

export const TERMINAL = ['REFUNDED', 'REJECTED', 'CANCELLED']

/** Changes a return's status and writes the audit row (like ReturnStateMachine.transition). */
export function transition(rec, to, actor, details, at = new Date().toISOString()) {
  audit('RETURN', rec.id, 'STATUS_CHANGED', rec.status, to, actor, details, at)
  rec.status = to
  rec.updatedAt = at
  if (TERMINAL.includes(to)) rec.closedAt = at
}

export function createReturn({ orderNumber, refundMethod, items, at = new Date().toISOString(), flagged = false, status, flagReason }) {
  const order = findOrder(orderNumber)
  const rma = `RMA-${db.rmaSeq++}`
  const rec = {
    id: uuid(), rma, orderNumber: order.orderNumber, customerId: order.customerId, refundMethod, flagged,
    labelCode: labelCodeFor(rma), createdAt: at, updatedAt: at, closedAt: null, totalRefundPaise: null, status: 'REQUESTED',
    items: items.map((i, n) => ({
      id: Number(`${db.rmaSeq}${n + 1}`), orderLineId: Number(i.orderLineId), qty: i.qty, reasonCode: i.reasonCode,
      reasonText: i.reasonText ?? null, photoCount: i.photoCount ?? 0,
      conditionGrade: null, decision: null, acceptedQty: null, refundPaise: null, inspectionNote: null,
    })),
  }
  db.returns.set(rma, rec)
  audit('RETURN', rec.id, 'CREATED', null, 'REQUESTED', `customer:${order.customerId}`, `Return requested for ${items.length} item(s)`, at)
  if (status === 'PENDING_REVIEW' || flagged) {
    transition(rec, 'PENDING_REVIEW', 'system', flagReason ?? 'Customer has 4 return requests in the last 30 days; manual review required', at)
  } else {
    transition(rec, 'APPROVED', 'system', 'All items eligible; approved automatically', at)
  }
  return rec
}

/** Refund amount for an inspected item: unit × accepted × grade% (A/B 100, C 50), half up. */
export const refundFor = (unitPricePaise, qty, grade) => Math.floor((unitPricePaise * qty * (grade === 'C' ? 50 : 100) + 50) / 100)

export function inspect(rec, verdicts, actor, at = new Date().toISOString()) {
  let total = 0
  for (const item of rec.items) {
    const v = verdicts.find((x) => Number(x.itemId) === item.id)
    const accepted = v.decision === 'REJECTED' ? 0 : (v.acceptedQty ?? item.qty)
    const l = findLine(rec.orderNumber, item.orderLineId)
    item.conditionGrade = v.grade
    item.decision = v.decision
    item.acceptedQty = accepted
    item.refundPaise = refundFor(l.unitPricePaise, accepted, v.grade)
    item.inspectionNote = v.note ?? null
    total += item.refundPaise
  }
  rec.totalRefundPaise = total
  transition(rec, 'INSPECTED', actor, `Inspected, refund ₹${(total / 100).toFixed(2)}`, at)
  if (total === 0) {
    transition(rec, 'REJECTED', actor, 'All items were rejected at inspection', at)
    return null
  }
  const needsApproval = total > 1_000_000
  const refund = {
    id: db.refundSeq++, returnId: rec.id, rma: rec.rma, amountPaise: total, method: rec.refundMethod,
    status: needsApproval ? 'AWAITING_APPROVAL' : 'PENDING', attempts: 0, requiresApproval: needsApproval,
    approvedBy: null, approvedAt: null, gatewayTxnId: null, lastError: null, nextAttemptAt: null, createdAt: at, updatedAt: at,
  }
  db.refunds.set(refund.id, refund)
  audit('REFUND', refund.id, 'CREATED', null, refund.status, actor, needsApproval ? 'Refund needs finance approval' : 'Refund started', at)
  transition(rec, needsApproval ? 'AWAITING_FINANCE' : 'REFUND_IN_PROGRESS', actor, needsApproval ? 'Refund needs finance approval (over ₹10,000)' : 'Refund started', at)
  return refund
}

/** Pays a refund through the (mock) gateway, honouring the injected fault mode. */
export function execute(refund, at = new Date().toISOString()) {
  const rec = [...db.returns.values()].find((r) => r.id === refund.returnId)
  refund.attempts += 1
  refund.updatedAt = at
  const mode = db.faults.mode
  if (mode === 'DECLINE') {
    refund.status = 'FAILED'
    refund.lastError = 'Payment declined by the gateway'
    audit('REFUND', refund.id, 'FAILED', 'PROCESSING', 'FAILED', 'system', refund.lastError, at)
    return refund
  }
  if (mode === 'FAIL' || mode === 'TIMEOUT' || mode === 'FAIL_AFTER_CHARGE') {
    refund.status = 'UNKNOWN'
    refund.lastError = 'The payment gateway did not answer in time'
    refund.nextAttemptAt = new Date(Date.now() + 30_000).toISOString()
    audit('REFUND', refund.id, 'UNKNOWN', 'PROCESSING', 'UNKNOWN', 'system', refund.lastError, at)
    return refund
  }
  refund.status = 'SUCCEEDED'
  refund.lastError = null
  refund.nextAttemptAt = null
  refund.gatewayTxnId = refund.method === 'STORE_CREDIT' ? null : `TXN-${refund.id}`
  const credit = refund.method === 'STORE_CREDIT' ? 'STORE_CREDIT_LIABILITY' : 'GATEWAY_CLEARING'
  db.ledger.push(
    { id: db.ledgerSeq++, refundId: refund.id, customerId: rec.customerId, account: 'REFUND_EXPENSE', direction: 'DEBIT', amountPaise: refund.amountPaise, createdAt: at },
    { id: db.ledgerSeq++, refundId: refund.id, customerId: rec.customerId, account: credit, direction: 'CREDIT', amountPaise: refund.amountPaise, createdAt: at },
  )
  audit('REFUND', refund.id, 'SUCCEEDED', 'PROCESSING', 'SUCCEEDED', 'system', `Refund of ₹${(refund.amountPaise / 100).toFixed(2)} paid`, at)
  if (rec.status === 'REFUND_IN_PROGRESS') transition(rec, 'REFUNDED', 'system', 'Refund paid', at)
  return refund
}

function seedReturns() {
  const W = 'staff:warehouse'
  // Approved: the customer can print the label (ORD-100245, so its phone case is "already returned").
  createReturn({ orderNumber: 'ORD-100245', refundMethod: 'ORIGINAL_PAYMENT', at: ago(2), items: [{ orderLineId: 105, qty: 1, reasonCode: 'CHANGED_MIND' }] })

  // Refunded with a Grade C item.
  const refunded = createReturn({ orderNumber: 'ORD-100198', refundMethod: 'ORIGINAL_PAYMENT', at: ago(30), items: [{ orderLineId: 201, qty: 2, reasonCode: 'DAMAGED', photoCount: 2 }] })
  transition(refunded, 'IN_TRANSIT', 'customer:2', 'Customer handed the parcel to the carrier', ago(29))
  transition(refunded, 'RECEIVED', W, 'Parcel received at the warehouse', ago(27))
  execute(inspect(refunded, [{ itemId: refunded.items[0].id, grade: 'C', decision: 'ACCEPTED' }], W, ago(26)), ago(26))

  // In transit: scan its label to receive it.
  const transit = createReturn({ orderNumber: 'ORD-100198', refundMethod: 'STORE_CREDIT', at: ago(5), items: [{ orderLineId: 203, qty: 2, reasonCode: 'WRONG_ITEM' }] })
  transition(transit, 'IN_TRANSIT', 'customer:2', 'Customer handed the parcel to the carrier', ago(4))

  // Received: waiting for inspection.
  const received = createReturn({
    orderNumber: 'ORD-100198', refundMethod: 'ORIGINAL_PAYMENT', at: ago(6),
    items: [
      { orderLineId: 204, qty: 1, reasonCode: 'DEFECTIVE', reasonText: 'Flickers after a few minutes', photoCount: 1 },
      { orderLineId: 206, qty: 1, reasonCode: 'CHANGED_MIND' },
    ],
  })
  transition(received, 'IN_TRANSIT', 'customer:2', 'Customer handed the parcel to the carrier', ago(5))
  transition(received, 'RECEIVED', W, 'Parcel received at the warehouse', ago(1))

  // Over ₹10,000: waiting for finance approval, from a flagged customer.
  const big = createReturn({
    orderNumber: 'ORD-100198', refundMethod: 'ORIGINAL_PAYMENT', at: ago(8), flagged: true,
    items: [{ orderLineId: 202, qty: 1, reasonCode: 'DEFECTIVE', reasonText: 'Screen has dead pixels', photoCount: 3 }],
  })
  transition(big, 'APPROVED', 'staff:manager', 'Approved after manager review', ago(7))
  transition(big, 'IN_TRANSIT', 'customer:2', 'Customer handed the parcel to the carrier', ago(7))
  transition(big, 'RECEIVED', W, 'Parcel received at the warehouse', ago(3))
  inspect(big, [{ itemId: big.items[0].id, grade: 'A', decision: 'ACCEPTED' }], W, ago(2, 5))

  // A refund that failed at the gateway and needs a retry.
  const failed = createReturn({ orderNumber: 'ORD-100198', refundMethod: 'ORIGINAL_PAYMENT', at: ago(12), items: [{ orderLineId: 205, qty: 1, reasonCode: 'NOT_AS_DESCRIBED' }] })
  transition(failed, 'IN_TRANSIT', 'customer:2', 'Customer handed the parcel to the carrier', ago(11))
  transition(failed, 'RECEIVED', W, 'Parcel received at the warehouse', ago(9))
  const failedRefund = inspect(failed, [{ itemId: failed.items[0].id, grade: 'B', decision: 'ACCEPTED' }], W, ago(9))
  Object.assign(failedRefund, { status: 'FAILED', attempts: 5, lastError: 'Gateway declined the payment', updatedAt: ago(8) })

  // Flagged customer: waiting for a manager's review.
  createReturn({ orderNumber: 'ORD-100198', refundMethod: 'STORE_CREDIT', at: ago(0, 6), status: 'PENDING_REVIEW', items: [{ orderLineId: 207, qty: 1, reasonCode: 'WRONG_SIZE' }] })

  // Rejected after review.
  const rejected = createReturn({ orderNumber: 'ORD-100198', refundMethod: 'ORIGINAL_PAYMENT', at: ago(15), status: 'PENDING_REVIEW', items: [{ orderLineId: 208, qty: 1, reasonCode: 'OTHER', reasonText: 'Did not like the smell' }] })
  transition(rejected, 'REJECTED', 'staff:manager', 'Rejected after manager review: Repeated returns of used items', ago(14))
}

/** Fixture ids (stable, because resetDb() restarts every sequence). */
export const FIX = {
  approved: 'RMA-100120', // ORD-100245, label available
  refunded: 'RMA-100121', // ORD-100198, Grade C, refund #510 paid
  inTransit: 'RMA-100122', // scan its label to receive it
  received: 'RMA-100123', // ready to inspect
  awaitingFinance: 'RMA-100124', // refund #511, ₹54,990, flagged customer
  refundFailed: 'RMA-100125', // refund #512 FAILED
  pendingReview: 'RMA-100126',
  rejected: 'RMA-100127',
  refundPaid: 510,
  refundAwaiting: 511,
  refundFailedId: 512,
}

resetDb()
