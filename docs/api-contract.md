# ReturnRight API contract (frontend draft)

**Status:** inferred by the frontend team from the Track A spec. The backend team must confirm or correct it.
The MSW mocks (`src/mocks/handlers.js`) and the hooks (`src/api/hooks.js`) follow this file. Change all three together.

## Conventions
- Base path `/api`. JSON bodies, camelCase fields.
- Money is integer **paise** (`129900` = ₹1,299). Fields end in `Paise`.
- Timestamps are ISO-8601 UTC strings.
- Errors: HTTP status plus `{ "error": { "code": "ORDER_NOT_FOUND", "message": "…" } }`.
- Staff endpoints need `Authorization: Bearer <token>`. A 401 sends the user to `/login`.
- `429` means rate limited.

## Auth
`POST /api/auth/login`
- Body: `{ email, password }`
- 200: `{ token, role }`, where `role` is `WAREHOUSE | FINANCE | MANAGER`
- 401: `INVALID_CREDENTIALS`

## Customer
`POST /api/orders/lookup` (rate limited)
- Body: `{ orderNumber, email }`
- 200: `{ orderId, orderNumber, placedAt, deliveredAt }`
- 404: `ORDER_NOT_FOUND`. This is the same response whichever field is wrong.
- 429: `TOO_MANY_ATTEMPTS`

`GET /api/orders/{orderId}/eligibility`
- 200: `{ orderId, items: EligibilityItem[] }`
- `EligibilityItem`: `{ orderItemId, productName, sku, category, unitPricePaise, quantity, returnableQuantity, imageUrl?, eligible, reasonCode, message, daysLeft }`
- `reasonCode`: `ELIGIBLE | WINDOW_CLOSED | NON_RETURNABLE_CATEGORY | ALREADY_RETURNED | NOT_DELIVERED`
- `message`: a customer-ready explanation, e.g. "Electronics can be returned within 10 days. This was delivered 14 days ago."
- `daysLeft`: an integer for eligible items, otherwise `null`

`POST /api/returns`
- Header: `Idempotency-Key: <uuid>` (one per wizard session). If the same key is sent again, the server returns the original result and does not create a second return.
- Body: `{ orderId, email, refundMethod: ORIGINAL | STORE_CREDIT, items: [{ orderItemId, quantity, reason, reasonNote? }] }`
- `reason`: `WRONG_SIZE | DAMAGED | NOT_AS_DESCRIBED | CHANGED_MIND | OTHER`
- 201 (or 200 on an idempotent replay): `{ returnId, status, items: [{ returnItemId, orderItemId }] }`

`POST /api/returns/{returnId}/items/{returnItemId}/photo`
- multipart/form-data, field `file`, jpeg/png/webp, at most 5 MB
- 204

`GET /api/returns/{returnId}` (polled every 15 s until `REFUNDED` or `REJECTED`)
- 200: `{ returnId, orderNumber, status, refundMethod, estimatedRefundPaise, refundedPaise, rejectionReason, createdAt, items }`
- `status`: `REQUESTED | APPROVED | IN_TRANSIT | RECEIVED | INSPECTED | PENDING_FINANCE | REFUND_PROCESSING | REFUND_FAILED | REFUNDED | REJECTED`
- `items[]`: `{ returnItemId, productName, quantity, reason, unitPricePaise, status, grade, refundPaise }`
  - `status`: `AWAITING_INSPECTION | ACCEPTED | REJECTED`
  - `grade`: `A | B | C`, or `null` before inspection
  - `refundPaise`: `null` before inspection. Grade C is already reduced to 50%.
- `rejectionReason` is a customer-safe sentence or `null`. `refundedPaise` is `null` until `REFUNDED`.
- The customer API must never include the flagged state or internal notes.
- 404: `RETURN_NOT_FOUND`

`GET /api/returns/{returnId}/timeline`
- 200: `{ returnId, events: [{ status, at }] }`, oldest first, using the raw backend statuses. The UI shows `PENDING_FINANCE` and `REFUND_PROCESSING` as "Inspected".

`GET /api/returns/{returnId}/label`
- 200: `{ labelNumber, qrPngBase64, expiresAt }`. `qrPngBase64` is the PNG without the `data:` prefix.
- The page asks for it only while the status is `APPROVED` or `IN_TRANSIT`.

## Warehouse (roles WAREHOUSE, MANAGER)
Every write carries the `version` the user saw. If the return changed since, the server answers `409 STALE_VERSION`.

`POST /api/warehouse/scan`
- Body: `{ token }`. The token is what the label's QR code contains (the return ID in the mocks).
- 200: `{ returnId, orderNumber, status, version, items: [{ returnItemId, productName, sku, quantity, unitPricePaise, reason, reasonNote, photoUrl }] }`
- Scanning moves an `IN_TRANSIT` return to `RECEIVED`. `photoUrl` is `null` when the customer sent none.
- 404 `RETURN_NOT_FOUND`. 409 `ILLEGAL_TRANSITION` if the return was already inspected.

`GET /api/warehouse/returns/{returnId}`
- Same body as the scan. Used by "Reload return" after a conflict.

`POST /api/warehouse/returns/{returnId}/inspect`
- Body: `{ version, items: [{ returnItemId, grade: A|B|C|null, decision: ACCEPT|PARTIAL|REJECT, acceptedQty? }] }`
- `acceptedQty` is sent only for `PARTIAL`, from 1 to quantity − 1. `grade` is `null` only when rejecting.
- Refund per item: A and B 100%, C 50%, reject 0, integer paise, round half up. The server recalculates it; the UI preview must match.
- 200: `{ returnId, status, version, refundPaise, outcome }`. `outcome` is `PENDING_FINANCE` (total above ₹10,000), `REFUND_PROCESSING` or `REJECTED` (total is 0).
- 409 `STALE_VERSION` or `ILLEGAL_TRANSITION`.

## Finance (roles FINANCE, MANAGER)
`GET /api/finance/queue`
- 200: `{ items: [{ returnId, orderNumber, customerName, flagged, status, refundPaise, gradeSummary: { A, B, C }, submittedAt }] }`
- `status` is `PENDING_FINANCE` or `REFUND_FAILED`. `flagged` is staff-only information.

`GET /api/finance/returns/{returnId}`
- 200: the queue row plus `{ version, flagReason, refundMethod, failureReason, items: [{ returnItemId, productName, quantity, grade, decision, acceptedQty, refundPaise, photoUrl }] }`

`POST /api/finance/returns/{returnId}/decision`
- Headers: `Idempotency-Key` (one per confirmed attempt)
- Body: `{ version, decision: APPROVE|REJECT, note? }`. `note` is required for `REJECT` (400 `NOTE_REQUIRED`).
- 200: `{ returnId, status, version, failureReason }`, where `status` is `REFUNDED`, `REJECTED` or `REFUND_FAILED`
- 403 `SEPARATION_OF_DUTIES`: the user may not decide on a return they handled earlier.
- 409 `STALE_VERSION` or `ILLEGAL_TRANSITION`

`POST /api/finance/returns/{returnId}/retry-refund`
- Header: `Idempotency-Key`. Only valid while the status is `REFUND_FAILED`.
- 200: `{ returnId, status, version, failureReason }`. 409 `ILLEGAL_TRANSITION` otherwise.

## Manager (role MANAGER)
`GET /api/manager/metrics`
- 200: `{ periodDays, avgCycleTimeHours, returnRateByCategory, topReasons }`
- `returnRateByCategory[]`: `{ category, returnable, returns, orders, returnRate }`. `returnRate` is a fraction (`0.189` means 18.9%).
- `topReasons[]`: `{ reason, count }`, where `reason` uses the return reason codes.
- `avgCycleTimeHours` runs from request to refund, and is `null` when nothing was refunded in the period.
- The overall return rate is calculated by the UI as the sum of `returns` divided by the sum of `orders`.

`GET /api/manager/flagged`
- 200: `{ customers: [{ customerId, customerName, returnCount30d, lastReturnAt }] }`. Lists customers with more than 3 returns in the last 30 days.

## Open questions for the backend
- Should `GET /api/returns/{id}` require proof of ownership (email or a signed token in the link)?
- Is a photo per item right, or one photo per return?
