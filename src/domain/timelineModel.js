import { STATUS, STATUS_LABEL, TIMELINE, isClosedWithoutRefund, toCustomerStep } from './returnStatus'

/** Plain-language line shown under the active step, keyed by the raw backend status. */
export const STEP_MESSAGE = {
  REQUESTED: 'We’ve got your request and are checking it now.',
  PENDING_REVIEW: 'Your request is being reviewed by our team. We’ll update this page as soon as it’s approved.',
  APPROVED: 'Your return is approved. Print your label and send the parcel back.',
  IN_TRANSIT: 'Your parcel is on its way to our warehouse.',
  RECEIVED: 'Your parcel has been received and is waiting for inspection.',
  INSPECTED: 'We’ve inspected your items and are preparing your refund.',
  AWAITING_FINANCE: 'Your refund is with our finance team for a quick check. No action needed.',
  REFUND_IN_PROGRESS: 'Your refund is being sent now.',
  REFUNDED: 'Your refund has been sent.',
  REJECTED: 'We couldn’t accept this return.',
  CANCELLED: 'You cancelled this return.',
}

/**
 * Turns a backend status plus its event history into the steps the timeline draws.
 * state: done | current | upcoming | failed
 * @param {string} status
 * @param {{ status: string, at: string }[]} [events] first time each customer step was reached
 * @returns {{ key: string, label: string, state: 'done'|'current'|'upcoming'|'failed', stateText: string, at: string|null, message: string }[]}
 */
export function buildTimeline(status, events = []) {
  // First timestamp per customer-visible step.
  const at = {}
  for (const e of events) {
    const key = isClosedWithoutRefund(e.status) ? e.status : toCustomerStep(e.status)
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

  if (isClosedWithoutRefund(status)) {
    let reached = TIMELINE.filter((k) => k !== STATUS.REFUNDED && at[k])
    if (reached.length === 0) reached = [STATUS.REQUESTED]
    return [...reached.map((k) => step(k, 'done')), step(status, 'failed', message)]
  }

  const active = TIMELINE.indexOf(toCustomerStep(status))

  return TIMELINE.map((key, i) => {
    if (i < active) return step(key, 'done')
    if (i > active) return step(key, 'upcoming')
    if (key === STATUS.REFUNDED) return step(key, 'done', message)
    return step(key, 'current', message)
  })
}

function stateText(key, state) {
  if (state === 'done') return 'Done'
  if (state === 'current') return 'In progress'
  if (state === 'upcoming') return 'Upcoming'
  return key === STATUS.CANCELLED ? 'Cancelled' : 'Not accepted'
}
