const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inrExact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

/** Format integer paise as rupees: 129900 -> "₹1,299", 64950 -> "₹649.50". */
export function formatINR(paise) {
  if (!Number.isFinite(paise)) return '—'
  return (paise % 100 === 0 ? inrWhole : inrExact).format(paise / 100)
}

const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export const formatTime = (ms) => (ms ? time.format(new Date(ms)) : '—')

/** Milliseconds since `iso`. */
export const ageMs = (iso) => Date.now() - new Date(iso).getTime()

/** Compact age such as "12m", "5h 12m" or "2d 4h". */
export function formatAge(iso) {
  const m = Math.max(0, Math.floor(ageMs(iso) / 60_000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

/** Hours as "2 d 4 h", "5 h" or "45 min". */
export function formatDuration(hours) {
  if (!Number.isFinite(hours)) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const total = Math.round(hours)
  const d = Math.floor(total / 24)
  const h = total % 24
  return d ? `${d} d ${h} h` : `${h} h`
}

/** Fraction as a percentage: 0.1236 -> "12.4%". */
export const formatPercent = (fraction, digits = 1) =>
  Number.isFinite(fraction) ? `${(fraction * 100).toFixed(digits)}%` : '—'

/** Whole days from now until `iso` (negative once passed). */
export const daysUntil = (iso) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)

export const formatDate = (iso) => (iso ? date.format(new Date(iso)) : '—')
export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '—')

/** Join class names, skipping falsy values. */
export const cx = (...c) => c.filter(Boolean).join(' ')
