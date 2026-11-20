// Return state machine — single source of truth for the frontend.
// The backend enforces the same rules; the UI uses this only to decide
// what to show and which actions to offer.

export const STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  INSPECTED: 'INSPECTED',
  REFUNDED: 'REFUNDED',
  REJECTED: 'REJECTED',
})

export const STATUS_LABEL = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In transit',
  RECEIVED: 'Received',
  INSPECTED: 'Inspected',
  REFUNDED: 'Refunded',
  REJECTED: 'Rejected',
}

// Happy-path order, used by the customer status timeline.
export const TIMELINE = [
  STATUS.REQUESTED,
  STATUS.APPROVED,
  STATUS.IN_TRANSIT,
  STATUS.RECEIVED,
  STATUS.INSPECTED,
  STATUS.REFUNDED,
]

// Allowed moves. Anything not listed here is invalid.
export const TRANSITIONS = {
  REQUESTED: [STATUS.APPROVED, STATUS.REJECTED],
  APPROVED: [STATUS.IN_TRANSIT],
  IN_TRANSIT: [STATUS.RECEIVED],
  RECEIVED: [STATUS.INSPECTED],
  INSPECTED: [STATUS.REFUNDED, STATUS.REJECTED],
  REFUNDED: [],
  REJECTED: [],
}

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function isFinal(status) {
  return TRANSITIONS[status]?.length === 0
}

// Business constants shared with the UI copy.
export const FINANCE_APPROVAL_THRESHOLD_INR = 10000
