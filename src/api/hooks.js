import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API, request } from './client'
import { setCustomerSession } from '../auth/customerSession'
import { isFinal } from '../domain/returnStatus'

/**
 * Customer hooks for the Spring Boot API (`/api/v1/customer/*`, see system/LLD.md §3.4).
 * Responses are adapted into the view models below, which the screens use. Money is integer paise.
 *
 * @typedef {'ORIGINAL_PAYMENT'|'STORE_CREDIT'} RefundMethod
 * @typedef {'DAMAGED'|'DEFECTIVE'|'WRONG_ITEM'|'WRONG_SIZE'|'NOT_AS_DESCRIBED'|'CHANGED_MIND'|'OTHER'} ReturnReason
 * @typedef {'ELIGIBLE'|'CATEGORY_NOT_RETURNABLE'|'NOT_DELIVERED'|'WINDOW_EXPIRED'|'ALREADY_IN_RETURN'} ReasonCode
 *
 * @typedef {{ orderId: string, orderNumber: string }} OrderSummary  orderId is the order number (the token is scoped to it)
 * @typedef {{ orderItemId: string, productName: string, sku: string, category: string,
 *   unitPricePaise: number, quantity: number, returnableQuantity: number,
 *   eligible: boolean, reasonCode: ReasonCode, message: string, deadline: string|null, daysLeft: number|null }} EligibilityItem
 * @typedef {{ orderId: string, orderNumber: string, placedAt: string, deliveredAt: string|null, items: EligibilityItem[] }} Eligibility
 * @typedef {{ orderLineId: number, qty: number, reasonCode: ReturnReason, reasonText?: string }} CreateReturnItem
 * @typedef {{ orderNumber: string, refundMethod: RefundMethod, items: CreateReturnItem[] }} CreateReturnBody
 * @typedef {'AWAITING_INSPECTION'|'ACCEPTED'|'REJECTED'} ItemStatus
 * @typedef {'A'|'B'|'C'} Grade
 * @typedef {{ returnItemId: string, orderLineId: number, productName: string, sku: string|null, quantity: number,
 *   reason: ReturnReason, reasonNote: string|null, unitPricePaise: number, photoCount: number,
 *   status: ItemStatus, grade: Grade|null, acceptedQty: number|null, refundPaise: number|null }} ReturnDetailItem
 * @typedef {{ status: string, at: string }} StatusEvent
 * @typedef {{ step: string, state: 'done'|'current'|'pending'|'failed', at: string|null, note: string|null }} TimelineEntry
 * @typedef {{ returnId: string, orderNumber: string, status: string, statusLabel: string, refundMethod: RefundMethod,
 *   labelCode: string|null, createdAt: string, estimatedRefundPaise: number, totalRefundPaise: number|null,
 *   refundedPaise: number|null, closingNote: string|null, items: ReturnDetailItem[], events: StatusEvent[],
 *   timeline: TimelineEntry[] }} ReturnDetail  returnId is the RMA, e.g. RMA-100001
 * @typedef {{ rma: string, labelCode: string, instructions: string, qrPng: Blob }} ReturnLabel
 */

/** The customer status page refreshes every 15 s. TanStack pauses it while the tab is hidden. */
export const POLL_MS = 15_000

export const queryKeys = {
  eligibility: (orderNumber) => ['orders', orderNumber, 'eligibility'],
  return: (rma) => ['returns', rma],
  label: (rma) => ['returns', rma, 'label'],
}

const enc = encodeURIComponent

// ---- adapters -------------------------------------------------------------------------------

/** Today's date in Asia/Kolkata as YYYY-MM-DD (the backend's business zone). */
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

/** Whole days from today (IST) until an ISO date such as "2026-12-01"; 0 means the last day. */
export function daysLeftUntil(isoDate) {
  if (!isoDate) return null
  return Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${todayIST()}T00:00:00Z`)) / 86_400_000)
}

/** Backend order (GET /customer/orders/{n}) → eligibility view model. */
export function toEligibility(order) {
  return {
    orderId: order.orderNumber,
    orderNumber: order.orderNumber,
    placedAt: order.orderedAt,
    deliveredAt: order.deliveredAt ?? null,
    items: order.lines.map((l) => {
      const e = l.eligibility ?? {}
      return {
        orderItemId: String(l.orderLineId),
        productName: l.productName,
        sku: l.sku,
        category: l.category,
        unitPricePaise: l.unitPricePaise,
        quantity: l.quantity,
        returnableQuantity: e.returnableQty ?? 0,
        eligible: Boolean(e.eligible),
        reasonCode: e.code,
        message: e.message ?? '',
        deadline: e.deadline ?? null,
        daysLeft: e.eligible ? daysLeftUntil(e.deadline) : null,
      }
    }),
  }
}

/** Customer timeline step label → backend status used by buildTimeline. */
const STEP_STATUS = {
  Requested: 'REQUESTED',
  Approved: 'APPROVED',
  'In transit': 'IN_TRANSIT',
  Received: 'RECEIVED',
  Inspected: 'INSPECTED',
  Refunded: 'REFUNDED',
  Rejected: 'REJECTED',
  Cancelled: 'CANCELLED',
}

/** Backend ReturnDto → status page view model. */
export function toReturnDetail(dto) {
  const timeline = dto.timeline ?? []
  const items = (dto.items ?? []).map((i) => ({
    returnItemId: String(i.returnItemId),
    orderLineId: i.orderLineId,
    productName: i.productName ?? `Item ${i.orderLineId}`,
    sku: i.sku ?? null,
    quantity: i.quantity,
    reason: i.reasonCode,
    reasonNote: i.reasonText ?? null,
    unitPricePaise: i.unitPricePaise ?? 0,
    photoCount: i.photoCount ?? 0,
    status: i.decision ?? 'AWAITING_INSPECTION',
    grade: i.conditionGrade ?? null,
    acceptedQty: i.acceptedQty ?? null,
    refundPaise: i.refundPaise ?? null,
  }))
  return {
    returnId: dto.rma,
    orderNumber: dto.orderNumber,
    status: dto.status,
    statusLabel: dto.statusLabel,
    refundMethod: dto.refundMethod,
    labelCode: dto.labelCode ?? null,
    createdAt: dto.createdAt,
    estimatedRefundPaise: items.reduce((s, i) => s + i.unitPricePaise * i.quantity, 0),
    totalRefundPaise: dto.totalRefundPaise ?? null,
    refundedPaise: dto.status === 'REFUNDED' ? (dto.totalRefundPaise ?? null) : null,
    // Why a return was rejected or cancelled (the audit note on the final "failed" step).
    closingNote: timeline.find((t) => t.state === 'failed')?.note ?? null,
    items,
    events: timeline.filter((t) => t.at).map((t) => ({ status: STEP_STATUS[t.step] ?? t.step, at: t.at })),
    timeline,
  }
}

// ---- customer ----

/**
 * Order lookup: opens an order-scoped customer session (2 h bearer token).
 * Any miss is a generic 404 ORDER_NOT_FOUND; repeated misses get 429 RATE_LIMITED.
 * @returns {import('@tanstack/react-query').UseMutationResult<OrderSummary, Error, {orderNumber: string, email: string}>}
 */
export function useOrderLookup() {
  return useMutation({
    mutationFn: async ({ orderNumber, email }) => {
      const s = await request(`${API}/customer/session`, { method: 'POST', body: { orderNumber, email }, auth: 'none' })
      setCustomerSession({ accessToken: s.accessToken, expiresAt: s.expiresAt, orderNumber })
      return { orderId: orderNumber, orderNumber }
    },
    meta: { silent: true }, // the form shows its own generic message
  })
}

/** Order lines with per-line return eligibility. @param {string|undefined} orderNumber @returns {import('@tanstack/react-query').UseQueryResult<Eligibility>} */
export function useEligibility(orderNumber) {
  return useQuery({
    queryKey: queryKeys.eligibility(orderNumber),
    queryFn: async ({ signal }) => toEligibility(await request(`${API}/customer/orders/${enc(orderNumber)}`, { signal })),
    enabled: Boolean(orderNumber),
    staleTime: 0,
    meta: { silent: true },
  })
}

/**
 * Creates the return in one multipart request: a JSON part `request` plus up to 3 photo parts per item
 * named `photos_{orderLineId}`. The Idempotency-Key makes a retried submit return the same return.
 * @returns {import('@tanstack/react-query').UseMutationResult<ReturnDetail, Error,
 *   {body: CreateReturnBody, photos: Record<string, File[]>, idempotencyKey: string}>}
 */
export function useCreateReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ body, photos = {}, idempotencyKey }) => {
      const form = new FormData()
      form.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }))
      for (const [orderLineId, files] of Object.entries(photos)) {
        for (const f of files ?? []) form.append(`photos_${orderLineId}`, f, f.name)
      }
      return toReturnDetail(await request(`${API}/customer/returns`, { method: 'POST', formData: form, idempotencyKey }))
    },
    onSuccess: (ret) => {
      qc.setQueryData(queryKeys.return(ret.returnId), ret)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    meta: { silent: true }, // the review step shows its own error
  })
}

/**
 * Return detail with its timeline, polled every 15 s until the return reaches a final status.
 * @param {string} rma @returns {import('@tanstack/react-query').UseQueryResult<ReturnDetail>}
 */
export function useReturn(rma) {
  return useQuery({
    queryKey: queryKeys.return(rma),
    queryFn: async ({ signal }) => toReturnDetail(await request(`${API}/customer/returns/${enc(rma)}`, { signal })),
    enabled: Boolean(rma),
    refetchInterval: (query) => (query.state.error || isFinal(query.state.data?.status) ? false : POLL_MS),
    refetchIntervalInBackground: false, // pause while the tab is hidden
    refetchOnWindowFocus: true, // catch up as soon as the tab is visible again
    meta: { silent: true }, // the page shows its own error states
  })
}

/** Label JSON plus its QR code PNG (fetched with the bearer token). @returns {import('@tanstack/react-query').UseQueryResult<ReturnLabel>} */
export function useReturnLabel(rma, enabled) {
  return useQuery({
    queryKey: queryKeys.label(rma),
    queryFn: async ({ signal }) => {
      const label = await request(`${API}/customer/returns/${enc(rma)}/label`, { signal })
      const qrPng = await request(label.qrCodeUrl, { signal, responseType: 'blob', auth: 'customer' })
      return { rma: label.rma, labelCode: label.labelCode, instructions: label.instructions, qrPng }
    },
    enabled: Boolean(rma && enabled),
    staleTime: 5 * 60_000,
    meta: { silent: true }, // the label card shows its own message
  })
}

function useReturnAction(action) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rma) => toReturnDetail(await request(`${API}/customer/returns/${enc(rma)}/${action}`, { method: 'POST' })),
    onSuccess: (ret) => qc.setQueryData(queryKeys.return(ret.returnId), ret),
    meta: { silent: true },
  })
}

/** Customer handed the parcel to the courier: APPROVED → IN_TRANSIT. */
export const useShipReturn = () => useReturnAction('ship')
/** Allowed before the parcel is shipped: REQUESTED, PENDING_REVIEW or APPROVED → CANCELLED. */
export const useCancelReturn = () => useReturnAction('cancel')
