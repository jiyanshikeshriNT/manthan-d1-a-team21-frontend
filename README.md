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
- **Example return status page:** `/return/RET-2026-04817`
- **Staff logins:** `warehouse@returnright.test`, `finance@returnright.test`, `manager@returnright.test`. The password for all three is in `src/mocks/data.js`.

Some embedded browsers block service workers. The app then shows a notice and calls the real API instead.

## Pages

| URL | Access | What |
|---|---|---|
| `/` | Public | Landing page and return policy |
| `/return/new` | Public | 4-step return wizard |
| `/return/:returnId` | Public | Return status timeline |
| `/login` | Public | Staff sign in |
| `/warehouse` | WAREHOUSE, MANAGER | Inspection (coming next) |
| `/finance` | FINANCE, MANAGER | Refund approvals (coming next) |
| `/manager` | MANAGER | Dashboard (coming next) |

## Docs
- `CLAUDE.md`: team reference for architecture, design tokens, rules and conventions
- `docs/api-contract.md`: API contract draft (mocks and hooks follow it)
- `docs/returnright-wireframes.html`: low-fidelity wireframes
