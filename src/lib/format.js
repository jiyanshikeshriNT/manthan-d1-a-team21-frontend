const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Format integer paise as Indian rupees, e.g. 129900 -> "₹1,299". */
export function formatINR(paise) {
  if (!Number.isFinite(paise)) return '—'
  return inr.format(paise / 100)
}

const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const formatDate = (iso) => (iso ? date.format(new Date(iso)) : '—')
export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '—')

/** Join class names, skipping falsy values. */
export const cx = (...c) => c.filter(Boolean).join(' ')
