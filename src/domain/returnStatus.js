// Return state machine: single source of truth for the frontend.
// The backend enforces the same rules; the UI uses this to decide what to show.

export const STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  INSPECTED: 'INSPECTED',
  PENDING_FINANCE: 'PENDING_FINANCE',
  REFUND_PROCESSING: 'REFUND_PROCESSING',
  REFUND_FAILED: 'REFUND_FAILED',
  REFUNDED: 'REFUNDED',
  REJECTED: 'REJECTED',
})

export const STATUS_LABEL = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In transit',
  RECEIVED: 'Received',
  INSPECTED: 'Inspected',
  PENDING_FINANCE: 'Awaiting finance review',
  REFUND_PROCESSING: 'Refund processing',
  REFUND_FAILED: 'Refund retrying',
  REFUNDED: 'Refunded',
  REJECTED: 'Rejected',
}

// The six steps a customer sees on the happy path. Rejected replaces the final steps.
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
  INSPECTED: [STATUS.PENDING_FINANCE, STATUS.REFUND_PROCESSING, STATUS.REJECTED],
  PENDING_FINANCE: [STATUS.REFUND_PROCESSING, STATUS.REJECTED],
  REFUND_PROCESSING: [STATUS.REFUNDED, STATUS.REFUND_FAILED],
  REFUND_FAILED: [STATUS.REFUND_PROCESSING],
  REFUNDED: [],
  REJECTED: [],
}

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false
export const isFinal = (status) => TRANSITIONS[status]?.length === 0

/**
 * Customer view of a backend status. Finance and refund-processing states are internal,
 * so customers see them as "Inspected". REFUND_FAILED is handled by the caller (retrying state).
 */
export function toCustomerStep(status) {
  return status === STATUS.PENDING_FINANCE || status === STATUS.REFUND_PROCESSING ? STATUS.INSPECTED : status
}

export const FINANCE_APPROVAL_THRESHOLD_INR = 10000
