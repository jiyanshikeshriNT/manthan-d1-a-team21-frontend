import { delay, http, HttpResponse } from 'msw'
import { ORDERS, RETURNS, STAFF_USERS } from './data'

const err = (status, code, message) => HttpResponse.json({ error: { code, message } }, { status })

// Simple per-session lookup throttle: 5 failures per minute, then 429.
let failures = []
const throttled = () => {
  const now = Date.now()
  failures = failures.filter((t) => now - t < 60_000)
  return failures.length >= 5
}

const idempotent = new Map() // Idempotency-Key -> returnId
let seq = 4816

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
    const returned = new Set([...RETURNS.values()].filter((r) => r.orderId === order.orderId).flatMap((r) => r.items.map((i) => i.orderItemId)))
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
    const now = new Date().toISOString()
    const items = body.items.map((i, n) => {
      const oi = order.items.find((x) => x.orderItemId === i.orderItemId)
      return { returnItemId: `${returnId}-${n + 1}`, orderItemId: i.orderItemId, productName: oi.productName, quantity: i.quantity, reason: i.reason, unitPricePaise: oi.unitPricePaise }
    })
    const ret = {
      returnId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: 'APPROVED',
      refundMethod: body.refundMethod,
      estimatedRefundPaise: items.reduce((s, i) => s + i.unitPricePaise * i.quantity, 0),
      createdAt: now,
      items,
      history: [{ status: 'REQUESTED', at: now }, { status: 'APPROVED', at: now }],
    }
    RETURNS.set(returnId, ret)
    if (key) idempotent.set(key, returnId)
    return HttpResponse.json(summary(ret), { status: 201 })
  }),

  http.post('/api/returns/:returnId/items/:returnItemId/photo', async () => {
    await delay(500)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/returns/:returnId', async ({ params }) => {
    await delay(400)
    const ret = RETURNS.get(params.returnId) ?? (params.returnId === 'RET-2026-04817' ? DEMO_RETURN : null)
    if (!ret) return err(404, 'RETURN_NOT_FOUND', 'Return not found.')
    const { orderId: _o, ...detail } = ret
    return HttpResponse.json(detail)
  }),
]

function summary(r) {
  return { returnId: r.returnId, status: r.status, items: r.items.map(({ returnItemId, orderItemId }) => ({ returnItemId, orderItemId })) }
}

const t = (d) => new Date(Date.now() - d * 86_400_000).toISOString()
const DEMO_RETURN = {
  returnId: 'RET-2026-04817',
  orderId: 'ord_demo',
  orderNumber: 'RR-099812',
  status: 'IN_TRANSIT',
  refundMethod: 'ORIGINAL',
  estimatedRefundPaise: 194800,
  createdAt: t(2),
  items: [
    { returnItemId: 'RET-2026-04817-1', orderItemId: 'x1', productName: 'Linen shirt, white, size L', quantity: 1, reason: 'WRONG_SIZE', unitPricePaise: 129900 },
    { returnItemId: 'RET-2026-04817-2', orderItemId: 'x2', productName: 'Ceramic mug set', quantity: 1, reason: 'DAMAGED', unitPricePaise: 64900 },
  ],
  history: [{ status: 'REQUESTED', at: t(2) }, { status: 'APPROVED', at: t(2) }, { status: 'IN_TRANSIT', at: t(1) }],
}
