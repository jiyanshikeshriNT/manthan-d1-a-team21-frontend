# ReturnRight frontend

Retail returns and refunds portal (Track A): customer returns, warehouse grading, finance refunds, manager dashboard.
React 19 + Vite 8 + React Router 8 (imports from `react-router`). Package manager: npm.
Wireframes: `docs/returnright-wireframes.html` (layout reference only; its colours are outdated, the tokens below win).

This file is the shared team reference. It is checked in. Personal preferences do not go here (see "Local preferences").

## Commands
- `npm install`: install dependencies (use npm only; do not commit yarn or pnpm lockfiles)
- `npm run dev`: dev server on http://localhost:5173
- `npm run build`: production build into `dist/`
- `npm run lint`: oxlint (config in `.oxlintrc.json`)
- No test runner yet. When one is added, document its command here.

## Architecture
- `src/main.jsx`: mounts `RouterProvider`.
- `src/router.jsx`: all routes.
  - Customer Portal (`CustomerLayout`, phone-first): `/`, `/return`, `/track/:returnId`
  - Warehouse & Finance Ops (`StaffLayout`, sidebar): `/staff/warehouse`, `/staff/finance`, `/staff/manager`
- `src/pages/<role>/`: one folder per persona (customer, warehouse, finance, manager).
- `src/layouts/`: `CustomerLayout`, `StaffLayout`.
- `src/components/`: shared UI (`Stepper`, `StatusTimeline`, `PagePlaceholder`, which is temporary and gets deleted once all pages are built).
- `src/domain/returnStatus.js`: return state machine (`STATUS`, `TRANSITIONS`, `TIMELINE`, `canTransition`) and `FINANCE_APPROVAL_THRESHOLD_INR`.
- `src/api/client.js`: `api(path, { method, body, idempotencyKey })` fetch wrapper. Base URL from `VITE_API_URL` (see `.env.example`).
- `src/styles/index.css`: the only place colour values are defined.

## Return state machine (must match the backend)
- REQUESTED → APPROVED | REJECTED
- APPROVED → IN_TRANSIT
- IN_TRANSIT → RECEIVED
- RECEIVED → INSPECTED
- INSPECTED → REFUNDED | REJECTED
- REFUNDED and REJECTED are final.
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
- **Customer Portal** (`/`, `/return`, `/track/*`): airy white surfaces (`--bg-surface`), clear stepper progress, reassuring teal-emerald and slate tones. Must work at 375px wide.
- **Warehouse & Finance Ops** (`/staff/*`): dense layouts on the cool-grey canvas (`--bg-canvas`) with crisp borders (`--border-subtle`) for fast scanning and A/B/C grading. Keyboard-first on the warehouse screen.
- **Type:** IBM Plex Sans for UI, IBM Plex Mono for order IDs, return IDs and SKUs. Use `font-variant-numeric: tabular-nums` for INR amounts and table numbers.

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
| `--bg-canvas` | `#F8FAFC` slate 50 | App background (staff screens); reduces glare |
| `--bg-surface` | `#FFFFFF` | Cards, modals, customer screens |
| `--border-subtle` | `#E2E8F0` slate 200 | Dividers and card edges only (decorative, 1.2:1) |
| `--border-strong` | `#64748B` slate 500 | Input, checkbox and radio outlines (4.8:1, meets the 3:1 rule for UI controls) |
| `--text-primary` | `#0F172A` slate 900 | Body text, order IDs, INR amounts |
| `--text-muted` | `#475569` slate 600 | Timestamps, SKUs, helper text |

### Semantic status and grading tokens
Each status has a foreground (`--status-*`) and a background tint (`--status-*-bg`).

| Token | Fg / bg | Applies to |
|---|---|---|
| success | `#15803D` / `#F0FDF4` | `Approved`, `Refunded`, Grade A, completed ledger payouts |
| warning | `#B45309` / `#FFFBEB` | Grade C (50% rule), flagged customers, pending finance review (> ₹10,000) |
| danger | `#B91C1C` / `#FEF2F2` | `Rejected`, ineligible items (innerwear, perishables, window expired), rejected inspections |
| info | `#0369A1` / `#F0F9FF` | `Requested`, `In transit`, `Received`, `Inspected` |

Grade B has no colour yet (see Known gaps). Until it is decided, show it with the secondary tokens plus its label.

### Manager dashboard chart palette (Okabe-Ito derived, colour-blind safe)
Use in this order for category return rates, top reasons and cycle-time charts: `--chart-1` … `--chart-6`.
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
- Personal Claude settings go in `.claude/settings.local.json` (gitignored). `.claude/launch.json` is shared (dev server config).
- Environment values go in `.env.local` (gitignored). Only `.env.example` is committed.
- Editor settings stay out of the repo (`.vscode/*` is ignored except `extensions.json`).

## Known gaps (remove each line when resolved)
- `src/styles/index.css` still uses the old wireframe palette and token names (`--bg`, `--ink`, `--accent`, …), plus a dark-mode block. It must be migrated to the tokens above.
- No dark theme is specified. Do not add dark values until the team agrees on a palette that passes the same contrast checks.
- Grade B has no assigned colour.
- No backend, test runner or CI yet.

## Keeping this file current (mandatory)
- Update this file **in the same PR** as any change to commands, scripts, dependencies, routes or folder structure, design tokens, status enums or transitions, grading or refund rules, or team workflow.
- When Claude makes or reviews such a change, it must propose or apply a short update here.
- Delete stale entries instead of adding contradictions. Keep entries short, and check facts against the code (e.g. `package.json` versions) before writing them.
- If the code and this file disagree, raise it in the PR. Do not silently follow either one.
