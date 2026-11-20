import { delay, http, HttpResponse } from 'msw'
import { ORDERS, STAFF_USERS } from './data'
import { RETURNS, currentStatus, toDetail, toEvents, toLabel } from './returnsData'
import { STAFF_RETURNS, applyInspection, financeView, queueRow, refundTotalOf, warehouseView } from './staffData'

const err = (status, code, message) => HttpResponse.json({ error: { code, message } }, { status })

// Simple lookup throttle: 5 failures per minute, then 429.
let failures = []
const throttled = () => {
  const now = Date.now()
  failures = failures.filter((t) => now - t < 60_000)
  return failures.length >= 5
}

const idempotent = new Map() // Idempotency-Key -> returnId
let seq = 4830

/** Finds a return and starts the live clock the first time a live return is opened. */
function find(returnId) {
  const rec = RETURNS.get(returnId)
  if (rec?.live) rec.liveStart ??= Date.now()
  return rec
}

const summary = (rec) => ({
  returnId: rec.returnId,
  status: currentStatus(rec),
  items: rec.items.map(({ returnItemId, orderItemId }) => ({ returnItemId, orderItemId })),
})

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(400)
    const { email, password } = await request.json()
    const user = STAFF_USERS.find((u) => u.email === email?.toLowerCase() && u.password === password)
    if (!user) return err(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    return HttpResponse.json({ token: `mock.${user.role.toLowerCase()}.${Date.now()}`, role: user.role })
  }),

  http.post('/api/orders/lookup', async ({ request }) => {
    await delay(500)
    if (throttled()) return err(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts.')
    const { orderNumber, email } = await request.json()
    const order = ORDERS.find((o) => o.orderNumber === orderNumber && o.email === email)
    if (!order) {
      failures.push(Date.now())
      return err(404, 'ORDER_NOT_FOUND', 'Order not found.')
    }
    const { orderId, placedAt, deliveredAt } = order
    return HttpResponse.json({ orderId, orderNumber, placedAt, deliveredAt })
  }),

  http.get('/api/orders/:orderId/eligibility', async ({ params }) => {
    await delay(600)
    const order = ORDERS.find((o) => o.orderId === params.orderId)
    if (!order) return err(404, 'ORDER_NOT_FOUND', 'Order not found.')
    const returned = new Set(
      [...RETURNS.values()].filter((r) => r.orderId === order.orderId).flatMap((r) => r.items.map((i) => i.orderItemId)),
    )
    const items = order.items.map((i) =>
      returned.has(i.orderItemId)
        ? { ...i, eligible: false, returnableQuantity: 0, reasonCode: 'ALREADY_RETURNED', message: 'You’ve already started a return for this item.', daysLeft: null }
        : i,
    )
    return HttpResponse.json({ orderId: order.orderId, items })
  }),

  http.post('/api/returns', async ({ request }) => {
    await delay(800)
    const key = request.headers.get('Idempotency-Key')
    if (key && idempotent.has(key)) return HttpResponse.json(summary(RETURNS.get(idempotent.get(key))), { status: 200 })

    const body = await request.json()
    const order = ORDERS.find((o) => o.orderId === body.orderId && o.email === body.email)
    if (!order) return err(404, 'ORDER_NOT_FOUND', 'Order not found.')

    const returnId = `RET-2026-${String(++seq).padStart(5, '0')}`
    const now = Date.now()
    const rec = {
      returnId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: 'APPROVED',
      refundMethod: body.refundMethod,
      createdMs: now,
      live: true,
      liveStart: now,
      items: body.items.map((i, n) => {
        const oi = order.items.find((x) => x.orderItemId === i.orderItemId)
        return {
          returnItemId: `${returnId}-${n + 1}`,
          orderItemId: i.orderItemId,
          productName: oi.productName,
          quantity: i.quantity,
          unitPricePaise: oi.unitPricePaise,
          reason: i.reason,
        }
      }),
    }
    RETURNS.set(returnId, rec)
    if (key) idempotent.set(key, returnId)
    return HttpResponse.json(summary(rec), { status: 201 })
  }),

  http.post('/api/returns/:returnId/items/:returnItemId/photo', async () => {
    await delay(500)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/returns/:returnId/timeline', async ({ params }) => {
    await delay(250)
    const rec = find(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    return HttpResponse.json({ returnId: rec.returnId, events: toEvents(rec) })
  }),

  http.get('/api/returns/:returnId/label', async ({ params }) => {
    await delay(300)
    const rec = find(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    return HttpResponse.json(toLabel(rec))
  }),

  http.get('/api/returns/:returnId', async ({ params }) => {
    await delay(400)
    const rec = find(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    return HttpResponse.json(toDetail(rec))
  }),

  // ---- warehouse ----
  http.post('/api/warehouse/scan', async ({ request }) => {
    await delay(350)
    const { token } = await request.json()
    const rec = STAFF_RETURNS.get(String(token ?? '').trim().toUpperCase())
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    if (rec.status === 'IN_TRANSIT') {
      rec.status = 'RECEIVED' // scanning marks the parcel as received
      rec.version += 1
    }
    if (rec.status !== 'RECEIVED') return err(409, 'ILLEGAL_TRANSITION', `Return ${rec.returnId} has already been inspected.`)
    return HttpResponse.json(warehouseView(rec))
  }),

  http.get('/api/warehouse/returns/:returnId', async ({ params }) => {
    await delay(250)
    const rec = STAFF_RETURNS.get(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    return HttpResponse.json(warehouseView(rec))
  }),

  http.post('/api/warehouse/returns/:returnId/inspect', async ({ params, request }) => {
    await delay(600)
    const rec = STAFF_RETURNS.get(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    const { version, items } = await request.json()
    if (rec.status !== 'RECEIVED') return err(409, 'ILLEGAL_TRANSITION', 'This return is not waiting for inspection.')
    if (rec.staleOnce) {
      rec.staleOnce = false
      rec.version += 1 // someone else touched it
    }
    if (version !== rec.version) return err(409, 'STALE_VERSION', 'The return was changed by someone else.')
    const total = applyInspection(rec, items)
    return HttpResponse.json({ returnId: rec.returnId, status: rec.status, version: rec.version, refundPaise: total, outcome: rec.status })
  }),

  // ---- finance ----
  http.get('/api/finance/queue', async () => {
    await delay(400)
    const items = [...STAFF_RETURNS.values()].filter((r) => r.status === 'PENDING_FINANCE' || r.status === 'REFUND_FAILED').map(queueRow)
    return HttpResponse.json({ items })
  }),

  http.get('/api/finance/returns/:returnId', async ({ params }) => {
    await delay(300)
    const rec = STAFF_RETURNS.get(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    return HttpResponse.json(financeView(rec))
  }),

  http.post('/api/finance/returns/:returnId/decision', async ({ params, request }) => {
    await delay(900)
    const rec = STAFF_RETURNS.get(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    const { version, decision, note } = await request.json()
    if (rec.sod) return err(403, 'SEPARATION_OF_DUTIES', 'You handled this return earlier, so you cannot approve it.')
    if (rec.status !== 'PENDING_FINANCE') return err(409, 'ILLEGAL_TRANSITION', 'This return is not waiting for a decision.')
    if (version !== rec.version) return err(409, 'STALE_VERSION', 'The return was changed by someone else.')
    if (decision === 'REJECT' && !note?.trim()) return err(400, 'NOTE_REQUIRED', 'A note is required to reject.')
    rec.version += 1
    if (decision === 'REJECT') rec.status = 'REJECTED'
    else if (rec.failOnce) {
      rec.failOnce = false
      rec.status = 'REFUND_FAILED'
      rec.failureReason = 'The payment gateway timed out'
    } else rec.status = 'REFUNDED'
    return HttpResponse.json({ returnId: rec.returnId, status: rec.status, version: rec.version, failureReason: rec.status === 'REFUND_FAILED' ? rec.failureReason : null })
  }),

  http.post('/api/finance/returns/:returnId/retry-refund', async ({ params }) => {
    await delay(900)
    const rec = STAFF_RETURNS.get(params.returnId)
    if (!rec) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    if (rec.status !== 'REFUND_FAILED') return err(409, 'ILLEGAL_TRANSITION', 'There is no failed refund to retry.')
    rec.status = 'REFUNDED'
    rec.version += 1
    return HttpResponse.json({ returnId: rec.returnId, status: rec.status, version: rec.version, failureReason: null, refundPaise: refundTotalOf(rec) })
  }),
]
