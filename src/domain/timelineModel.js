import { STATUS, STATUS_LABEL, TIMELINE, toCustomerStep } from './returnStatus'

/** Plain-language line shown under the active step, keyed by the raw backend status. */
export const STEP_MESSAGE = {
  REQUESTED: 'We’ve got your request and are checking it now.',
  APPROVED: 'Your return is approved. Print your label and send the parcel back.',
  IN_TRANSIT: 'Your parcel is on its way to our warehouse.',
  RECEIVED: 'Your parcel has been received and is waiting for inspection.',
  INSPECTED: 'We’ve inspected your items and are preparing your refund.',
  PENDING_FINANCE: 'Your refund is with our finance team for a quick check. No action needed.',
  REFUND_PROCESSING: 'Your refund is being sent now.',
  REFUND_FAILED: 'We’re retrying your refund. No action needed.',
  REFUNDED: 'Your refund has been sent.',
  REJECTED: 'We couldn’t accept this return.',
}

/**
 * Turns a backend status plus its event history into the steps the timeline draws.
 * state: done | current | upcoming | failed
 * @param {string} status
 * @param {{ status: string, at: string }[]} [events]
 * @returns {{ key: string, label: string, state: 'done'|'current'|'upcoming'|'failed', stateText: string, at: string|null, message: string }[]}
 */
export function buildTimeline(status, events = []) {
  // First timestamp per customer-visible step. A failed refund has not reached "Refunded".
  const at = {}
  for (const e of events) {
    if (e.status === STATUS.REFUND_FAILED) continue
    const key = e.status === STATUS.REJECTED ? STATUS.REJECTED : toCustomerStep(e.status)
    if (!at[key]) at[key] = e.at
  }

  const step = (key, state, message = '') => ({
    key,
    label: STATUS_LABEL[key],
    state,
    stateText: stateText(key, state),
    at: at[key] ?? null,
    message,
  })
  const message = STEP_MESSAGE[status] ?? ''

  if (status === STATUS.REJECTED) {
    let reached = TIMELINE.filter((k) => k !== STATUS.REFUNDED && at[k])
    if (reached.length === 0) reached = [STATUS.REQUESTED]
    return [...reached.map((k) => step(k, 'done')), step(STATUS.REJECTED, 'failed', message)]
  }

  const refundRetrying = status === STATUS.REFUND_FAILED
  const active = TIMELINE.indexOf(refundRetrying ? STATUS.REFUNDED : toCustomerStep(status))

  return TIMELINE.map((key, i) => {
    if (i < active) return step(key, 'done')
    if (i > active) return step(key, 'upcoming')
    if (refundRetrying) return step(key, 'failed', message)
    if (key === STATUS.REFUNDED) return step(key, 'done', message)
    return step(key, 'current', message)
  })
}

function stateText(key, state) {
  if (state === 'done') return 'Done'
  if (state === 'current') return 'In progress'
  if (state === 'upcoming') return 'Upcoming'
  return key === STATUS.REJECTED ? 'Not accepted' : 'Retrying'
}
