import { useQuery } from '@tanstack/react-query'
import { request } from './client'

/**
 * Manager dashboard hooks (docs/api-contract.md). Rates are fractions (0.124 = 12.4%).
 * @typedef {{ category: string, returnable: boolean, returns: number, orders: number, returnRate: number }} CategoryRate
 * @typedef {{ reason: string, count: number }} ReasonCount
 * @typedef {{ periodDays: number, returnRateByCategory: CategoryRate[], topReasons: ReasonCount[], avgCycleTimeHours: number|null }} ManagerMetrics
 * @typedef {{ customerId: string, customerName: string, returnCount30d: number, lastReturnAt: string }} FlaggedCustomer
 */

export const managerKeys = {
  metrics: ['manager', 'metrics'],
  flagged: ['manager', 'flagged'],
}

// Panels show their own error and retry, so these stay silent (no global toast).
/** @returns {import('@tanstack/react-query').UseQueryResult<ManagerMetrics>} */
export function useManagerMetrics() {
  return useQuery({
    queryKey: managerKeys.metrics,
    queryFn: ({ signal }) => request('/api/manager/metrics', { signal }),
    refetchInterval: 5 * 60_000,
    meta: { silent: true },
  })
}

/** @returns {import('@tanstack/react-query').UseQueryResult<{ customers: FlaggedCustomer[] }>} */
export function useFlaggedCustomers() {
  return useQuery({
    queryKey: managerKeys.flagged,
    queryFn: ({ signal }) => request('/api/manager/flagged', { signal }),
    refetchInterval: 5 * 60_000,
    meta: { silent: true },
  })
}
