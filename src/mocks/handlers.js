import { delay, http, HttpResponse } from 'msw'
import {
  CATEGORIES, STAFF_PASSWORD, STAFF_USERS, addDays, ago, audit, createReturn, db, eligibility, execute,
  findLine, findOrder, inspect, istDate, orderFromToken, transition,
} from './db'
import { makeQrPng } from './qr'

// MSW handlers that fake the Spring Boot API (`/api/v1/...`). Errors are RFC 7807 ProblemDetail with `code`.
const V1 = '*/api/v1'

const TITLES = {
  ORDER_NOT_FOUND: 'Order not found', RETURN_NOT_FOUND: 'Return not found', REFUND_NOT_FOUND: 'Refund not found',
  UNAUTHORIZED: 'Authentication required', ITEM_NOT_RETURNABLE: 'Item not returnable', VALIDATION_FAILED: 'Validation failed',
  PHOTO_INVALID: 'Photo invalid', LABEL_INVALID: 'Label invalid', INVALID_TRANSITION: 'Invalid transition',
  RATE_LIMITED: 'Too many requests', FORBIDDEN: 'Forbidden',
}
const STATUS = {
  ORDER_NOT_FOUND: 404, RETURN_NOT_FOUND: 404, REFUND_NOT_FOUND: 404, UNAUTHORIZED: 401, ITEM_NOT_RETURNABLE: 422,
  VALIDATION_FAILED: 400, PHOTO_INVALID: 400, LABEL_INVALID: 400, INVALID_TRANSITION: 409, RATE_LIMITED: 429, FORBIDDEN: 403,
}

export const problem = (code, detail, extra = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: TITLES[code] ?? code, status: STATUS[code] ?? 400, detail, code, ...extra },
    { status: STATUS[code] ?? 400, headers: { 'Content-Type': 'application/problem+json' } },
  )

// Feels like a network in the browser; instant under Vitest.
const wait = (ms = 300) => (import.meta.env?.MODE === 'test' ? undefined : delay(ms))

// ---- auth ----

function staffUser(request) {
  const h = request.headers.get('Authorization') ?? ''
  if (!h.startsWith('Basic ')) return null
  try {
    const [user, ...rest] = atob(h.slice(6)).split(':')
    return STAFF_USERS[user] && rest.join(':') === STAFF_PASSWORD ? { username: user, role: STAFF_USERS[user] } : null
  } catch {
    return null
  }
}

/** Returns a 401/403 response, or null when the caller has the role. */
function guard(request, role) {
  const user = staffUser(request)
  if (!user) return problem('UNAUTHORIZED', 'Please sign in to continue.')
  if (role && user.role !== role) return problem('FORBIDDEN', 'You don\'t have access to this resource.')
  return null
}

/** The order a customer bearer token is scoped to, or null. */
function customerOrder(request) {
  const h = request.headers.get('Authorization') ?? ''
  if (!h.startsWith('Bearer ')) return null
  return findOrder(orderFromToken(h.slice(7).trim())) ?? null
}
const expired = () => problem('UNAUTHORIZED', 'Your session has expired. Please look up your order again.')

// ---- views ----

const STEPS = ['Requested', 'Approved', 'In transit', 'Received', 'Inspected', 'Refunded']
const stepIndex = (s) =>
  ({ REQUESTED: 0, PENDING_REVIEW: 0, APPROVED: 1, IN_TRANSIT: 2, RECEIVED: 3, INSPECTED: 4, AWAITING_FINANCE: 4, REFUND_IN_PROGRESS: 4, REFUNDED: 5 })[s] ?? -1
const statusLabel = (s) => (s === 'REJECTED' ? 'Rejected' : s === 'CANCELLED' ? 'Cancelled' : STEPS[stepIndex(s)])
const NOTE = { PENDING_REVIEW: 'Under review', AWAITING_FINANCE: 'Awaiting refund approval', REFUND_IN_PROGRESS: 'Refund processing' }
const LABEL_AVAILABLE = ['APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'AWAITING_FINANCE', 'REFUND_IN_PROGRESS', 'REFUNDED']

const history = (rec) => db.audit.filter((a) => a.entityType === 'RETURN' && a.entityId === rec.id)

/** Mirrors the backend's Timeline.build. */
function timeline(rec) {
  const reached = []
  let closing = null
  for (const a of history(rec)) {
    if (!a.toState) continue
    const i = stepIndex(a.toState)
    if (i >= 0 && !reached[i]) reached[i] = a.createdAt
    if (a.toState === 'REJECTED' || a.toState === 'CANCELLED') closing = a
  }
  if (rec.status === 'REJECTED' || rec.status === 'CANCELLED') {
    const out = []
    for (let i = 0; i < STEPS.length && reached[i]; i++) out.push({ step: STEPS[i], state: 'done', at: reached[i], note: null })
    out.push({ step: statusLabel(rec.status), state: 'failed', at: closing?.createdAt ?? null, note: closing?.details ?? null })
    return out
  }
  const current = stepIndex(rec.status)
  return STEPS.map((step, i) =>
    i < current || rec.status === 'REFUNDED'
      ? { step, state: 'done', at: reached[i] ?? null, note: null }
      : i === current
        ? { step, state: 'current', at: reached[i] ?? null, note: NOTE[rec.status] ?? null }
        : { step, state: 'pending', at: null, note: null },
  )
}

function toReturnDto(rec) {
  return {
    rma: rec.rma,
    orderNumber: rec.orderNumber,
    status: rec.status,
    statusLabel: statusLabel(rec.status),
    refundMethod: rec.refundMethod,
    labelCode: LABEL_AVAILABLE.includes(rec.status) ? rec.labelCode : null,
    createdAt: rec.createdAt,
    totalRefundPaise: rec.totalRefundPaise,
    items: rec.items.map((i) => {
      const l = findLine(rec.orderNumber, i.orderLineId)
      return {
        returnItemId: i.id, orderLineId: i.orderLineId, sku: l.sku, productName: l.productName, unitPricePaise: l.unitPricePaise,
        quantity: i.qty, reasonCode: i.reasonCode, reasonText: i.reasonText, photoCount: i.photoCount,
        conditionGrade: i.conditionGrade, decision: i.decision, acceptedQty: i.acceptedQty, refundPaise: i.refundPaise,
      }
    }),
    timeline: timeline(rec),
  }
}

const refundOf = (rec) => [...db.refunds.values()].find((r) => r.returnId === rec.id) ?? null
const returnOfRefund = (refund) => [...db.returns.values()].find((r) => r.id === refund.returnId)

function toWarehouseView(rec) {
  return {
    returnId: rec.id,
    rma: rec.rma,
    orderNumber: rec.orderNumber,
    status: rec.status,
    refundMethod: rec.refundMethod,
    totalRefundPaise: rec.totalRefundPaise,
    items: rec.items.map((i) => {
      const l = findLine(rec.orderNumber, i.orderLineId)
      return {
        itemId: i.id, orderLineId: i.orderLineId, sku: l.sku, productName: l.productName, requestedQty: i.qty,
        unitPricePaise: l.unitPricePaise, reasonCode: i.reasonCode, reasonText: i.reasonText, photoCount: i.photoCount,
        conditionGrade: i.conditionGrade, decision: i.decision, acceptedQty: i.acceptedQty, refundPaise: i.refundPaise,
        inspectionNote: i.inspectionNote,
      }
    }),
    refund: refundOf(rec) ? { ...refundOf(rec) } : null,
  }
}

function toFinanceDetail(refund) {
  const rec = returnOfRefund(refund)
  const view = toWarehouseView(rec)
  return {
    refund: { ...refund },
    returnId: rec.id,
    rma: rec.rma,
    orderNumber: rec.orderNumber,
    returnStatus: rec.status,
    flagged: rec.flagged,
    flagReason: rec.flagged ? (history(rec).find((a) => a.toState === 'PENDING_REVIEW')?.details ?? null) : null,
    requestedAt: rec.createdAt,
    items: view.items,
  }
}

/**
 * Minimal multipart/form-data reader: text fields, plus name/filename/type/size of file parts.
 * Done by hand because request.formData() is unreliable under jsdom (its File class replaces Node's).
 */
async function readMultipart(request) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(request.headers.get('content-type') ?? '')
  if (!boundary) return { fields: {}, files: [] }
  const bytes = new Uint8Array(await request.arrayBuffer())
  const raw = new TextDecoder('latin1').decode(bytes) // one char per byte, so indexes are byte offsets
  const utf8 = (from, to) => new TextDecoder().decode(bytes.subarray(from, to))
  const delimiter = `--${boundary[1] ?? boundary[2]}`
  const fields = {}
  const files = []
  let at = raw.indexOf(delimiter)
  while (at !== -1) {
    const start = at + delimiter.length
    if (raw.startsWith('--', start)) break
    const next = raw.indexOf(delimiter, start)
    if (next === -1) break
    const headerEnd = raw.indexOf('\r\n\r\n', start)
    const head = raw.slice(start, headerEnd)
    const bodyStart = headerEnd + 4
    const bodyEnd = next - 2 // strip the CRLF before the next delimiter
    const name = /name="([^"]*)"/i.exec(head)?.[1]
    const filename = /filename="([^"]*)"/i.exec(head)?.[1]
    const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim() ?? ''
    if (filename !== undefined) files.push({ name, filename, type, size: bodyEnd - bodyStart, text: () => utf8(bodyStart, bodyEnd) })
    else fields[name] = utf8(bodyStart, bodyEnd)
    at = next
  }
  return { fields, files }
}

const invalid = (detail, current) => problem('INVALID_TRANSITION', detail, current ? { currentStatus: current } : {})
const rmaParam = (params) => String(params.rma ?? '').toUpperCase()

export const handlers = [
  // ---- customer ----
  http.post(`${V1}/customer/session`, async ({ request }) => {
    await wait(500)
    const now = Date.now()
    db.lookupFailures = db.lookupFailures.filter((t) => now - t < 60_000)
    if (db.lookupFailures.length >= 5) return problem('RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.')
    const { orderNumber, email } = (await request.json().catch(() => ({}))) ?? {}
    const order = findOrder(orderNumber)
    if (!order || order.email !== String(email ?? '').trim().toLowerCase()) {
      db.lookupFailures.push(now)
      return problem('ORDER_NOT_FOUND', "We couldn't find an order matching those details.")
    }
    return HttpResponse.json({
      accessToken: `mock-session:${order.orderNumber}:${db.sessionSeq++}`,
      expiresAt: new Date(now + 2 * 3_600_000).toISOString(),
    })
  }),

  http.get(`${V1}/customer/orders/:orderNumber`, async ({ request, params }) => {
    await wait(400)
    const order = customerOrder(request)
    if (!order) return expired()
    if (order.orderNumber !== String(params.orderNumber).toUpperCase()) return problem('ORDER_NOT_FOUND', "We couldn't find an order matching those details.")
    return HttpResponse.json({
      orderNumber: order.orderNumber,
      orderedAt: order.orderedAt,
      deliveredAt: order.deliveredAt,
      lines: order.lines.map((l) => ({
        orderLineId: l.id, sku: l.sku, productName: l.productName, category: l.category, quantity: l.quantity,
        unitPricePaise: l.unitPricePaise, eligibility: eligibility(order, l),
      })),
    })
  }),

  http.post(`${V1}/customer/returns`, async ({ request }) => {
    await wait(800)
    const order = customerOrder(request)
    if (!order) return expired()
    const form = await readMultipart(request)
    const part = form.fields.request ?? form.files.find((f) => f.name === 'request')?.text()
    let body
    try {
      body = JSON.parse(part)
    } catch {
      return problem('VALIDATION_FAILED', 'The request is missing a part or has an invalid value.')
    }
    if (findOrder(body.orderNumber) !== order) return problem('ORDER_NOT_FOUND', "We couldn't find an order matching those details.")

    const key = request.headers.get('Idempotency-Key')
    const replayKey = key && `${order.orderNumber}:${key}`
    if (replayKey && db.idempotency.has(replayKey)) {
      return HttpResponse.json(toReturnDto(db.returns.get(db.idempotency.get(replayKey))), { status: 201, headers: { 'Idempotent-Replayed': 'true' } })
    }

    const items = body.items ?? []
    if (!items.length || !body.refundMethod) return problem('VALIDATION_FAILED', 'Some fields need your attention.')
    for (const i of items) {
      if (!order.lines.some((l) => l.id === Number(i.orderLineId))) return problem('VALIDATION_FAILED', `Item ${i.orderLineId} is not part of this order.`)
      if (i.reasonCode === 'OTHER' && !i.reasonText?.trim()) return problem('VALIDATION_FAILED', `Please tell us why you're returning item ${i.orderLineId}.`)
    }
    const photos = {}
    for (const file of form.files) {
      if (!file.name.startsWith('photos_')) continue
      if (!['image/jpeg', 'image/png'].includes(file.type)) return problem('PHOTO_INVALID', 'Photos must be JPEG or PNG images.')
      if (file.size > 5 * 1024 * 1024) return problem('PHOTO_INVALID', 'Each photo must be 5 MB or smaller.')
      photos[file.name.slice(7)] = (photos[file.name.slice(7)] ?? 0) + 1
    }
    const refusals = []
    for (const i of items) {
      const e = eligibility(order, order.lines.find((l) => l.id === Number(i.orderLineId)))
      if (!e.eligible) refusals.push({ orderLineId: Number(i.orderLineId), code: e.code, message: e.message })
      else if (i.qty > e.returnableQty) {
        refusals.push({ orderLineId: Number(i.orderLineId), code: 'QUANTITY_EXCEEDED', message: `Only ${e.returnableQty} units of this item can be returned.` })
      }
    }
    if (refusals.length) return problem('ITEM_NOT_RETURNABLE', "Some items in your request can't be returned.", { items: refusals })

    const recent = [...db.returns.values()].filter(
      (r) => r.customerId === order.customerId && r.status !== 'CANCELLED' && Date.now() - Date.parse(r.createdAt) < 30 * 86_400_000,
    ).length + 1
    const flagged = recent > 3
    const rec = createReturn({
      orderNumber: order.orderNumber,
      refundMethod: body.refundMethod,
      flagged,
      flagReason: `Customer has ${recent} return requests in the last 30 days; manual review required`,
      items: items.map((i) => ({ ...i, photoCount: photos[String(i.orderLineId)] ?? 0 })),
    })
    if (replayKey) db.idempotency.set(replayKey, rec.rma)
    return HttpResponse.json(toReturnDto(rec), { status: 201, headers: { Location: `/api/v1/customer/returns/${rec.rma}` } })
  }),

  http.get(`${V1}/customer/returns/:rma/label/qr.png`, async ({ request, params }) => {
    const order = customerOrder(request)
    if (!order) return expired()
    const rec = db.returns.get(rmaParam(params))
    if (!rec || rec.orderNumber !== order.orderNumber) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    const bytes = Uint8Array.from(atob(makeQrPng(rec.labelCode)), (c) => c.charCodeAt(0))
    return new HttpResponse(bytes, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
  }),

  http.get(`${V1}/customer/returns/:rma/label`, async ({ request, params }) => {
    await wait()
    const order = customerOrder(request)
    if (!order) return expired()
    const rec = db.returns.get(rmaParam(params))
    if (!rec || rec.orderNumber !== order.orderNumber) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    if (!LABEL_AVAILABLE.includes(rec.status)) {
      return invalid(
        rec.status === 'REQUESTED' || rec.status === 'PENDING_REVIEW' ? 'Your return label will be available once your return is approved.' : 'This return no longer has an active label.',
        rec.status,
      )
    }
    return HttpResponse.json({
      rma: rec.rma,
      labelCode: rec.labelCode,
      qrCodeUrl: `/api/v1/customer/returns/${rec.rma}/label/qr.png`,
      instructions: 'Print this label and attach it to the parcel, or show the QR code at the drop-off point.',
    })
  }),

  http.get(`${V1}/customer/returns/:rma`, async ({ request, params }) => {
    await wait(400)
    const order = customerOrder(request)
    if (!order) return expired()
    const rec = db.returns.get(rmaParam(params))
    if (!rec || rec.orderNumber !== order.orderNumber) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    return HttpResponse.json(toReturnDto(rec))
  }),

  http.post(`${V1}/customer/returns/:rma/:action`, async ({ request, params }) => {
    await wait(500)
    const order = customerOrder(request)
    if (!order) return expired()
    const rec = db.returns.get(rmaParam(params))
    if (!rec || rec.orderNumber !== order.orderNumber) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    const actor = `customer:${order.customerId}`
    if (params.action === 'ship') {
      if (rec.status !== 'IN_TRANSIT') {
        if (rec.status !== 'APPROVED') return invalid(`A return that is ${rec.status} can't move to IN_TRANSIT.`, rec.status)
        transition(rec, 'IN_TRANSIT', actor, 'Customer handed the parcel to the carrier')
      }
    } else if (params.action === 'cancel') {
      if (rec.status !== 'CANCELLED') {
        if (!['REQUESTED', 'PENDING_REVIEW', 'APPROVED'].includes(rec.status)) return invalid(`A return that is ${rec.status} can't be cancelled.`, rec.status)
        transition(rec, 'CANCELLED', actor, 'Cancelled by customer')
      }
    } else {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(toReturnDto(rec))
  }),

  // ---- staff identity ----
  http.get(`${V1}/staff/me`, async ({ request }) => {
    await wait()
    const user = staffUser(request)
    if (!user) return problem('UNAUTHORIZED', 'Please sign in to continue.')
    return HttpResponse.json(user)
  }),

  // ---- warehouse ----
  http.get(`${V1}/warehouse/labels/:code`, async ({ request, params }) => {
    await wait()
    const denied = guard(request, 'WAREHOUSE')
    if (denied) return denied
    const rec = [...db.returns.values()].find((r) => r.labelCode === String(params.code).trim())
    if (!rec) return problem('LABEL_INVALID', "This label isn't valid. Check you scanned the right parcel.")
    return HttpResponse.json(toWarehouseView(rec))
  }),

  http.post(`${V1}/warehouse/labels/decode`, async ({ request }) => {
    await wait(600)
    const denied = guard(request, 'WAREHOUSE')
    if (denied) return denied
    const image = (await readMultipart(request)).files.find((f) => f.name === 'image')
    if (!image || !image.size) return problem('LABEL_INVALID', 'Upload a photo of the label.')
    // The fake can't read images: it "decodes" the first parcel that is on its way.
    const rec = [...db.returns.values()].find((r) => r.status === 'IN_TRANSIT')
    if (!rec) return problem('LABEL_INVALID', 'No QR code was found in that image.')
    return HttpResponse.json({ labelCode: rec.labelCode, rma: rec.rma })
  }),

  http.get(`${V1}/warehouse/returns/:rma`, async ({ request, params }) => {
    await wait()
    const denied = guard(request, 'WAREHOUSE')
    if (denied) return denied
    const rec = db.returns.get(rmaParam(params))
    if (!rec) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    return HttpResponse.json(toWarehouseView(rec))
  }),

  http.post(`${V1}/warehouse/returns/:rma/receive`, async ({ request, params }) => {
    await wait()
    const denied = guard(request, 'WAREHOUSE')
    if (denied) return denied
    const rec = db.returns.get(rmaParam(params))
    if (!rec) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    const text = await request.text()
    const labelCode = text ? JSON.parse(text).labelCode : null
    if (labelCode && labelCode !== rec.labelCode) return problem('LABEL_INVALID', 'This label belongs to a different return.')
    if (rec.status !== 'RECEIVED') {
      if (rec.status !== 'IN_TRANSIT') return invalid(`A return that is ${rec.status} can't move to RECEIVED.`, rec.status)
      transition(rec, 'RECEIVED', `staff:${staffUser(request).username}`, 'Parcel received at the warehouse')
    }
    return HttpResponse.json(toWarehouseView(rec))
  }),

  http.post(`${V1}/warehouse/returns/:rma/inspection`, async ({ request, params }) => {
    await wait(600)
    const denied = guard(request, 'WAREHOUSE')
    if (denied) return denied
    const rec = db.returns.get(rmaParam(params))
    if (!rec) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    if (rec.status !== 'RECEIVED') return invalid(`Only received returns can be inspected. This return is ${rec.status}.`, rec.status)
    const { items = [] } = await request.json()
    const ids = items.map((i) => Number(i.itemId))
    if (new Set(ids).size !== ids.length || ids.length !== rec.items.length || !rec.items.every((i) => ids.includes(i.id))) {
      return problem('VALIDATION_FAILED', 'Inspect every item in the return exactly once.')
    }
    for (const v of items) {
      const item = rec.items.find((i) => i.id === Number(v.itemId))
      if (!['A', 'B', 'C'].includes(v.grade) || !['ACCEPTED', 'REJECTED'].includes(v.decision)) return problem('VALIDATION_FAILED', 'Some fields need your attention.')
      if (v.decision === 'REJECTED' && v.acceptedQty) return problem('VALIDATION_FAILED', `A rejected item can't have accepted units (item ${item.id}).`)
      if (v.acceptedQty != null && v.decision === 'ACCEPTED' && (v.acceptedQty < 1 || v.acceptedQty > item.qty)) {
        return problem('VALIDATION_FAILED', `Accepted quantity for item ${item.id} must be between 1 and ${item.qty}.`)
      }
    }
    const refund = inspect(rec, items, `staff:${staffUser(request).username}`)
    if (refund && refund.status === 'PENDING') execute(refund)
    return HttpResponse.json(toWarehouseView(rec))
  }),

  // ---- finance ----
  http.get(`${V1}/finance/refunds/:id`, async ({ request, params }) => {
    await wait()
    const denied = guard(request, 'FINANCE')
    if (denied) return denied
    const refund = db.refunds.get(Number(params.id))
    if (!refund) return problem('REFUND_NOT_FOUND', 'Refund not found.')
    return HttpResponse.json(toFinanceDetail(refund))
  }),

  http.get(`${V1}/finance/refunds`, async ({ request }) => {
    await wait()
    const denied = guard(request, 'FINANCE')
    if (denied) return denied
    const status = new URL(request.url).searchParams.get('status')
    const list = [...db.refunds.values()]
      .filter((r) => !status || r.status === status)
      .sort((a, b) => (status ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)))
    return HttpResponse.json(list.map((r) => ({ ...r })))
  }),

  http.post(`${V1}/finance/refunds/:id/:action`, async ({ request, params }) => {
    await wait(900)
    const denied = guard(request, 'FINANCE')
    if (denied) return denied
    const refund = db.refunds.get(Number(params.id))
    if (!refund) return problem('REFUND_NOT_FOUND', 'Refund not found.')
    const rec = returnOfRefund(refund)
    const actor = `staff:${staffUser(request).username}`
    const conflict = (msg) => invalid(msg, refund.status)

    if (params.action === 'approve') {
      if (refund.status === 'AWAITING_APPROVAL') {
        Object.assign(refund, { status: 'PENDING', approvedBy: actor, approvedAt: new Date().toISOString() })
        audit('REFUND', refund.id, 'APPROVED', 'AWAITING_APPROVAL', 'PENDING', actor, 'Approved by finance')
        transition(rec, 'REFUND_IN_PROGRESS', actor, 'Refund approved by finance')
        execute(refund)
      } else if (refund.status === 'REJECTED') return conflict('This refund has already been rejected.')
      else if (refund.status === 'FAILED') return conflict('This refund failed. Use retry instead.')
    } else if (params.action === 'reject') {
      const reason = (await request.json().catch(() => ({})))?.reason?.trim()
      if (!reason) return problem('VALIDATION_FAILED', 'Some fields need your attention.', { errors: [{ field: 'reason', message: 'must not be blank' }] })
      if (refund.status === 'AWAITING_APPROVAL') {
        Object.assign(refund, { status: 'REJECTED', lastError: reason, updatedAt: new Date().toISOString() })
        audit('REFUND', refund.id, 'REJECTED', 'AWAITING_APPROVAL', 'REJECTED', actor, `Refund rejected by finance: ${reason}`)
        transition(rec, 'REJECTED', actor, `Refund rejected by finance: ${reason}`)
      } else if (refund.status !== 'REJECTED') return conflict('This refund has already been approved and can\'t be rejected.')
    } else if (params.action === 'retry') {
      if (refund.status === 'AWAITING_APPROVAL') return conflict('Approve this refund before retrying it.')
      if (refund.status === 'REJECTED') return conflict('This refund was rejected and can\'t be retried.')
      if (['FAILED', 'UNKNOWN', 'PENDING'].includes(refund.status)) {
        audit('REFUND', refund.id, 'RETRY', refund.status, 'PENDING', actor, 'Retried by finance')
        execute(refund)
      }
    } else {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json({ ...refund })
  }),

  http.get(`${V1}/finance/ledger`, async ({ request }) => {
    await wait()
    const denied = guard(request, 'FINANCE')
    if (denied) return denied
    const qs = new URL(request.url).searchParams
    const to = qs.get('to') || istDate()
    const from = qs.get('from') || addDays(to, -29)
    if (from > to) return problem('VALIDATION_FAILED', '"from" must be on or before "to".')
    const entries = db.ledger.filter((e) => istDate(e.createdAt) >= from && istDate(e.createdAt) <= to)
    const sum = (dir) => entries.filter((e) => e.direction === dir).reduce((s, e) => s + e.amountPaise, 0)
    const totalDebitPaise = sum('DEBIT')
    const totalCreditPaise = sum('CREDIT')
    return HttpResponse.json({ from, to, entries, totalDebitPaise, totalCreditPaise, balanced: totalDebitPaise === totalCreditPaise })
  }),

  // ---- manager ----
  http.get(`${V1}/manager/dashboard`, async ({ request }) => {
    await wait(700)
    const denied = guard(request, 'MANAGER')
    if (denied) return denied
    const to = istDate()
    const counts = {}
    for (const r of db.returns.values()) if (r.status !== 'CANCELLED') for (const i of r.items) counts[i.reasonCode] = (counts[i.reasonCode] ?? 0) + 1
    const sold = { Apparel: 420, Beauty: 180, Electronics: 260, Home: 310, Innerwear: 90, Perishables: 70 }
    const returned = { Apparel: 46, Beauty: 9, Electronics: 31, Home: 22, Innerwear: 0, Perishables: 0 }
    return HttpResponse.json({
      from: addDays(to, -29),
      to,
      returnRateByCategory: Object.keys(sold).map((category) => ({
        category, returnable: CATEGORIES[category].returnable, soldUnits: sold[category], returnedUnits: returned[category],
        returnRate: Number((returned[category] / sold[category]).toFixed(4)),
      })),
      topReasons: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([reasonCode, count]) => ({ reasonCode, count })),
      cycleTime: { closedReturns: 48, averageHours: 61.5 },
      flaggedCustomers: [
        { customerId: 2, maskedEmail: 'r***@example.com', activeFlags: 2, highestReturnCount: 5, lastFlaggedAt: ago(0, 6) },
        { customerId: 7, maskedEmail: 's***@example.com', activeFlags: 1, highestReturnCount: 4, lastFlaggedAt: ago(6) },
      ],
    })
  }),

  http.get(`${V1}/manager/reviews`, async ({ request }) => {
    await wait()
    const denied = guard(request, 'MANAGER')
    if (denied) return denied
    const list = [...db.returns.values()]
      .filter((r) => r.status === 'PENDING_REVIEW')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => ({
        returnId: r.id, rma: r.rma, orderNumber: r.orderNumber, customerId: r.customerId, requestedAt: r.createdAt,
        itemCount: r.items.length, units: r.items.reduce((s, i) => s + i.qty, 0), refundMethod: r.refundMethod,
        flagReason: history(r).find((a) => a.toState === 'PENDING_REVIEW')?.details ?? null,
      }))
    return HttpResponse.json(list)
  }),

  http.post(`${V1}/manager/reviews/:rma/:action`, async ({ request, params }) => {
    await wait(500)
    const denied = guard(request, 'MANAGER')
    if (denied) return denied
    const rec = db.returns.get(rmaParam(params))
    if (!rec) return problem('RETURN_NOT_FOUND', "We couldn't find that return.")
    const target = params.action === 'reject' ? 'REJECTED' : 'APPROVED'
    let details = 'Approved after manager review'
    if (target === 'REJECTED') {
      const reason = (await request.json().catch(() => ({})))?.reason?.trim()
      if (!reason) return problem('VALIDATION_FAILED', 'Some fields need your attention.', { errors: [{ field: 'reason', message: 'must not be blank' }] })
      details = `Rejected after manager review: ${reason}`
    }
    if (rec.status === 'PENDING_REVIEW') transition(rec, target, 'staff:manager', details)
    else if (rec.status !== target) return invalid('This return is no longer awaiting review.', rec.status)
    return HttpResponse.json(toReturnDto(rec))
  }),

  http.get(`${V1}/manager/audit`, async ({ request }) => {
    await wait()
    const denied = guard(request, 'MANAGER')
    if (denied) return denied
    const entityId = new URL(request.url).searchParams.get('entityId')?.trim()
    if (!entityId) return problem('VALIDATION_FAILED', 'The request is missing a part or has an invalid value.')
    return HttpResponse.json(db.audit.filter((a) => a.entityId === entityId))
  }),

  // ---- admin: gateway fault injection ----
  http.get(`${V1}/admin/gateway/faults`, async ({ request }) => {
    const denied = guard(request, 'MANAGER')
    if (denied) return denied
    return HttpResponse.json({ ...db.faults })
  }),

  http.put(`${V1}/admin/gateway/faults`, async ({ request }) => {
    await wait()
    const denied = guard(request, 'MANAGER')
    if (denied) return denied
    const { mode, latencyMs = 0 } = (await request.json().catch(() => ({}))) ?? {}
    const modes = ['NONE', 'FAIL', 'TIMEOUT', 'SLOW', 'FAIL_AFTER_CHARGE', 'DECLINE']
    if (!modes.includes(mode) || !Number.isInteger(latencyMs ?? 0) || latencyMs < 0 || latencyMs > 60_000) {
      return problem('VALIDATION_FAILED', 'Some fields need your attention.')
    }
    db.faults = { mode, latencyMs: latencyMs ?? 0 }
    audit('GATEWAY', 'faults', 'FAULTS_CHANGED', null, mode, 'staff:manager', `Gateway fault mode ${mode}, latency ${latencyMs} ms`)
    return HttpResponse.json({ ...db.faults })
  }),
]
