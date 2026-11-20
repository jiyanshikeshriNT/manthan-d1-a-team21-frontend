/**
 * Customer session: the bearer token from `POST /api/v1/customer/session`. It is scoped to one order
 * and expires after 2 hours. Kept in memory and mirrored to sessionStorage (this tab only).
 * @typedef {{ accessToken: string, expiresAt: string, orderNumber: string }} CustomerSession
 */

const KEY = 'rr.customer'
const listeners = new Set()

/** @type {CustomerSession | null} */
let current = read()

function read() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const expired = (s) => !s || (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now())

/** The live session, or null when there is none or it has expired. */
export function getCustomerSession() {
  if (current && expired(current)) setCustomerSession(null)
  return current
}

/** @param {CustomerSession | null} next */
export function setCustomerSession(next) {
  current = next
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next))
    else sessionStorage.removeItem(KEY)
  } catch {
    // storage blocked (private mode): memory copy still works
  }
  listeners.forEach((fn) => fn(current))
}

export function clearCustomerSession() {
  if (current) setCustomerSession(null)
}

/** True when the session belongs to this order number (case-insensitive). */
export const sessionCovers = (orderNumber) =>
  Boolean(orderNumber) && getCustomerSession()?.orderNumber?.toUpperCase() === orderNumber.toUpperCase()

/** @param {(s: CustomerSession | null) => void} fn */
export function subscribeCustomer(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
