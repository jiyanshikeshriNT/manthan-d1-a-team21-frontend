import { createBrowserRouter } from 'react-router'
import RootLayout from './layouts/RootLayout'
import PublicLayout from './layouts/PublicLayout'
import StaffLayout from './layouts/StaffLayout'
import RequireRole from './auth/RequireRole'
import { RouteErrorFallback } from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ReturnWizardPage from './pages/customer/return-wizard/ReturnWizardPage'
import ReturnDetailPage from './pages/customer/ReturnDetailPage'
import InspectPage from './pages/warehouse/InspectPage'
import ApprovalsPage from './pages/finance/ApprovalsPage'
import LazyDashboard from './pages/manager/LazyDashboard'

const guard = (roles, el) => <RequireRole roles={roles}>{el}</RequireRole>

/** Route table, shared by the browser router and the tests (createMemoryRouter). handle.title sets document.title. */
export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        // Public customer area
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage />, handle: { title: 'ReturnRight' } },
          { path: '/return/new', element: <ReturnWizardPage />, handle: { title: 'Start a return' } },
          { path: '/return/:returnId', element: <ReturnDetailPage />, handle: { title: 'Return status' } },
          { path: '/login', element: <LoginPage />, handle: { title: 'Staff sign in' } },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
        ],
      },
      {
        // Protected staff area (MANAGER can also open warehouse and finance)
        element: <StaffLayout />,
        children: [
          { path: '/warehouse', element: guard(['WAREHOUSE', 'MANAGER'], <InspectPage />), handle: { title: 'Inspect returns' } },
          { path: '/finance', element: guard(['FINANCE', 'MANAGER'], <ApprovalsPage />), handle: { title: 'Refund approvals' } },
          { path: '/manager', element: guard(['MANAGER'], <LazyDashboard />), handle: { title: 'Returns overview' } },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
