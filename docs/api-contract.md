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

`GET /api/returns/{returnId}`
- 200: `{ returnId, orderNumber, status, refundMethod, estimatedRefundPaise, createdAt, items: [{ returnItemId, productName, quantity, reason, unitPricePaise }], history: [{ status, at }] }`
- 404: `RETURN_NOT_FOUND`

## Open questions for the backend
- Should `GET /api/returns/{id}` require proof of ownership (email or a signed token in the link)?
- Is a photo per item right, or one photo per return?
