import { Link } from 'react-router'

const ROLES = [
  { to: '/return', title: 'Customer', text: 'Start a return or track one you already made.' },
  { to: '/staff/warehouse', title: 'Warehouse agent', text: 'Scan returned parcels and grade items.' },
  { to: '/staff/finance', title: 'Finance reviewer', text: 'Approve refunds above ₹10,000.' },
  { to: '/staff/manager', title: 'Operations manager', text: 'Return rates, reasons and flagged customers.' },
]

export default function HomePage() {
  return (
    <div className="stack">
      <h1>ReturnRight</h1>
      <p className="muted">Pick a role. Staff login comes later; for now each role is open.</p>
      <div className="role-grid">
        {ROLES.map((r) => (
          <Link key={r.to} to={r.to} className="card role-card">
            <h2>{r.title}</h2>
            <p className="muted">{r.text}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
