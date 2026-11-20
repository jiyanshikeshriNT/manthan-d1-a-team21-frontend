# ReturnRight API: how the frontend uses it

**Source of truth:** the Spring Boot backend, documented in `../system/LLD.md` §4 (Swagger UI at
http://localhost:8080/swagger-ui.html while it runs). This file only maps the screens to the endpoints
and to the adapters in `src/api/` that turn backend DTOs into the view models the screens use.
When the backend contract changes, update the adapter, its JSDoc typedefs, the MSW mocks (`src/mocks/`)
and this file together.

## Conventions
- Base path `/api/v1`. In dev, Vite proxies `/api` to `http://localhost:8080`, so there is no CORS.
- Money is integer **paise**. Timestamps are ISO-8601 UTC; dates (`deadline`, ledger `from`/`to`) are
  `YYYY-MM-DD` in Asia/Kolkata.
- Errors are RFC 7807 ProblemDetail: `{ title, status, detail, code, ...extra }`. `client.js` turns them into
  `ApiError{ status, code, message: detail, data }`.
- Customers: `Authorization: Bearer <accessToken>` (scoped to one order, 2 h). Staff: HTTP Basic.

## Customer (`src/api/hooks.js`)
| Screen | Call | Adapter / notes |
|---|---|---|
| Wizard step 1 | `POST /customer/session {orderNumber, email}` → `{accessToken, expiresAt}` | Stored by `customerSession.js`. Any miss → 404 `ORDER_NOT_FOUND` (one generic message); 429 `RATE_LIMITED`. |
| Wizard step 2 | `GET /customer/orders/{orderNumber}` | `toEligibility`: `orderLineId` → `orderItemId` (string), `eligibility{eligible, code, message, returnableQty, deadline}` → flat fields + `daysLeft` (from the IST deadline). Codes: `ELIGIBLE`, `CATEGORY_NOT_RETURNABLE`, `WINDOW_EXPIRED`, `NOT_DELIVERED`, `ALREADY_IN_RETURN`. |
| Wizard step 4 | `POST /customer/returns` multipart: part `request` (JSON `{orderNumber, refundMethod, items[{orderLineId, qty, reasonCode, reasonText?}]}`) + files `photos_{orderLineId}` (JPEG/PNG, ≤ 5 MB, ≤ 3 per item); header `Idempotency-Key` | 201 ReturnDto (a replay answers 201 with `Idempotent-Replayed: true`). 422 `ITEM_NOT_RETURNABLE` with `items[{orderLineId, code, message}]`; 400 `PHOTO_INVALID`. `reasonText` is required for `OTHER`. |
| Status page | `GET /customer/returns/{rma}` | `toReturnDetail`: items get `status` from `decision`, `grade` from `conditionGrade`; `timeline[{step, state, at, note}]` → `events` for `buildTimeline`; the `failed` step's note → `closingNote`. 401 → `VerifyOrderCard`. |
| Label | `GET /customer/returns/{rma}/label` → `{rma, labelCode, qrCodeUrl, instructions}`, then `GET qrCodeUrl` (PNG) | Only for APPROVED…REFUNDED (409 otherwise). The PNG needs the bearer token, so it is fetched as a blob. |
| Actions | `POST /customer/returns/{rma}/ship`, `/cancel` | Return the updated ReturnDto; 409 `INVALID_TRANSITION` if the return moved on. |

Enums: `refundMethod` `ORIGINAL_PAYMENT | STORE_CREDIT`; `reasonCode` `DAMAGED | DEFECTIVE | WRONG_ITEM |
WRONG_SIZE | NOT_AS_DESCRIBED | CHANGED_MIND | OTHER`; return `status` as in `src/domain/returnStatus.js`.

## Staff sign-in (`src/api/staff.js`)
`GET /staff/me` with the Basic credentials → `{username, role}`. Only then is the session stored.

## Warehouse (`src/api/staff.js`)
| Action | Call |
|---|---|
| Scan a label code `RR-{rma}-{hmac8}` | `GET /warehouse/labels/{labelCode}` (400 `LABEL_INVALID` if forged) |
| Type an RMA / reload after a conflict | `GET /warehouse/returns/{rma}` |
| Photo of a label | `POST /warehouse/labels/decode` (multipart `image`) → `{labelCode, rma}`, then as a scan |
| Mark received (IN_TRANSIT only) | `POST /warehouse/returns/{rma}/receive` `{labelCode?}` |
| Inspect | `POST /warehouse/returns/{rma}/inspection {items[{itemId, grade, decision: ACCEPTED\|REJECTED, acceptedQty?, note?}]}` |

`toWarehouseReturn` maps `WarehouseReturnView{returnId (UUID), rma, items[{itemId, requestedQty…}]}`;
`toInspectionItem` maps the form's Accept / Partial / Reject. The response's `status` is the outcome:
`AWAITING_FINANCE` (> ₹10,000), `REFUND_IN_PROGRESS` or already `REFUNDED`, or `REJECTED` (nothing accepted).

## Finance (`src/api/staff.js`)
| Action | Call |
|---|---|
| Queue | `GET /finance/refunds?status=AWAITING_APPROVAL`, `FAILED`, `UNKNOWN` → RefundView[] (`toQueueRow`) |
| Drawer | `GET /finance/refunds/{id}` → `{refund, rma, orderNumber, returnStatus, flagged, flagReason, items[]}` (`toFinanceReturn`) |
| Approve / reject / retry | `POST /finance/refunds/{id}/approve`, `/reject {reason}`, `/retry` → RefundView |
| Ledger | `GET /finance/ledger?from&to` → `{from, to, entries[], totalDebitPaise, totalCreditPaise, balanced}` |

## Manager (`src/api/manager.js`)
| Action | Call |
|---|---|
| Dashboard | `GET /manager/dashboard` → `toMetrics` (categories with `returnable`, sold/returned **units**, `returnRate`; `topReasons`; `cycleTime`) and `toFlagged` (masked emails) |
| Review queue | `GET /manager/reviews`; `POST /manager/reviews/{rma}/approve`, `/reject {reason}` |
| Audit trail | `GET /manager/audit?entityId=` (return UUID or refund id) |
| Gateway drill | `GET`, `PUT /admin/gateway/faults {mode, latencyMs}` (non-prod; 404 hides the panel) |
