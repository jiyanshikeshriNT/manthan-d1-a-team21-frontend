import { delay, http, HttpResponse } from 'msw'
import { ORDERS, STAFF_USERS } from './data'
import { RETURNS, currentStatus, toDetail, toEvents, toLabel } from './returnsData'

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
]
