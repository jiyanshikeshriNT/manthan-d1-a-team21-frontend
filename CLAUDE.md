# ReturnRight frontend

Retail returns and refunds portal (Track A): customer returns, warehouse grading, finance refunds, manager dashboard.
React 19 (JavaScript + JSDoc types) · Vite 8 · Tailwind CSS 4 · React Router 8 (imports from `react-router`) · TanStack Query 5 · MSW 3 · Vitest 5 + Testing Library. Package manager: npm.
Backend: Spring Boot on http://localhost:8080. API contract: `docs/api-contract.md` (a frontend draft until the backend confirms it).
Wireframes: `docs/returnright-wireframes.html` (layout reference only; its colours are outdated, the tokens below win).

This file is the shared team reference. It is checked in. Personal preferences do not go here (see "Local preferences").

## Commands
- `npm install`: install dependencies (use npm only; do not commit yarn or pnpm lockfiles)
- `npm run dev`: dev server on http://localhost:5173. `/api` is proxied to :8080, so there is no CORS in dev.
- `npm run build`: production build into `dist/`
- `npm run lint`: oxlint (config in `.oxlintrc.json`)
- `npm test`: Vitest, run once. `npm run test:watch` runs in watch mode.
- Env (`.env.local`, see `.env.example`):
  - `VITE_USE_MOCKS=true` answers API calls with MSW in the browser.
  - `VITE_API_BASE_URL` is the API origin for production builds.

## Architecture
- `src/main.jsx`: starts MSW when mocks are on, then mounts `ErrorBoundary` › `QueryClientProvider` › `RouterProvider` + `Toaster`.
- `src/router.jsx`: all routes. A route `errorElement` catches render errors.
  - Public (`PublicLayout`, mobile-first; header has only the logo, footer links the policies): `/`, `/return/new` (wizard), `/return/:returnId` (status), `/login`, `/return-policy`, `/privacy`
  - `src/pages/legal/`: the two policy pages (placeholder text, flagged as such on the page) on a shared `PolicyPage` shell. The return policy takes every number from `src/domain`.
  - Staff (`StaffLayout`), each behind `<RequireRole roles=[…]>`: `/warehouse` (WAREHOUSE, MANAGER), `/finance` (FINANCE, MANAGER), `/manager` (MANAGER)
- `src/auth/`:
  - `session.js` stores `{token, role}` in memory, mirrored to sessionStorage.
  - `useSession` is the React hook for it.
  - `RequireRole` sends signed-out users to `/login?next=…`, and shows "no access" when the role is wrong.
- `src/api/`:
  - `client.js`: `request()` adds the bearer token and `Idempotency-Key`, and turns error responses into `ApiError{status, code, message}`. A 401 redirects to `/login`.
  - `hooks.js`: the TanStack hooks and the JSDoc types for the contract.
  - `queryClient.js`: sends API errors to the global toast. Calls that show their own errors set `meta: { silent: true }`.
- `src/mocks/`: MSW handlers and data (browser worker plus a node server for tests). Staff mock logins are in `data.js`.
- `src/components/ui/`: `Button`, `Input`/`Select`/`Textarea` (built on `Field`, which wires `aria-describedby`), `Card`, `Badge`, `StatusBadge`, `Alert`, `Spinner`, `EmptyState`. Also `StatusTimeline`, `ErrorBoundary`, and `toast/` (a store usable outside React, plus `Toaster`).
- `src/pages/customer/return-wizard/`: the 4-step wizard.
  - State lives in one `useReducer` (`wizardState.js`), so data survives Back.
  - Steps are in `steps/`.
  - Tests are in `__tests__/`.
- `src/pages/warehouse/`: keyboard-first inspection.
  - `ScanBox` takes focus on load and after each finished return.
  - `InspectionForm` moves focus to the first grade button after a scan, then reads keys for the focused item row: `1/2/3` grade, `a/p/r` decision, `Ctrl+Enter` submit.
  - It sends the return's `version`. `STALE_VERSION` and `ILLEGAL_TRANSITION` show a "Reload return" button.
  - `ItemInspection` is one row. `PhotoLightbox` is shared with finance.
- `src/pages/finance/`: `ApprovalsPage` (filter, sort by age or amount), `QueueTable`, `FinanceDrawer`.
  - The drawer has a confirm step showing the amount, a required note for Reject, and an Idempotency-Key per confirmed attempt.
  - It handles `SEPARATION_OF_DUTIES` (403), stale versions, and `REFUND_FAILED` with a retry button.
- `src/api/staff.js`: the warehouse and finance hooks and types.
- `src/lib/refund.js`: refund preview maths (A and B 100%, C 50%, reject 0, integer paise, round half up). It must match the backend.
- `src/components/ui/Modal.jsx` (native `<dialog>`, `center` or `drawer`), `Segmented.jsx` (large radio buttons), `Kbd.jsx`.
- `src/pages/customer/ReturnDetailPage.jsx` + `return-detail/`: status page.
  - Polls `useReturn` every 15 s until a final status. TanStack pauses it while the tab is hidden and refetches on focus.
  - The timeline reloads when the status changes (its query key includes the status).
  - `LabelCard` prints only the label through the `.print-label` rules in `index.css`.
  - `ItemsTable` shows status, grade and refund, with the Grade C 50% note.
- `src/components/StatusTimeline.jsx`: vertical on mobile, horizontal from `md`. It draws the steps from `domain/timelineModel.js` (`buildTimeline`, pure and tested).
- `src/domain/`:
  - `returnStatus.js`: the state machine.
  - `returns.js`: reasons, refund methods, ineligibility badges and microcopy, photo limits.
- `src/lib/format.js`: `formatINR(paise)`, date formatters, `cx()`.
- `src/styles/index.css`: Tailwind `@theme` tokens. This is the only place colour values are defined.

## Motion
- Entrances are one-shot and short (`animate-fade-up`, `animate-pop-in`, `animate-grow-x/y`, `animate-pulse-ring` for the current step), all defined in the `@theme` block of `index.css`.
- `prefers-reduced-motion` switches them off globally. New animations must go through those tokens, never custom per-component keyframes.

## Conventions
- Money is integer paise everywhere. Display it only through `formatINR`.
- JS + JSDoc, no TypeScript. Keep the JSDoc typedefs in `src/api/hooks.js` in sync with `docs/api-contract.md` and the mocks.
- Staff writes send the `version` the user saw. Never retry a write that got a 409 without reloading first.
- Every submit button uses `loading`/`disabled` plus a ref guard against double submits. Create-type POSTs send an `Idempotency-Key`.
- Form errors go through `Field`, so they are tied to inputs with `aria-describedby`/`aria-invalid`.
- The order lookup shows one generic failure message, never a hint about which field is wrong. A 429 has its own message.
- Tests: Vitest + Testing Library + the MSW node server (`src/test/setup.js`). Render wizard steps with `renderStep()` from `src/test/renderWithProviders.jsx`.

## Return state machine (must match the backend)
- REQUESTED → APPROVED | REJECTED
- APPROVED → IN_TRANSIT
- IN_TRANSIT → RECEIVED
- RECEIVED → INSPECTED
- INSPECTED → PENDING_FINANCE | REFUND_PROCESSING | REJECTED
- PENDING_FINANCE → REFUND_PROCESSING | REJECTED
- REFUND_PROCESSING → REFUNDED | REFUND_FAILED
- REFUND_FAILED → REFUND_PROCESSING (retry)
- REFUNDED and REJECTED are final.
- Customers see PENDING_FINANCE and REFUND_PROCESSING as "Inspected", and REFUND_FAILED as "Refund retrying" (`toCustomerStep`, `StatusBadge`, `buildTimeline`). The customer API never exposes the flagged state.
- Every state change is written to the audit log by the backend.
- Never offer a transition in the UI that is not in `TRANSITIONS`.

## Return and refund rules
- Return window: 30 days standard, 10 days for electronics. Innerwear and perishables are never returnable.
- Warehouse grades: A = 100% refund, B = 100% refund, C = 50% refund.
- Refunds above ₹10,000 need finance approval. Smaller refunds are paid automatically.
- A customer with more than 3 returns in 30 days is flagged for review.
- Refunds are idempotent. Every pay request sends `Idempotency-Key: refund:<returnId>:<itemId>`. Disable the button while a request is in flight, but the backend is the real guarantee.
- Refusal messages always say why, e.g. "Electronics can be returned within 10 days. This was delivered 14 days ago."

## Design system

### Design philosophy
- **Vibe:** clean, trustworthy, high-contrast operational utility (inspired by Stripe and Linear).
- **Customer Portal** (`/`, `/return`, `/track/*`): airy white surfaces (`--color-surface`), clear stepper progress, reassuring teal-emerald and slate tones. Must work at 375px wide.
- **Warehouse & Finance Ops** (`/staff/*`): dense layouts on the cool-grey canvas (`--color-canvas`) with crisp borders (`--color-line`) for fast scanning and A/B/C grading. Keyboard-first on the warehouse screen.
- **Type:** Inter (variable, self-hosted via `@fontsource-variable/inter`) for UI, IBM Plex Mono for order IDs, return IDs and SKUs. Use the `tabular` utility (`tabular-nums`) for INR amounts and table numbers.
- **Tailwind:** the default palette is switched off (`--color-*: initial`). Tokens are used as utilities: `bg-primary`, `text-muted`, `border-line`, `border-line-strong`, `bg-danger-soft`, `text-ink`, `bg-canvas`, `bg-surface`, `bg-chart-1`.
- **Touch targets:** interactive controls are at least 44px (`min-h-11` / `size-11`).

### Core brand tokens
| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#0F766E` teal-emerald | Main CTAs ("Submit return", "Approve refund"), active stepper steps, active nav |
| `--color-primary-hover` | `#115E59` | Primary hover |
| `--color-primary-soft` | `#F0FDFA` | Selected rows, primary badges |
| `--color-secondary` | `#334155` slate 700 | Secondary buttons ("Download return label", "Cancel"), staff headers, table headers, active filters |
| `--color-secondary-hover` | `#1E293B` | Secondary hover |
| `--color-secondary-soft` | `#F1F5F9` | Secondary tint |
| `--color-accent` | `#4F46E5` indigo 600 | Store-credit highlights, QR scan focus ring, links |

### Neutral surfaces and text
| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#F8FAFC` slate 50 | App background (staff screens); reduces glare |
| `--color-surface` | `#FFFFFF` | Cards, modals, customer screens |
| `--color-line` | `#E2E8F0` slate 200 | Dividers and card edges only (decorative, 1.2:1) |
| `--color-line-strong` | `#64748B` slate 500 | Input, checkbox and radio outlines (4.8:1, meets the 3:1 rule for UI controls) |
| `--color-ink` | `#0F172A` slate 900 | Body text, order IDs, INR amounts |
| `--color-muted` | `#475569` slate 600 | Timestamps, SKUs, helper text |

### Semantic status and grading tokens
Each status has a foreground (`--color-<status>`) and a background tint (`--color-<status>-soft`), e.g. `text-warning bg-warning-soft`.

| Token | Fg / bg | Applies to |
|---|---|---|
| success | `#15803D` / `#F0FDF4` | `Approved`, `Refunded`, Grade A, completed ledger payouts |
| warning | `#B45309` / `#FFFBEB` | Grade C (50% rule), flagged customers, pending finance review (> ₹10,000) |
| danger | `#B91C1C` / `#FEF2F2` | `Rejected`, ineligible items (innerwear, perishables, window expired), rejected inspections |
| info | `#0369A1` / `#F0F9FF` | `Requested`, `In transit`, `Received`, `Inspected` |

Grade B has no colour yet (see Known gaps). Until it is decided, show it with the secondary tokens plus its label.

### Manager dashboard chart palette (Okabe-Ito derived, colour-blind safe)
Use in this order for category return rates, top reasons and cycle-time charts: `--color-chart-1` … `--color-chart-6`.
1. `#0F766E` teal (5.5:1 on white)
2. `#D97706` amber (3.2:1): fine for bars and lines, **never for text**
3. `#2563EB` royal blue (5.2:1)
4. `#7C3AED` violet (5.7:1)
5. `#DB2777` magenta (4.6:1)
6. `#475569` cool slate (7.6:1)

## Accessibility rules (mandatory)
- **Contrast:** all text meets WCAG AA, **at least 4.5:1** against its actual background (3:1 only for text 24px or larger, or 19px bold). Input borders, focus rings and chart marks need **at least 3:1**. Check every new colour pair before merging; never assume a tint works.
- Verified text pairs (light theme): white on primary 5.5, white on secondary 10.4, white on accent 6.3, primary text on canvas 17.1, muted text on white 7.6, success/warning/danger/info on their tints 4.8 / 4.8 / 5.9 / 5.6.
- **Never colour alone.** Every status badge shows its text label ("Refunded", "Not returnable", "Grade C · 50%"). An icon is an extra, not a replacement. Ineligible items also show the reason sentence.
- **Charts:** label values directly on bars or segments, or give a legend with text plus a pattern or position cue. Do not use the chart palette for text.
- Visible focus on every interactive element (`:focus-visible`, accent ring). Warehouse actions must work from the keyboard.

## Team collaboration rules
- **Shared files need their own small PR.** `src/styles/index.css` (tokens), `src/domain/returnStatus.js` (status enums, transitions, thresholds) and `src/components/*` are shared. Do not change them inside a feature PR. Open a separate PR, tag the team, and update this file in the same PR.
- **Tokens:** use CSS variables only, never literal hex or rgb values in components or page CSS. Add new tokens instead of renaming or repurposing existing ones. To remove a token, first confirm nothing uses it (`grep -r "\-\-token-name" src`).
- **Status enums:** `STATUS` values mirror the backend exactly. A new status or transition needs the backend change, the `TRANSITIONS` update, the timeline and badge mapping, and this file, all agreed before merge.
- **Business numbers** (windows, 50%, ₹10,000, 3-in-30) live as named constants in `src/domain/`. Do not hard-code them in pages or copy.
- **Shared components:** extend through props. Do not fork a copy into a page folder. Breaking prop changes need every caller updated in the same PR.
- **Ownership by folder:** one developer per `src/pages/<role>/` area at a time, which keeps merge conflicts rare.
- **Branches:** `feature/<role>-<short-name>`, `fix/<short-name>`. Rebase on `main` before opening a PR. Keep PRs small: plan first, implement one verified step at a time, commit after each step.
- **Dependencies:** add packages in a dedicated PR. Only that PR touches `package-lock.json`.
- Before pushing: `npm run lint` and `npm run build` must pass.

## Local preferences (keep out of this file)
- Personal instructions go in `CLAUDE.local.md` (gitignored) or your user-level `~/.claude/CLAUDE.md`.
- The whole `.claude/` folder is gitignored (settings, dev-server launch config). Do not commit it.
- Environment values go in `.env.local` (gitignored). Only `.env.example` is committed.
- Editor settings stay out of the repo (`.vscode/*` is ignored except `extensions.json`).

## Known gaps (remove each line when resolved)
- No dark theme is specified. Do not add dark values until the team agrees on a palette that passes the same contrast checks.
- Grade B has no assigned colour.
- No CI pipeline yet. The real backend is not connected; screens run on MSW mocks.

## Keeping this file current (mandatory)
- Update this file **in the same PR** as any change to commands, scripts, dependencies, routes or folder structure, design tokens, status enums or transitions, grading or refund rules, or team workflow.
- When Claude makes or reviews such a change, it must propose or apply a short update here.
- Delete stale entries instead of adding contradictions. Keep entries short, and check facts against the code (e.g. `package.json` versions) before writing them.
- If the code and this file disagree, raise it in the PR. Do not silently follow either one.
