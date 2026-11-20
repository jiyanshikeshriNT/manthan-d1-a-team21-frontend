import { createBrowserRouter } from 'react-router'
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
import DashboardPage from './pages/manager/DashboardPage'

const guard = (roles, el) => <RequireRole roles={roles}>{el}</RequireRole>

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorFallback />,
    children: [
      {
        // Public customer area
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/return/new', element: <ReturnWizardPage /> },
          { path: '/return/:returnId', element: <ReturnDetailPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        // Protected staff area (MANAGER can also open warehouse and finance)
        element: <StaffLayout />,
        children: [
          { path: '/warehouse', element: guard(['WAREHOUSE', 'MANAGER'], <InspectPage />) },
          { path: '/finance', element: guard(['FINANCE', 'MANAGER'], <ApprovalsPage />) },
          { path: '/manager', element: guard(['MANAGER'], <DashboardPage />) },
        ],
      },
    ],
  },
])
