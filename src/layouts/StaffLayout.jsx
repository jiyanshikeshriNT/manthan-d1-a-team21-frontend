import { Link, NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/staff/warehouse', label: 'Warehouse' },
  { to: '/staff/finance', label: 'Finance' },
  { to: '/staff/manager', label: 'Dashboard' },
]

// Desktop layout shared by the three internal roles.
export default function StaffLayout() {
  return (
    <div className="staff-shell">
      <header className="topbar">
        <Link to="/" className="logo">Return<em>Right</em> <span className="muted">Staff</span></Link>
      </header>
      <div className="staff-body">
        <nav className="sidenav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>{n.label}</NavLink>
          ))}
        </nav>
        <main className="staff-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
