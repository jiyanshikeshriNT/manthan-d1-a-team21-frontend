import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetDb } from '../mocks/db'
import { clearSession } from '../auth/session'
import { clearCustomerSession } from '../auth/customerSession'

// jsdom has no layout APIs; Recharts' ResponsiveContainer needs ResizeObserver to exist.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom has no object URLs (the label card shows the QR PNG through one).
URL.createObjectURL ??= () => 'blob:mock-object-url'
URL.revokeObjectURL ??= () => {}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb() // the fake backend is stateful (scans, inspections, decisions)
  clearSession()
  clearCustomerSession()
})
afterAll(() => server.close())
