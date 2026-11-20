import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API, ApiError, apiUrl, request } from './client'
import { basicToken } from '../auth/session'

/**
 * Hooks for the staff screens: sign-in, warehouse (`/api/v1/warehouse`) and finance (`/api/v1/finance`).
 * Staff authenticate with HTTP Basic. Mutations are silent: the screens show conflicts and errors inline.
 *
 * @typedef {'A'|'B'|'C'} Grade
 * @typedef {'ACCEPT'|'PARTIAL'|'REJECT'} Decision  UI decision; PARTIAL is sent as ACCEPTED with acceptedQty
 * @typedef {{ returnItemId: string, itemId: number, productName: string, sku: string, quantity: number, unitPricePaise: number,
 *   reason: string, reasonNote?: string|null, photoCount: number, photoUrl: string|null,
 *   grade: Grade|null, decision: 'ACCEPTED'|'REJECTED'|null, acceptedQty: number|null, refundPaise: number|null }} InspectionItem
 * @typedef {{ returnId: string, id: string, orderNumber: string, status: string, refundMethod: string,
 *   totalRefundPaise: number|null, labelCode: string|null, refund: RefundView|null, items: InspectionItem[] }} WarehouseReturn
 *   returnId is the RMA; id is the return's UUID (audit entity id)
 * @typedef {{ returnItemId: string, grade: Grade, decision: Decision, acceptedQty?: number, note?: string }} InspectionLine
 * @typedef {{ returnId: string, status: string, refundPaise: number, outcome: string, refundStatus: string|null }} InspectionResult
 * @typedef {'PENDING'|'AWAITING_APPROVAL'|'PROCESSING'|'UNKNOWN'|'SUCCEEDED'|'FAILED'|'REJECTED'} RefundStatus
 * @typedef {{ id: number, returnId: string, rma: string, amountPaise: number, method: string, status: RefundStatus,
 *   attempts: number, requiresApproval: boolean, approvedBy: string|null, approvedAt: string|null,
 *   gatewayTxnId: string|null, lastError: string|null, nextAttemptAt: string|null, createdAt: string, updatedAt: string }} RefundView
 * @typedef {{ refundId: number, returnId: string, status: RefundStatus, refundPaise: number, refundMethod: string,
 *   attempts: number, failureReason: string|null, submittedAt: string }} QueueRow
 * @typedef {{ returnItemId: string, productName: string, sku: string, quantity: number, grade: Grade|null,
 *   decision: 'ACCEPTED'|'REJECTED'|null, acceptedQty: number|null, refundPaise: number|null, photoCount: number,
 *   photoUrl: string|null, inspectionNote: string|null }} FinanceItem
 * @typedef {{ refundId: number, returnId: string, returnUuid: string, orderNumber: string, flagged: boolean,
 *   flagReason: string|null, status: RefundStatus, returnStatus: string, refundMethod: string, refundPaise: number,
 *   attempts: number, submittedAt: string, failureReason: string|null, items: FinanceItem[] }} FinanceReturn
 */

export const staffKeys = {
  queue: ['finance', 'queue'],
  financeReturn: (id) => ['finance', 'refunds', id],
  ledger: (from, to) => ['finance', 'ledger', from, to],
}

const enc = encodeURIComponent

// ---- sign in ----

/**
 * Verifies HTTP Basic credentials with GET /api/v1/staff/me and returns the session to store.
 * @returns {import('@tanstack/react-query').UseMutationResult<{token: string, username: string, role: 'WAREHOUSE'|'FINANCE'|'MANAGER'}, Error, {username: string, password: string}>}
 */
export function useLogin() {
  return useMutation({
    mutationFn: async ({ username, password }) => {
      const token = basicToken(username, password)
      const res = await fetchMe(token)
      return { token, username: res.username, role: res.role }
    },
    meta: { silent: true },
  })
}

/** /staff/me with explicit credentials (the session is only stored once they are verified). */
async function fetchMe(token) {
  let res
  try {
    res = await fetch(apiUrl(`${API}/staff/me`), { headers: { Accept: 'application/json', Authorization: `Basic ${token}` } })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.code ?? `HTTP_${res.status}`, data?.detail ?? 'Sign in failed.', data)
  return data
}

// ---- warehouse ----

/** Backend WarehouseReturnView → inspection view model. */
export function toWarehouseReturn(view, labelCode = null) {
  return {
    returnId: view.rma,
    id: view.returnId,
    orderNumber: view.orderNumber,
    status: view.status,
    refundMethod: view.refundMethod,
    totalRefundPaise: view.totalRefundPaise ?? null,
    labelCode,
    refund: view.refund ?? null,
    items: (view.items ?? []).map((i) => ({
      returnItemId: String(i.itemId),
      itemId: i.itemId,
      productName: i.productName,
      sku: i.sku,
      quantity: i.requestedQty,
      unitPricePaise: i.unitPricePaise,
      reason: i.reasonCode,
      reasonNote: i.reasonText ?? null,
      photoCount: i.photoCount ?? 0,
      photoUrl: null, // photos are stored server side; there is no staff photo endpoint yet
      grade: i.conditionGrade ?? null,
      decision: i.decision ?? null,
      acceptedQty: i.acceptedQty ?? null,
      refundPaise: i.refundPaise ?? null,
    })),
  }
}

/** Signed label codes look like RR-RMA-100001-1a2b3c4d; anything else is treated as an RMA number. */
export const isLabelCode = (code) => /^RR-/i.test(code.trim())

/**
 * Loads the return for a scanned label (HMAC-verified) or a typed RMA, and marks an IN_TRANSIT parcel as
 * RECEIVED. Re-scanning a received parcel is a no-op on the server.
 */
export async function scanReturn(code) {
  const c = code.trim()
  const label = isLabelCode(c) ? c : null
  let view = label
    ? await request(`${API}/warehouse/labels/${enc(label)}`)
    : await request(`${API}/warehouse/returns/${enc(c.toUpperCase())}`)
  if (view.status === 'IN_TRANSIT') {
    view = await request(`${API}/warehouse/returns/${enc(view.rma)}/receive`, {
      method: 'POST',
      ...(label ? { body: { labelCode: label } } : {}),
    })
  }
  return toWarehouseReturn(view, label)
}

/** @returns {import('@tanstack/react-query').UseMutationResult<WarehouseReturn, Error, string>} code in, return out */
export function useScan() {
  return useMutation({ mutationFn: scanReturn, meta: { silent: true } })
}

/** Reads the QR code from a photo of a label, then loads that return like a scan. */
export function useDecodeLabel() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('image', file, file.name)
      const decoded = await request(`${API}/warehouse/labels/decode`, { method: 'POST', formData: form })
      return scanReturn(decoded.labelCode)
    },
    meta: { silent: true },
  })
}

/** Latest copy of a return, used by "Reload return" after a conflict. @returns {Promise<WarehouseReturn>} */
export const fetchWarehouseReturn = async (rma, labelCode = null) =>
  toWarehouseReturn(await request(`${API}/warehouse/returns/${enc(rma)}`), labelCode)

/** UI line → backend inspection item. Every item needs a grade, including rejected ones. */
export function toInspectionItem(item, line) {
  const decision = line.decision === 'REJECT' ? 'REJECTED' : 'ACCEPTED'
  return {
    itemId: item.itemId ?? Number(item.returnItemId),
    grade: line.grade,
    decision,
    ...(line.decision === 'PARTIAL' ? { acceptedQty: Number(line.acceptedQty) } : {}),
    ...(line.note?.trim() ? { note: line.note.trim() } : {}),
  }
}

/** @returns {import('@tanstack/react-query').UseMutationResult<InspectionResult, Error, {returnId: string, items: object[]}>} */
export function useInspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ returnId, items }) => {
      const view = await request(`${API}/warehouse/returns/${enc(returnId)}/inspection`, { method: 'POST', body: { items } })
      return {
        returnId: view.rma,
        status: view.status,
        refundPaise: view.totalRefundPaise ?? 0,
        outcome: view.status,
        refundStatus: view.refund?.status ?? null,
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.queue }),
    meta: { silent: true },
  })
}

// ---- finance ----

/** Refund statuses finance acts on: approval, and failed or unknown payments that can be retried. */
export const QUEUE_STATUSES = ['AWAITING_APPROVAL', 'FAILED', 'UNKNOWN']

/** @param {RefundView} r @returns {QueueRow} */
export const toQueueRow = (r) => ({
  refundId: r.id,
  returnId: r.rma,
  status: r.status,
  refundPaise: r.amountPaise,
  refundMethod: r.method,
  attempts: r.attempts,
  failureReason: r.lastError ?? null,
  submittedAt: r.createdAt,
})

/** @returns {import('@tanstack/react-query').UseQueryResult<{ items: QueueRow[] }>} */
export function useFinanceQueue() {
  return useQuery({
    queryKey: staffKeys.queue,
    queryFn: async ({ signal }) => {
      const lists = await Promise.all(
        QUEUE_STATUSES.map((s) => request(`${API}/finance/refunds?status=${s}`, { signal })),
      )
      return { items: lists.flat().map(toQueueRow) }
    },
    refetchInterval: 30_000,
  })
}

/** Backend finance detail → drawer view model. */
export function toFinanceReturn(d) {
  return {
    refundId: d.refund.id,
    returnId: d.rma,
    returnUuid: d.returnId,
    orderNumber: d.orderNumber,
    flagged: Boolean(d.flagged),
    flagReason: d.flagReason ?? null,
    status: d.refund.status,
    returnStatus: d.returnStatus,
    refundMethod: d.refund.method,
    refundPaise: d.refund.amountPaise,
    attempts: d.refund.attempts,
    submittedAt: d.refund.createdAt,
    failureReason: d.refund.lastError ?? null,
    items: (d.items ?? []).map((i) => ({
      returnItemId: String(i.itemId),
      productName: i.productName,
      sku: i.sku,
      quantity: i.requestedQty,
      grade: i.conditionGrade ?? null,
      decision: i.decision ?? null,
      acceptedQty: i.acceptedQty ?? null,
      refundPaise: i.refundPaise ?? null,
      photoCount: i.photoCount ?? 0,
      photoUrl: null,
      inspectionNote: i.inspectionNote ?? null,
    })),
  }
}

/** @param {number|null} refundId @returns {import('@tanstack/react-query').UseQueryResult<FinanceReturn>} */
export function useFinanceReturn(refundId) {
  return useQuery({
    queryKey: staffKeys.financeReturn(refundId),
    queryFn: async ({ signal }) => toFinanceReturn(await request(`${API}/finance/refunds/${enc(refundId)}`, { signal })),
    enabled: refundId != null,
    staleTime: 0,
    meta: { silent: true },
  })
}

const toResult = (r) => ({ status: r.status, failureReason: r.lastError ?? null, refundPaise: r.amountPaise })

/**
 * Approve (pays straight away) or reject (reason required). Approving twice is a no-op on the server,
 * and the gateway key is deterministic per return, so a double click can never pay twice.
 */
export function useFinanceDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ refundId, decision, note }) =>
      toResult(
        decision === 'REJECT'
          ? await request(`${API}/finance/refunds/${enc(refundId)}/reject`, { method: 'POST', body: { reason: note } })
          : await request(`${API}/finance/refunds/${enc(refundId)}/approve`, { method: 'POST' }),
      ),
    onSuccess: (_r, { refundId }) => {
      qc.invalidateQueries({ queryKey: staffKeys.queue })
      qc.invalidateQueries({ queryKey: staffKeys.financeReturn(refundId) })
      qc.invalidateQueries({ queryKey: ['finance', 'ledger'] })
    },
    meta: { silent: true },
  })
}

/** Retries a FAILED or UNKNOWN refund with the same gateway idempotency key. */
export function useRetryRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ refundId }) => toResult(await request(`${API}/finance/refunds/${enc(refundId)}/retry`, { method: 'POST' })),
    onSuccess: (_r, { refundId }) => {
      qc.invalidateQueries({ queryKey: staffKeys.queue })
      qc.invalidateQueries({ queryKey: staffKeys.financeReturn(refundId) })
      qc.invalidateQueries({ queryKey: ['finance', 'ledger'] })
    },
    meta: { silent: true },
  })
}

/**
 * Ledger entries between two dates (inclusive, Asia/Kolkata); the server defaults to the last 30 days.
 * @param {string} [from] YYYY-MM-DD @param {string} [to] YYYY-MM-DD
 * @returns {import('@tanstack/react-query').UseQueryResult<{ from: string, to: string, entries: object[],
 *   totalDebitPaise: number, totalCreditPaise: number, balanced: boolean }>}
 */
export function useLedger(from, to) {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  const q = qs.toString()
  return useQuery({
    queryKey: staffKeys.ledger(from ?? '', to ?? ''),
    queryFn: ({ signal }) => request(`${API}/finance/ledger${q ? `?${q}` : ''}`, { signal }),
    meta: { silent: true },
  })
}
