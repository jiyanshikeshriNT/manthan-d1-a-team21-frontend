/**
 * Staff session: kept in memory, mirrored to sessionStorage so a page refresh
 * keeps the user signed in for this tab only (closing the tab signs them out).
 * The backend uses stateless HTTP Basic, so `token` is base64("username:password").
 * @typedef {'WAREHOUSE'|'FINANCE'|'MANAGER'} Role
 * @typedef {{ token: string, username: string, role: Role }} Session
 */

/** HTTP Basic credentials, UTF-8 safe. */
export function basicToken(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

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
