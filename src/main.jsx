import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { createQueryClient } from './api/queryClient'
import ErrorBoundary from './components/ErrorBoundary'
import Toaster from './components/toast/Toaster'
import './styles/index.css'

async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  } catch {
    // Some embedded browsers block service workers. Answer /api calls with the same handlers via fetch.
    const [{ getResponse }, { handlers }] = await Promise.all([import('msw'), import('./mocks/handlers')])
    const realFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const req = new Request(input, init)
      if (new URL(req.url).pathname.startsWith('/api/')) {
        const res = await getResponse(handlers, req)
        if (res) return res
      }
      return realFetch(req)
    }
  }
}

const queryClient = createQueryClient()

enableMocks().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
})
