import { useMutation, useQuery } from '@tanstack/react-query'
import { request } from './client'

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
 * @typedef {{ status: string, at: string }} StatusEvent
 * @typedef {{ returnId: string, orderNumber: string, status: string, refundMethod: RefundMethod,
 *   estimatedRefundPaise: number, createdAt: string,
 *   items: { returnItemId: string, productName: string, quantity: number, reason: ReturnReason, unitPricePaise: number }[],
 *   history: StatusEvent[] }} ReturnDetail
 */

export const queryKeys = {
  eligibility: (orderId) => ['orders', orderId, 'eligibility'],
  return: (returnId) => ['returns', returnId],
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

/** @param {string} returnId @returns {import('@tanstack/react-query').UseQueryResult<ReturnDetail>} */
export function useReturn(returnId) {
  return useQuery({
    queryKey: queryKeys.return(returnId),
    queryFn: ({ signal }) => request(`/api/returns/${encodeURIComponent(returnId)}`, { signal }),
    enabled: Boolean(returnId),
  })
}
