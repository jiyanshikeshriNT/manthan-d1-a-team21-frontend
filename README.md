# ReturnRight

Returns and refunds portal for an online retailer. Customers request returns, warehouse agents inspect them, finance approves large refunds, and managers watch the numbers.

## Run locally

Requires Node 20.19+ (tested on Node 26).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Pages

| URL | Who | What |
|---|---|---|
| `/` | Everyone | Pick a role |
| `/return` | Customer | Return wizard (find order → items → reason → refund method → label) |
| `/track/:returnId` | Customer | Status timeline |
| `/staff/warehouse` | Warehouse agent | Scan QR, grade items, accept / reject |
| `/staff/finance` | Finance reviewer | Approve refunds above ₹10,000 |
| `/staff/manager` | Operations manager | Dashboard |

## Project structure

```
src/
  api/          fetch wrapper (VITE_API_URL)
  components/   shared UI (Stepper, StatusTimeline)
  domain/       return state machine and business constants
  layouts/      CustomerLayout (phone-first), StaffLayout (sidebar)
  pages/        one folder per persona
  styles/       design tokens and base styles
docs/           wireframes
```

## Configuration

Copy `.env.example` to `.env.local` and set `VITE_API_URL` to the backend URL.
