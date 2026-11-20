/**
 * Staff session: kept in memory, mirrored to sessionStorage so a page refresh
 * keeps the user signed in for this tab only (closing the tab signs them out).
 * @typedef {'WAREHOUSE'|'FINANCE'|'MANAGER'} Role
 * @typedef {{ token: string, role: Role }} Session
 */

const KEY = 'rr.session'
const listeners = new Set()

/** @type {Session | null} */
let current = read()

function read() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getSession() {
  return current
}

/** @param {Session | null} next */
export function setSession(next) {
  current = next
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next))
    else sessionStorage.removeItem(KEY)
  } catch {
    // storage blocked (private mode): memory copy still works
  }
  listeners.forEach((fn) => fn(current))
}

export function clearSession() {
  setSession(null)
}

/** @param {(s: Session | null) => void} fn */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Landing page for each role after sign-in. */
export const ROLE_HOME = {
  WAREHOUSE: '/warehouse',
  FINANCE: '/finance',
  MANAGER: '/manager',
}
