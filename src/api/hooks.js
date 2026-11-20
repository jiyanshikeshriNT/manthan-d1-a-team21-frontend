import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { request } from './client'
import { isFinal } from '../domain/returnStatus'

/**
 * Typed hooks for the shared API contract (docs/api-contract.md).
 * Money is always integer paise. Fields are camelCase.
 *
 * @typedef {'ORIGINAL'|'STORE_CREDIT'} RefundMethod
 * @typedef {'WRONG_SIZE'|'DAMAGED'|'NOT_AS_DESCRIBED'|'CHANGED_MIND'|'OTHER'} ReturnReason
 * @typedef {'ELIGIBLE'|'WINDOW_CLOSED'|'NON_RETURNABLE_CATEGORY'|'ALREADY_RETURNED'|'NOT_DELIVERED'} ReasonCode
 *
 * @typedef {{ orderId: string, orderNumber: string, placedAt: string, deliveredAt: string|null }} OrderSummary
 * @typedef {{ orderItemId: string, productName: string, sku: string, category: string,
 *   unitPricePaise: number, quantity: number, returnableQuantity: number, imageUrl?: string|null,
 *   eligible: boolean, reasonCode: ReasonCode, message: string, daysLeft: number|null }} EligibilityItem
 * @typedef {{ orderId: string, items: EligibilityItem[] }} Eligibility
 * @typedef {{ orderItemId: string, quantity: number, reason: ReturnReason, reasonNote?: string }} CreateReturnItem
 * @typedef {{ orderId: string, email: string, refundMethod: RefundMethod, items: CreateReturnItem[] }} CreateReturnBody
 * @typedef {{ returnId: string, status: string, items: { returnItemId: string, orderItemId: string }[] }} CreatedReturn
 * @typedef {'AWAITING_INSPECTION'|'ACCEPTED'|'REJECTED'} ItemStatus
 * @typedef {'A'|'B'|'C'} Grade
 * @typedef {{ returnItemId: string, productName: string, quantity: number, reason: ReturnReason,
 *   unitPricePaise: number, status: ItemStatus, grade: Grade|null, refundPaise: number|null }} ReturnDetailItem
 * @typedef {{ returnId: string, orderNumber: string, status: string, refundMethod: RefundMethod,
 *   estimatedRefundPaise: number, refundedPaise: number|null, rejectionReason: string|null,
 *   createdAt: string, items: ReturnDetailItem[] }} ReturnDetail
 * @typedef {{ status: string, at: string }} StatusEvent
 * @typedef {{ returnId: string, events: StatusEvent[] }} ReturnTimeline
 * @typedef {{ labelNumber: string, qrPngBase64: string, expiresAt: string }} ReturnLabel
 */

/** The customer status page refreshes every 15 s. TanStack pauses it while the tab is hidden. */
export const POLL_MS = 15_000

export const queryKeys = {
  eligibility: (orderId) => ['orders', orderId, 'eligibility'],
  return: (returnId) => ['returns', returnId],
  timeline: (returnId, status) => ['returns', returnId, 'timeline', status],
  label: (returnId) => ['returns', returnId, 'label'],
}

// ---- auth ----
/** @returns {import('@tanstack/react-query').UseMutationResult<{token: string, role: 'WAREHOUSE'|'FINANCE'|'MANAGER'}, Error, {email: string, password: string}>} */
export function useLogin() {
  return useMutation({
    mutationFn: (body) => request('/api/auth/login', { method: 'POST', body }),
    meta: { silent: true },
  })
}

// ---- customer ----
/** @returns {import('@tanstack/react-query').UseMutationResult<OrderSummary, Error, {orderNumber: string, email: string}>} */
export function useOrderLookup() {
  return useMutation({
    mutationFn: (body) => request('/api/orders/lookup', { method: 'POST', body }),
    meta: { silent: true }, // the form shows its own generic message
  })
}

/** @param {string|undefined} orderId @returns {import('@tanstack/react-query').UseQueryResult<Eligibility>} */
export function useEligibility(orderId) {
  return useQuery({
    queryKey: queryKeys.eligibility(orderId),
    queryFn: ({ signal }) => request(`/api/orders/${encodeURIComponent(orderId)}/eligibility`, { signal }),
    enabled: Boolean(orderId),
  })
}

/** @returns {import('@tanstack/react-query').UseMutationResult<CreatedReturn, Error, {body: CreateReturnBody, idempotencyKey: string}>} */
export function useCreateReturn() {
  return useMutation({
    mutationFn: ({ body, idempotencyKey }) =>
      request('/api/returns', { method: 'POST', body, idempotencyKey }),
    meta: { silent: true }, // the review step shows its own error
  })
}

/** Upload one photo for a return item (multipart, field name "file"). */
export function uploadReturnItemPhoto(returnId, returnItemId, file) {
  const formData = new FormData()
  formData.append('file', file)
  return request(
    `/api/returns/${encodeURIComponent(returnId)}/items/${encodeURIComponent(returnItemId)}/photo`,
    { method: 'POST', formData },
  )
}

/**
 * Return detail, polled every 15 s until the return reaches a final status.
 * @param {string} returnId @returns {import('@tanstack/react-query').UseQueryResult<ReturnDetail>}
 */
export function useReturn(returnId) {
  return useQuery({
    queryKey: queryKeys.return(returnId),
    queryFn: ({ signal }) => request(`/api/returns/${encodeURIComponent(returnId)}`, { signal }),
    enabled: Boolean(returnId),
    refetchInterval: (query) => (isFinal(query.state.data?.status) ? false : POLL_MS),
    refetchIntervalInBackground: false, // pause while the tab is hidden
    refetchOnWindowFocus: true, // catch up as soon as the tab is visible again
  })
}

/**
 * Timeline events. Keyed by status, so it reloads exactly when the polled status changes.
 * @param {string} returnId @param {string|undefined} status @returns {import('@tanstack/react-query').UseQueryResult<ReturnTimeline>}
 */
export function useReturnTimeline(returnId, status) {
  return useQuery({
    queryKey: queryKeys.timeline(returnId, status),
    queryFn: ({ signal }) => request(`/api/returns/${encodeURIComponent(returnId)}/timeline`, { signal }),
    enabled: Boolean(returnId && status),
    placeholderData: keepPreviousData,
    meta: { silent: true }, // the page still works without timestamps
  })
}

/** @param {string} returnId @param {boolean} enabled @returns {import('@tanstack/react-query').UseQueryResult<ReturnLabel>} */
export function useReturnLabel(returnId, enabled) {
  return useQuery({
    queryKey: queryKeys.label(returnId),
    queryFn: ({ signal }) => request(`/api/returns/${encodeURIComponent(returnId)}/label`, { signal }),
    enabled: Boolean(returnId && enabled),
    staleTime: 5 * 60_000,
    meta: { silent: true }, // the label card shows its own message
  })
}
