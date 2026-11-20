// Tiny toast store usable outside React (e.g. from the QueryClient error handler).
let toasts = []
let seq = 0
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(toasts))

export function subscribeToasts(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const getToasts = () => toasts

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** @param {{ tone?: 'success'|'danger'|'info', title: string, description?: string, duration?: number }} t */
export function showToast({ tone = 'info', title, description, duration = 6000 }) {
  const id = ++seq
  toasts = [...toasts.slice(-2), { id, tone, title, description }]
  emit()
  if (duration) setTimeout(() => dismissToast(id), duration)
  return id
}

export const toast = {
  success: (title, description) => showToast({ tone: 'success', title, description }),
  error: (title, description) => showToast({ tone: 'danger', title, description, duration: 8000 }),
  info: (title, description) => showToast({ tone: 'info', title, description }),
}
