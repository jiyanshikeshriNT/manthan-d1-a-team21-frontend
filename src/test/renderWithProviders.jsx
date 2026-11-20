import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import WizardProvider from '../pages/customer/return-wizard/WizardProvider'

/** Render a wizard step with a fresh QueryClient, a memory router and preloaded wizard state. */
export function renderStep(ui, { wizardState } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/return/new']}>
        <Routes>
          <Route path="/return/new" element={<WizardProvider initialState={wizardState}>{ui}</WizardProvider>} />
          <Route path="/return/:returnId" element={<p>Return detail page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
