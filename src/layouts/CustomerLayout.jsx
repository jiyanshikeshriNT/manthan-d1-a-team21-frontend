import { Link, Outlet } from 'react-router'

// Narrow, phone-first layout for the customer flow.
export default function CustomerLayout() {
  return (
    <div className="customer-shell">
      <header className="topbar">
        <Link to="/" className="logo">Return<em>Right</em></Link>
      </header>
      <main className="customer-main">
        <Outlet />
      </main>
    </div>
  )
}
