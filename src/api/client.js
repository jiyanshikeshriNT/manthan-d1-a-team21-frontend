import { clearSession, getSession } from '../auth/session'
import { clearCustomerSession, getCustomerSession } from '../auth/customerSession'

// Empty in dev (Vite proxies /api). Set VITE_API_BASE_URL in production builds.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

/** Base path of the Spring Boot API (`/api/v1/{customer|warehouse|finance|manager|admin|staff}`). */
export const API = '/api/v1'

const CUSTOMER_PREFIX = `${API}/customer/`
const CUSTOMER_SESSION_PATH = `${API}/customer/session`
const STAFF_ME_PATH = `${API}/staff/me`

/** Full URL for a path, e.g. for links that the browser opens itself. */
export const apiUrl = (path) => `${BASE_URL}${path}`

/**
 * Error returned by the backend as RFC 7807 ProblemDetail: { title, status, detail, code, ...extra }.
 * `data` keeps the whole body, e.g. `items` (per-item refusals) or `errors` (field errors).
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status (0 = network failure)
   * @param {string} code machine-readable code, e.g. ORDER_NOT_FOUND
   * @param {string} message human-readable message
   * @param {Record<string, any>|null} [data] the parsed error body
   */
  constructor(status, code, message, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/** Customer endpoints use the order-scoped bearer token; staff endpoints use HTTP Basic. */
function authorization(path, auth) {
  if (auth === 'none' || path === CUSTOMER_SESSION_PATH) return null
  if (auth === 'customer' || path.startsWith(CUSTOMER_PREFIX)) {
    const c = getCustomerSession()
    return c ? `Bearer ${c.accessToken}` : null
  }
  const s = getSession()
  return s?.token ? `Basic ${s.token}` : null
}

/**
 * @param {string} path e.g. '/api/v1/customer/session'
 * @param {{ method?: string, body?: unknown, formData?: FormData, idempotencyKey?: string, signal?: AbortSignal,
 *   responseType?: 'json'|'blob', auth?: 'customer'|'staff'|'none' }} [opts]
 */
export async function request(path, { method = 'GET', body, formData, idempotencyKey, signal, responseType = 'json', auth } = {}) {
  const headers = { Accept: responseType === 'blob' ? '*/*' : 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const authz = authorization(path, auth)
  if (authz) headers.Authorization = authz
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  let res
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the server. Check your connection and try again.')
  }

  if (res.ok && responseType === 'blob') return res.blob()

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (res.status === 401) {
    if (path.startsWith(CUSTOMER_PREFIX)) {
      // The order-scoped token expired (2 h) or is missing: the page asks the customer to confirm the order again.
      clearCustomerSession()
      throw new ApiError(401, 'UNAUTHORIZED', data?.detail ?? 'Your session has expired. Please look up your order again.', data)
    }
    if (path !== STAFF_ME_PATH) {
      clearSession()
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/login?next=${next}`)
    }
    throw new ApiError(401, 'UNAUTHORIZED', data?.detail ?? 'Your session has ended. Please sign in again.', data)
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.code ?? data?.error?.code ?? `HTTP_${res.status}`,
      data?.detail ?? data?.error?.message ?? data?.title ?? 'Something went wrong. Please try again.',
      data,
    )
  }
  return data
}
