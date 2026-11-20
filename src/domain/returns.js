// Customer-facing return rules and microcopy. Numbers and enum values mirror the backend (system/CLAUDE.md).

/** Days after delivery an item can be returned (day 0 = delivery day). */
export const RETURN_WINDOW_DAYS = { STANDARD: 30, ELECTRONICS: 10 }
export const GRADE_C_REFUND_FACTOR = 0.5
/** Backend PhotoStorage: JPEG or PNG (checked by magic bytes), at most 5 MB, at most 3 per item. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_PHOTOS_PER_ITEM = 3
export const PHOTO_TYPES = ['image/jpeg', 'image/png']

/** Backend `ReasonCode`. OTHER requires a written reason. */
export const RETURN_REASONS = [
  { value: 'WRONG_SIZE', label: 'Wrong size' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'WRONG_ITEM', label: 'Wrong item sent' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'CHANGED_MIND', label: 'Changed mind' },
  { value: 'OTHER', label: 'Other' },
]

export const REASON_NEEDS_TEXT = 'OTHER'

export const reasonLabel = (v) => RETURN_REASONS.find((r) => r.value === v)?.label ?? v

/** Backend `RefundMethod`. */
export const REFUND_METHODS = [
  {
    value: 'ORIGINAL_PAYMENT',
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
 * Badge text and fallback explanation for each backend `EligibilityCode` (plus QUANTITY_EXCEEDED,
 * which only appears in a refused create request). The server's `message` is shown when present.
 */
export const INELIGIBLE_REASONS = {
  WINDOW_EXPIRED: {
    badge: 'Window closed',
    fallback: 'The return window for this item has ended.',
  },
  CATEGORY_NOT_RETURNABLE: {
    badge: 'Not returnable',
    fallback: 'Items in this category can’t be returned for hygiene or safety reasons.',
  },
  ALREADY_IN_RETURN: {
    badge: 'Already returned',
    fallback: 'All units of this item are already part of a return.',
  },
  NOT_DELIVERED: {
    badge: 'Not delivered yet',
    fallback: 'You can start a return once this item has been delivered.',
  },
  QUANTITY_EXCEEDED: {
    badge: 'Too many units',
    fallback: 'Fewer units of this item can be returned.',
  },
}

export const ineligibleInfo = (code) =>
  INELIGIBLE_REASONS[code] ?? { badge: 'Not returnable', fallback: 'This item can’t be returned.' }
