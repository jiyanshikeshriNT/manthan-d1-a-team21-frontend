import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from '../components/toast/toastStore'

// Global API error -> toast. Queries/mutations that show errors inline set meta: { silent: true }.
function notify(error, meta) {
  if (meta?.silent || error?.status === 401) return
  toast.error('Request failed', error?.message ?? 'Something went wrong. Please try again.')
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (e, q) => notify(e, q.meta) }),
    mutationCache: new MutationCache({ onError: (e, _v, _c, m) => notify(e, m.meta) }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry network/5xx once; never retry 4xx.
        retry: (count, e) => count < 1 && !(e?.status >= 400 && e?.status < 500),
      },
      mutations: { retry: false },
    },
  })
}
