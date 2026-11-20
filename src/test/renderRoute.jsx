import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { routes } from '../router'
import { clearSession } from '../auth/session'
import { clearCustomerSession } from '../auth/customerSession'
import { signInCustomer, signInStaff } from './sessions'

/**
 * Render the real route tree at `path`.
 * @param {string} path
 * @param {{ role?: 'WAREHOUSE'|'FINANCE'|'MANAGER'|null, customer?: string }} [opts]
 *   role signs in that staff user (HTTP Basic, as the mock backend expects);
 *   customer opens a customer session for that order number.
 */
export function renderRoute(path, { role, customer } = {}) {
  if (role) signInStaff(role)
  else clearSession()
  if (customer) signInCustomer(customer)
  else clearCustomerSession()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, router }
}
