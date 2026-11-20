// Return state machine: mirrors the backend's ReturnStateMachine (system/CLAUDE.md) exactly.
// The backend enforces the rules; the UI uses this to decide what to show.

export const STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  INSPECTED: 'INSPECTED',
  AWAITING_FINANCE: 'AWAITING_FINANCE',
  REFUND_IN_PROGRESS: 'REFUND_IN_PROGRESS',
  REFUNDED: 'REFUNDED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
})

export const STATUS_LABEL = {
  REQUESTED: 'Requested',
  PENDING_REVIEW: 'Under review',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In transit',
  RECEIVED: 'Received',
  INSPECTED: 'Inspected',
  AWAITING_FINANCE: 'Awaiting finance review',
  REFUND_IN_PROGRESS: 'Refund processing',
  REFUNDED: 'Refunded',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

// The six steps a customer sees on the happy path. Rejected or Cancelled replaces the remaining steps.
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
  REQUESTED: [STATUS.APPROVED, STATUS.PENDING_REVIEW, STATUS.CANCELLED],
  PENDING_REVIEW: [STATUS.APPROVED, STATUS.REJECTED, STATUS.CANCELLED],
  APPROVED: [STATUS.IN_TRANSIT, STATUS.CANCELLED],
  IN_TRANSIT: [STATUS.RECEIVED],
  RECEIVED: [STATUS.INSPECTED],
  INSPECTED: [STATUS.AWAITING_FINANCE, STATUS.REFUND_IN_PROGRESS, STATUS.REJECTED],
  AWAITING_FINANCE: [STATUS.REFUND_IN_PROGRESS, STATUS.REJECTED],
  REFUND_IN_PROGRESS: [STATUS.REFUNDED],
  REFUNDED: [],
  REJECTED: [],
  CANCELLED: [],
}

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false
export const isFinal = (status) => TRANSITIONS[status]?.length === 0
/** Final states that end the return without a refund. */
export const isClosedWithoutRefund = (status) => status === STATUS.REJECTED || status === STATUS.CANCELLED

/**
 * Customer view of a backend status. Review, finance and refund-processing states are internal:
 * PENDING_REVIEW shows as "Requested"; AWAITING_FINANCE and REFUND_IN_PROGRESS show as "Inspected".
 */
export function toCustomerStep(status) {
  if (status === STATUS.PENDING_REVIEW) return STATUS.REQUESTED
  if (status === STATUS.AWAITING_FINANCE || status === STATUS.REFUND_IN_PROGRESS) return STATUS.INSPECTED
  return status
}

export const FINANCE_APPROVAL_THRESHOLD_INR = 10000
// Refunds strictly above this need finance approval (₹10,000 in paise).
export const FINANCE_APPROVAL_THRESHOLD_PAISE = FINANCE_APPROVAL_THRESHOLD_INR * 100
