import { lazy, Suspense } from 'react'
import Spinner from '../../components/ui/Spinner'

// Charts (Recharts) only load for managers, keeping them out of the customer bundle.
const DashboardPage = lazy(() => import('./DashboardPage'))

export default function LazyDashboard() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16 text-muted"><Spinner size="lg" label="Loading dashboard" /></div>}>
      <DashboardPage />
    </Suspense>
  )
}
