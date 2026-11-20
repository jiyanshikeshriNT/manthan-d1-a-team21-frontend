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
URL.createObjectURL = () => 'blob:mock-object-url'
URL.revokeObjectURL = () => {}

// Node's fetch + MSW's interceptor fail on streamed multipart bodies ("Request body length does not
// match content-length header"). Serialize FormData bodies to bytes first, with Node's own FormData,
// so multipart requests (create return with photos, label photo decode) reach the handlers intact.
const NativeFormData = (await new Request('http://localhost/', { method: 'POST', body: new URLSearchParams('a=1') }).formData()).constructor
const { File: NodeFile } = await import('node:buffer')

async function toBytes(form) {
  const native = new NativeFormData()
  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') native.append(name, value)
    else native.append(name, new NodeFile([await value.arrayBuffer()], value.name ?? 'blob', { type: value.type }))
  }
  const res = new Response(native)
  return { body: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get('content-type') }
}

let mswFetch
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  mswFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    if (init?.body instanceof FormData) {
      const { body, contentType } = await toBytes(init.body)
      init = { ...init, body, headers: { ...init.headers, 'Content-Type': contentType } }
    }
    return mswFetch(input, init)
  }
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb() // the fake backend is stateful (scans, inspections, decisions)
  clearSession()
  clearCustomerSession()
})
afterAll(() => {
  globalThis.fetch = mswFetch
  server.close()
})
