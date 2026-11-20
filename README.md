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
| `/manager` | MANAGER | Dashboard (coming next) |

## Docs
- `CLAUDE.md`: team reference for architecture, design tokens, rules and conventions
- `docs/api-contract.md`: API contract draft (mocks and hooks follow it)
- `docs/returnright-wireframes.html`: low-fidelity wireframes
