import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { server } from '../../../mocks/server'
import { problem } from '../../../mocks/handlers'
import { FIX, db } from '../../../mocks/db'
import { signInStaff } from '../../../test/sessions'
import ScanBox from '../ScanBox'

function setup() {
  signInStaff('WAREHOUSE')
  const onLoaded = vi.fn()
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const view = (signal) => (
    <QueryClientProvider client={client}>
      <ScanBox onLoaded={onLoaded} focusSignal={signal} />
    </QueryClientProvider>
  )
  const utils = render(view(0))
  return { user: userEvent.setup(), onLoaded, rerender: (s) => utils.rerender(view(s)) }
}

/** Records the warehouse requests the scan makes, in order. */
function track() {
  const seen = []
  server.events.on('request:start', ({ request }) => {
    const u = new URL(request.url)
    if (u.pathname.startsWith('/api/v1/warehouse')) seen.push(`${request.method} ${decodeURIComponent(u.pathname)}`)
  })
  return seen
}

describe('ScanBox', () => {
  it('is focused on load, and focused again with its text cleared after each completed return', async () => {
    const { user, rerender } = setup()
    const input = screen.getByLabelText(/scan return label/i)
    expect(input).toHaveFocus()

    await user.type(input, 'abc')
    await user.click(document.body)
    expect(input).not.toHaveFocus()

    rerender(1)
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
  })

  it('looks up a scanned label, trimmed, and receives an in-transit parcel', async () => {
    const seen = track()
    const label = db.returns.get(FIX.inTransit).labelCode
    const { user, onLoaded } = setup()

    await user.type(screen.getByLabelText(/scan return label/i), `  ${label}  {Enter}`)

    await waitFor(() =>
      expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ returnId: FIX.inTransit, status: 'RECEIVED', labelCode: label })),
    )
    expect(seen).toEqual([`GET /api/v1/warehouse/labels/${label}`, `POST /api/v1/warehouse/returns/${FIX.inTransit}/receive`])
    expect(screen.getByLabelText(/scan return label/i)).toHaveValue('')
    server.events.removeAllListeners()
  })

  it('loads a typed RMA number without receiving it again', async () => {
    const seen = track()
    const { user, onLoaded } = setup()

    await user.type(screen.getByLabelText(/scan return label/i), `${FIX.received.toLowerCase()}{Enter}`)

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ returnId: FIX.received, status: 'RECEIVED' })))
    expect(seen).toEqual([`GET /api/v1/warehouse/returns/${FIX.received}`])
    server.events.removeAllListeners()
  })

  it('reads the QR code from an uploaded photo of the label', async () => {
    const { user, onLoaded } = setup()

    await user.upload(screen.getByLabelText(/upload a photo of the label/i), new File(['jpg'], 'label.jpg', { type: 'image/jpeg' }))

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ returnId: FIX.inTransit, status: 'RECEIVED' })))
  })

  it('shows the server message for a forged label', async () => {
    const { user, onLoaded } = setup()

    await user.type(screen.getByLabelText(/scan return label/i), `RR-${FIX.inTransit}-00000000{Enter}`)

    expect(await screen.findByText(/this label isn't valid/i)).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('shows a clear message for an unknown code and keeps the field ready for the next scan', async () => {
    const { user, onLoaded } = setup()
    const input = screen.getByLabelText(/scan return label/i)

    await user.type(input, 'NOPE{Enter}')

    expect(await screen.findByText(/no return matches that code/i)).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
    expect(input).toHaveFocus()
  })

  it('loads a return that is not in transit as it is, without receiving it', async () => {
    const seen = track()
    const label = db.returns.get(FIX.approved).labelCode
    const { user, onLoaded } = setup()

    await user.type(screen.getByLabelText(/scan return label/i), `${label}{Enter}`)

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ returnId: FIX.approved, status: 'APPROVED' })))
    expect(seen).toEqual([`GET /api/v1/warehouse/labels/${label}`])
    server.events.removeAllListeners()
  })

  it('explains a refused receive (409) in plain words', async () => {
    server.use(http.post('*/api/v1/warehouse/returns/:rma/receive', () => problem('INVALID_TRANSITION', 'x', { currentStatus: 'CANCELLED' })))
    const { user, onLoaded } = setup()

    await user.type(screen.getByLabelText(/scan return label/i), `${db.returns.get(FIX.inTransit).labelCode}{Enter}`)

    expect(await screen.findByText(/can’t be received yet/i)).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
  })
})
