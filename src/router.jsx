import { createBrowserRouter } from 'react-router'
import CustomerLayout from './layouts/CustomerLayout'
import StaffLayout from './layouts/StaffLayout'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import ReturnWizard from './pages/customer/ReturnWizard'
import TrackReturn from './pages/customer/TrackReturn'
import InspectPage from './pages/warehouse/InspectPage'
import ApprovalsPage from './pages/finance/ApprovalsPage'
import DashboardPage from './pages/manager/DashboardPage'

export const router = createBrowserRouter([
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/return', element: <ReturnWizard /> },
      { path: '/track/:returnId', element: <TrackReturn /> },
    ],
  },
  {
    path: '/staff',
    element: <StaffLayout />,
    children: [
      { path: 'warehouse', element: <InspectPage /> },
      { path: 'finance', element: <ApprovalsPage /> },
      { path: 'manager', element: <DashboardPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
