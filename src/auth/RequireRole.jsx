import { Navigate, useLocation } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { useSession } from './useSession'
import { ROLE_HOME } from './session'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

/**
 * Route guard for staff areas.
 * @param {{ roles: Array<'WAREHOUSE'|'FINANCE'|'MANAGER'>, children: React.ReactNode }} props
 */
export default function RequireRole({ roles, children }) {
  const session = useSession()
  const location = useLocation()

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (!roles.includes(session.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this area"
        description="Your account can't open this page. If you need access, ask your operations manager."
        action={<Button as="link" to={ROLE_HOME[session.role]}>Go to my workspace</Button>}
      />
    )
  }

  return children
}
