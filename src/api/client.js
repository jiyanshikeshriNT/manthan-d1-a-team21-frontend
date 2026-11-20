import { clearSession, getSession } from '../auth/session'

// Empty in dev (Vite proxies /api). Set VITE_API_BASE_URL in production builds.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

/**
 * Error shape returned by the backend: { error: { code, message } }.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status (0 = network failure)
   * @param {string} code machine-readable code, e.g. ORDER_NOT_FOUND
   * @param {string} message human-readable message
   */
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * @param {string} path e.g. '/api/orders/lookup'
 * @param {{ method?: string, body?: unknown, formData?: FormData, idempotencyKey?: string, signal?: AbortSignal }} [opts]
 */
export async function request(path, { method = 'GET', body, formData, idempotencyKey, signal } = {}) {
  const session = getSession()
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the server. Check your connection and try again.')
  }

  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    clearSession()
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.assign(`/login?next=${next}`)
    throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.')
  }

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? `HTTP_${res.status}`,
      data?.error?.message ?? 'Something went wrong. Please try again.',
    )
  }
  return data
}
