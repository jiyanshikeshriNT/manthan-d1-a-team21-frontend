import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API, request } from './client'

/**
 * Manager hooks (`/api/v1/manager`, `/api/v1/admin`). Rates are fractions (0.124 = 12.4%).
 * @typedef {{ category: string, returnable: boolean, returns: number, orders: number, returnRate: number }} CategoryRate
 *   returns = returned units, orders = sold units (orders placed in the period)
 * @typedef {{ reason: string, count: number }} ReasonCount
 * @typedef {{ from: string, to: string, periodDays: number, returnRateByCategory: CategoryRate[], topReasons: ReasonCount[],
 *   avgCycleTimeHours: number|null, closedReturns: number }} ManagerMetrics
 * @typedef {{ customerId: string, customerName: string, returnCount30d: number, lastReturnAt: string, activeFlags: number }} FlaggedCustomer
 *   customerName is the masked email (the API never returns PII in clear)
 * @typedef {{ returnId: string, rma: string, orderNumber: string, customerId: number, requestedAt: string, itemCount: number,
 *   units: number, refundMethod: string, flagReason: string|null }} ReviewItem
 * @typedef {{ id: number, entityType: string, entityId: string, action: string, fromState: string|null, toState: string|null,
 *   actor: string, actorRole: string, details: string|null, correlationId: string|null, createdAt: string }} AuditRecord
 * @typedef {'NONE'|'FAIL'|'TIMEOUT'|'SLOW'|'FAIL_AFTER_CHARGE'|'DECLINE'} FaultMode
 */

export const managerKeys = {
  dashboard: ['manager', 'dashboard'],
  reviews: ['manager', 'reviews'],
  audit: (entityId) => ['manager', 'audit', entityId],
  faults: ['admin', 'gateway', 'faults'],
}

const DAY = 86_400_000
const num = (v) => (v == null ? null : Number(v))

/** Backend dashboard → metrics view model. */
export function toMetrics(d) {
  return {
    from: d.from,
    to: d.to,
    periodDays: Math.round((Date.parse(d.to) - Date.parse(d.from)) / DAY) + 1,
    returnRateByCategory: (d.returnRateByCategory ?? []).map((c) => ({
      category: c.category,
      returnable: c.returnable ?? true,
      returns: c.returnedUnits,
      orders: c.soldUnits,
      returnRate: Number(c.returnRate),
    })),
    topReasons: (d.topReasons ?? []).map((r) => ({ reason: r.reasonCode, count: r.count })),
    avgCycleTimeHours: num(d.cycleTime?.averageHours),
    closedReturns: d.cycleTime?.closedReturns ?? 0,
  }
}

/** Backend flagged customers → table rows. */
export const toFlagged = (d) => ({
  customers: (d.flaggedCustomers ?? []).map((f) => ({
    customerId: String(f.customerId),
    customerName: f.maskedEmail,
    returnCount30d: f.highestReturnCount,
    lastReturnAt: f.lastFlaggedAt,
    activeFlags: f.activeFlags,
  })),
})

const dashboardQuery = {
  queryKey: managerKeys.dashboard,
  queryFn: ({ signal }) => request(`${API}/manager/dashboard`, { signal }),
  refetchInterval: 5 * 60_000,
  meta: { silent: true }, // panels show their own error and retry
}

/** One dashboard request backs both hooks (TanStack dedupes by key). @returns {import('@tanstack/react-query').UseQueryResult<ManagerMetrics>} */
export const useManagerMetrics = () => useQuery({ ...dashboardQuery, select: toMetrics })

/** @returns {import('@tanstack/react-query').UseQueryResult<{ customers: FlaggedCustomer[] }>} */
export const useFlaggedCustomers = () => useQuery({ ...dashboardQuery, select: toFlagged })

// ---- review queue (flagged customers' returns waiting in PENDING_REVIEW) ----

/** @returns {import('@tanstack/react-query').UseQueryResult<ReviewItem[]>} */
export function useReviews() {
  return useQuery({
    queryKey: managerKeys.reviews,
    queryFn: ({ signal }) => request(`${API}/manager/reviews`, { signal }),
    refetchInterval: 60_000,
    meta: { silent: true },
  })
}

/** Approve or reject (reason required) a return in review. A stale decision gets 409 INVALID_TRANSITION. */
export function useReviewDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rma, decision, reason }) =>
      request(`${API}/manager/reviews/${encodeURIComponent(rma)}/${decision === 'REJECT' ? 'reject' : 'approve'}`, {
        method: 'POST',
        ...(decision === 'REJECT' ? { body: { reason } } : {}),
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: managerKeys.reviews })
      qc.invalidateQueries({ queryKey: managerKeys.dashboard })
    },
    meta: { silent: true },
  })
}

// ---- audit trail ----

/** All audit rows for a return (UUID) or a refund (numeric id), oldest first. @returns {import('@tanstack/react-query').UseQueryResult<AuditRecord[]>} */
export function useAuditTrail(entityId) {
  return useQuery({
    queryKey: managerKeys.audit(entityId),
    queryFn: ({ signal }) => request(`${API}/manager/audit?entityId=${encodeURIComponent(entityId)}`, { signal }),
    enabled: Boolean(entityId),
    meta: { silent: true },
  })
}

// ---- gateway fault injection (non-prod SRE drill) ----

/** @returns {import('@tanstack/react-query').UseQueryResult<{ mode: FaultMode, latencyMs: number }>} */
export function useGatewayFaults() {
  return useQuery({
    queryKey: managerKeys.faults,
    queryFn: ({ signal }) => request(`${API}/admin/gateway/faults`, { signal }),
    meta: { silent: true },
  })
}

export function useSetGatewayFaults() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mode, latencyMs }) => request(`${API}/admin/gateway/faults`, { method: 'PUT', body: { mode, latencyMs } }),
    onSuccess: (data) => qc.setQueryData(managerKeys.faults, data),
    meta: { silent: true },
  })
}
