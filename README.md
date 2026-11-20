# ReturnRight

Returns and refunds portal for an online retailer. Customers request returns, warehouse agents inspect them, finance approves large refunds, and managers watch the numbers.

**Stack:** React 19 (JavaScript), Vite 8, Tailwind CSS 4, React Router 8, TanStack Query 5, MSW 3, Vitest 5. The backend is Spring Boot on `http://localhost:8080`.

## Run locally

Requires Node 20.19 or later.

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCKS=true runs without the backend
npm run dev                  # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. `/api` is proxied to `localhost:8080` |
| `npm test` | Component tests (Vitest + Testing Library + MSW) |
| `npm run lint` | oxlint |
| `npm run build` | Production build. Set `VITE_API_BASE_URL` to the API origin |

### Mock data (`VITE_USE_MOCKS=true`)
- **Order with a mix of returnable items:** `RR-100245` / `priya.sharma@example.com`
- **Order with nothing returnable:** `RR-100310` / `arjun.mehta@example.com`
- **Return status pages, one per state:**
  - `/return/RET-2026-04817`: in transit, with a label that expires in 2 days
  - `/return/RET-2026-04820`: refunded, with a Grade C item
  - `/return/RET-2026-04821`: rejected
  - `/return/RET-2026-04822`: refund failed, retrying
  - `/return/RET-2026-04823`: pending finance (shows as Inspected)
  - `/return/RET-2026-04824`: live. Starts at Approved and moves one step every 20 seconds, so you can watch polling work. A return you create in the wizard behaves the same way.
- **Staff logins:** `warehouse@returnright.test`, `finance@returnright.test`, `manager@returnright.test`. The password for all three is in `src/mocks/data.js`.

### Warehouse and finance demo data
Sign in with a mock staff login (the manager login opens both screens).
- **Warehouse scan tokens:**
  - `RET-2026-04901`: two items, one with 3 units for a Partial accept. The refund stays under ₹10,000, so the outcome is "Refund processing".
  - `RET-2026-04902`: a ₹54,990 laptop. The outcome is "Sent to finance".
  - `RET-2026-04903`: the first submit returns a stale-version conflict, so you can try "Reload return".
- **Keys:** `1/2/3` grade A/B/C, `a/p/r` accept/partial/reject, `Ctrl+Enter` submit.
- **Finance queue:**
  - `RET-2026-04911`: the first approval fails at the gateway, then Retry succeeds.
  - `RET-2026-04913`: approving shows the separation-of-duties message.
  - `RET-2026-04914`: starts as a failed refund.

Some embedded browsers block service workers. The app then shows a notice and calls the real API instead.

## Pages

| URL | Access | What |
|---|---|---|
| `/` | Public | Landing page and return policy |
| `/return/new` | Public | 4-step return wizard |
| `/return/:returnId` | Public | Return status timeline |
| `/login` | Public | Staff sign in |
| `/warehouse` | WAREHOUSE, MANAGER | Scan and keyboard inspection |
| `/finance` | FINANCE, MANAGER | Approval queue and decisions |
| `/manager` | MANAGER | KPIs, charts and flagged customers |

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
- `docs/api-contract.md`: API contract draft (mocks and hooks follow it)
- `docs/returnright-wireframes.html`: low-fidelity wireframes
