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
  } catch (e) {
    // Some embedded browsers block service workers. Render anyway; API calls then go to the real backend.
    console.warn('[mocks] MSW could not start, using the real API instead.', e)
    const { toast } = await import('./components/toast/toastStore')
    toast.info('Mock API unavailable in this browser', 'Requests go to the real backend on :8080.')
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
