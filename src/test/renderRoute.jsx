import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { routes } from '../router'
import { clearSession, setSession } from '../auth/session'

/** Render the real route tree at `path`, optionally signed in as a staff role. */
export function renderRoute(path, { role } = {}) {
  if (role) setSession({ token: `test.${role}`, role })
  else clearSession()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, router }
}
