// Customer-facing return rules and microcopy. Numbers here mirror the backend rules in CLAUDE.md.

/** Days after delivery an item can be returned (day 0 = delivery day). */
export const RETURN_WINDOW_DAYS = { STANDARD: 30, ELECTRONICS: 10 }
export const GRADE_C_REFUND_FACTOR = 0.5
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const RETURN_REASONS = [
  { value: 'WRONG_SIZE', label: 'Wrong size' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'CHANGED_MIND', label: 'Changed mind' },
  { value: 'OTHER', label: 'Other' },
]

export const reasonLabel = (v) => RETURN_REASONS.find((r) => r.value === v)?.label ?? v

export const REFUND_METHODS = [
  {
    value: 'ORIGINAL',
    label: 'Original payment',
    description: 'Back to the card, UPI or wallet you paid with, 5–7 working days after inspection.',
  },
  {
    value: 'STORE_CREDIT',
    label: 'Store credit',
    description: 'Added to your ReturnRight wallet as soon as the inspection is done.',
  },
]

export const refundMethodLabel = (v) => REFUND_METHODS.find((m) => m.value === v)?.label ?? v

/**
 * Badge text and fallback explanation for each eligibility reasonCode.
 * The server's `message` is shown when present; `fallback` covers a missing one.
 */
export const INELIGIBLE_REASONS = {
  WINDOW_CLOSED: {
    badge: 'Window closed',
    fallback: 'The return window for this item has ended.',
  },
  NON_RETURNABLE_CATEGORY: {
    badge: 'Not returnable',
    fallback: 'Items in this category can’t be returned for hygiene or safety reasons.',
  },
  ALREADY_RETURNED: {
    badge: 'Already returned',
    fallback: 'A return has already been requested for this item.',
  },
  NOT_DELIVERED: {
    badge: 'Not delivered yet',
    fallback: 'You can start a return once this item has been delivered.',
  },
}

export const ineligibleInfo = (code) =>
  INELIGIBLE_REASONS[code] ?? { badge: 'Not returnable', fallback: 'This item can’t be returned.' }
