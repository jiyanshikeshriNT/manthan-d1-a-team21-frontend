import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'

/**
 * Hooks for the warehouse and finance screens (docs/api-contract.md).
 * All mutations are silent: the screens show conflicts and errors inline.
 *
 * @typedef {'A'|'B'|'C'} Grade
 * @typedef {'ACCEPT'|'PARTIAL'|'REJECT'} Decision
 * @typedef {{ returnItemId: string, productName: string, sku: string, quantity: number, unitPricePaise: number,
 *   reason: string, reasonNote?: string, photoUrl: string|null }} InspectionItem
 * @typedef {{ returnId: string, orderNumber: string, status: string, version: number, items: InspectionItem[] }} WarehouseReturn
 * @typedef {{ returnItemId: string, grade: Grade|null, decision: Decision, acceptedQty?: number }} InspectionLine
 * @typedef {{ returnId: string, status: string, version: number, refundPaise: number,
 *   outcome: 'PENDING_FINANCE'|'REFUND_PROCESSING'|'REJECTED' }} InspectionResult
 * @typedef {{ returnId: string, orderNumber: string, customerName: string, flagged: boolean, status: string,
 *   refundPaise: number, gradeSummary: Record<Grade, number>, submittedAt: string }} QueueRow
 * @typedef {{ returnItemId: string, productName: string, quantity: number, grade: Grade|null, decision: Decision,
 *   acceptedQty?: number, refundPaise: number, photoUrl: string|null }} FinanceItem
 * @typedef {{ returnId: string, orderNumber: string, customerName: string, flagged: boolean, flagReason?: string,
 *   status: string, version: number, refundMethod: string, refundPaise: number, submittedAt: string,
 *   failureReason?: string|null, items: FinanceItem[] }} FinanceReturn
 */

export const staffKeys = {
  queue: ['finance', 'queue'],
  financeReturn: (id) => ['finance', 'returns', id],
}

// ---- warehouse ----
/** @returns {import('@tanstack/react-query').UseMutationResult<WarehouseReturn, Error, string>} token in, return out */
export function useScan() {
  return useMutation({
    mutationFn: (token) => request('/api/warehouse/scan', { method: 'POST', body: { token } }),
    meta: { silent: true },
  })
}

/** Latest copy of a return, used by "Reload return" after a conflict. @returns {Promise<WarehouseReturn>} */
export const fetchWarehouseReturn = (returnId) => request(`/api/warehouse/returns/${encodeURIComponent(returnId)}`)

/** @returns {import('@tanstack/react-query').UseMutationResult<InspectionResult, Error, {returnId: string, version: number, items: InspectionLine[]}>} */
export function useInspect() {
  return useMutation({
    mutationFn: ({ returnId, version, items }) =>
      request(`/api/warehouse/returns/${encodeURIComponent(returnId)}/inspect`, { method: 'POST', body: { version, items } }),
    meta: { silent: true },
  })
}

// ---- finance ----
/** @returns {import('@tanstack/react-query').UseQueryResult<{ items: QueueRow[] }>} */
export function useFinanceQueue() {
  return useQuery({
    queryKey: staffKeys.queue,
    queryFn: ({ signal }) => request('/api/finance/queue', { signal }),
    refetchInterval: 30_000,
  })
}

/** @param {string|null} returnId @returns {import('@tanstack/react-query').UseQueryResult<FinanceReturn>} */
export function useFinanceReturn(returnId) {
  return useQuery({
    queryKey: staffKeys.financeReturn(returnId),
    queryFn: ({ signal }) => request(`/api/finance/returns/${encodeURIComponent(returnId)}`, { signal }),
    enabled: Boolean(returnId),
    staleTime: 0,
  })
}

/** Approve or reject. Sends the version the reviewer saw and an Idempotency-Key per confirmed attempt. */
export function useFinanceDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ returnId, version, decision, note, idempotencyKey }) =>
      request(`/api/finance/returns/${encodeURIComponent(returnId)}/decision`, {
        method: 'POST',
        body: { version, decision, ...(note ? { note } : {}) },
        idempotencyKey,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.queue }),
    meta: { silent: true },
  })
}

export function useRetryRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ returnId, idempotencyKey }) =>
      request(`/api/finance/returns/${encodeURIComponent(returnId)}/retry-refund`, { method: 'POST', idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.queue }),
    meta: { silent: true },
  })
}
