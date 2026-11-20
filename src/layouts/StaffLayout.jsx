import { NavLink, Outlet, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Logo from '../components/Logo'
import Button from '../components/ui/Button'
import { clearSession } from '../auth/session'
import { useSession } from '../auth/useSession'
import { cx } from '../lib/format'

const NAV = [
  { to: '/warehouse', label: 'Inspection', roles: ['WAREHOUSE'] },
  { to: '/finance', label: 'Refund approvals', roles: ['FINANCE'], end: true },
  { to: '/finance/ledger', label: 'Ledger', roles: ['FINANCE'] },
  { to: '/manager', label: 'Dashboard', roles: ['MANAGER'] },
]

const ROLE_LABEL = { WAREHOUSE: 'Warehouse', FINANCE: 'Finance', MANAGER: 'Manager' }

/** Warehouse & Finance Ops shell: dense, canvas background, role-filtered nav. */
export default function StaffLayout() {
  const session = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const items = NAV.filter((n) => session && n.roles.includes(session.role))

  function signOut() {
    clearSession()
    queryClient.clear() // never show one user's cached data to the next
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo to="/" suffix={session ? ROLE_LABEL[session.role] : 'Staff'} />
          <nav aria-label="Workspace" className="ml-2 hidden gap-1 md:flex">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx(
                    'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium',
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-secondary-soft hover:text-ink',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session?.username && <span className="hidden text-sm text-muted sm:inline">{session.username}</span>}
            {session && (
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </Button>
            )}
          </div>
        </div>
        {items.length > 1 && (
          <nav aria-label="Workspace sections" className="flex gap-1 overflow-x-auto border-t border-line px-4 md:hidden">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx('inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium', isActive ? 'border-primary text-primary' : 'border-transparent text-muted')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 outline-none px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
