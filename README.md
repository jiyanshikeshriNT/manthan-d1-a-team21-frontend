# ReturnRight

Returns and refunds portal for an online retailer. Customers request returns, warehouse agents inspect them, finance approves large refunds, and managers watch the numbers.

**Stack:** React 19 (JavaScript), Vite 8, Tailwind CSS 4, React Router 8, TanStack Query 5, MSW 3, Vitest 5. The backend is Spring Boot on `http://localhost:8080`.

## Run locally

Requires Node 20.19 or later.

```bash
# 1. Backend (in ../system, JDK 17): H2 database + seed data on http://localhost:8080
.\gradlew.bat bootRun --args="--spring.profiles.active=local,seed"

# 2. Frontend
npm install
cp .env.example .env.local   # optional; VITE_USE_MOCKS=true runs without the backend
npm run dev                  # http://localhost:5173, /api is proxied to :8080
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. `/api` is proxied to `localhost:8080` |
| `npm test` | Component tests (Vitest + Testing Library + MSW) |
| `npm run lint` | oxlint |
| `npm run build` | Production build. Set `VITE_API_BASE_URL` to the API origin |

### Walking through a return with the seeded backend
- **Staff logins:** usernames `warehouse`, `finance`, `manager`; password `ReturnRight#2026` (`app.seed.staff-password`). Each role opens only its own workspace, as the API allows.
- **Customer orders:** `ORD-100001` … `ORD-102000`, each with its customer's email (e.g. `ORD-101465` / `asha.menon.87@example.com`). Delivery dates spread over the last 60 days, so you will see open windows, closed windows, non-returnable categories and undelivered orders.
- **Flow:** start a return in the wizard → on the status page print the label and press "I've shipped my parcel" → as `warehouse`, scan or paste the label code (or upload a photo of the QR) and inspect (`1/2/3` grade, `a/p/r` accept/partial/reject, `Ctrl+Enter` submit) → refunds up to ₹10,000 are paid at once; larger ones go to `finance` for approval → the customer's page shows Refunded.
- **More paths:** a customer's 4th return request in 30 days waits for `manager` review; the manager dashboard can switch the mock payment gateway to a fault mode (e.g. "Down") so a refund ends "Outcome unknown" and finance can retry it once the gateway is back.

### Mock mode (`VITE_USE_MOCKS=true`)
MSW answers the same `/api/v1` contract in the browser, with the fixtures in `src/mocks/`. Some embedded browsers block service workers; the app then answers `/api` calls through the same handlers via `fetch`.

## Pages

| URL | Access | What |
|---|---|---|
| `/` | Public | Landing page and return policy |
| `/return/new` | Public | 4-step return wizard |
| `/return/:rma` | Customer session (asks for order number + email if missing) | Return status timeline, label, ship and cancel |
| `/login` | Public | Staff sign in |
| `/warehouse` | WAREHOUSE | Scan, receive and keyboard inspection |
| `/finance` | FINANCE | Refund approvals and retries |
| `/finance/ledger` | FINANCE | Double-entry refund ledger |
| `/manager` | MANAGER | KPIs, charts, review queue, flagged customers, audit trail, gateway drill |

## Accessibility

Automated: `npm test` runs axe-core on every page, the inspection form and the finance drawer, and checks that focus moves on route changes. jsdom can't check colour contrast, so do the browser checks below as well.

### Manual checklist (run before every release)
- [ ] **Browser axe:** run the axe DevTools extension on each page, including colour contrast. Expect 0 violations. Cover every customer page, `/login`, `/warehouse` with a return loaded, `/finance` with the drawer open, and `/manager`.
- [ ] **Keyboard only:** unplug the mouse.
  - Tab through each page. Every control is reachable, the focus ring is always visible, and the order follows the layout.
  - The first Tab on any page shows "Skip to main content".
- [ ] **Route changes:** after following a link, focus lands on the new page's heading and the tab title changes.
- [ ] **Wizard:** Back and Next keep the data. Errors are announced and linked to their fields. The current step is announced.
- [ ] **Warehouse:**
  - Scan, then `1/2/3`, `a/p/r` and `Ctrl+Enter` complete an inspection with no mouse.
  - Focus returns to the scan box afterwards.
  - The photo lightbox closes with Esc and returns focus.
- [ ] **Finance:** the drawer traps focus, Esc closes it, and focus returns to the row button. Buttons stay disabled while a request runs.
- [ ] **Screen reader (NVDA + Firefox or VoiceOver + Safari):**
  - Each chart reads its summary, and the data table is reachable.
  - Status badges read as text.
  - The timeline reads the current step.
  - Polling updates are announced politely.
- [ ] **Zoom and reflow:** at 200% browser zoom and at 320px width nothing is cut off. Only tables scroll sideways, inside their own box.
- [ ] **Layouts:** check 375px, 768px and 1280px for every page.
- [ ] **Reduced motion:** with "reduce motion" on in the OS, nothing animates and charts draw immediately.
- [ ] **Colour:** with a colour-blindness simulator (Chrome DevTools > Rendering), every status still reads from its icon and text.

## Docs
- `CLAUDE.md`: team reference for architecture, design tokens, rules and conventions
- `docs/api-contract.md`: how each screen uses the backend API (`../system/LLD.md` §4 is the source of truth)
- `docs/returnright-wireframes.html`: low-fidelity wireframes
