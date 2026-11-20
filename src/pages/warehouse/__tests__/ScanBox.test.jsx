import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import ScanBox from '../ScanBox'

function setup() {
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

  it('submits a keyboard-wedge scan on Enter, trimmed, and loads the return', async () => {
    const bodies = []
    server.use(
      http.post('*/api/warehouse/scan', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ returnId: 'RET-1', status: 'RECEIVED', version: 2, items: [] })
      }),
    )
    const { user, onLoaded } = setup()

    await user.type(screen.getByLabelText(/scan return label/i), '  RET-1  {Enter}')

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ returnId: 'RET-1' })))
    expect(bodies).toEqual([{ token: 'RET-1' }])
    expect(screen.getByLabelText(/scan return label/i)).toHaveValue('')
  })

  it('shows a clear message for an unknown code and keeps the field ready for the next scan', async () => {
    server.use(http.post('*/api/warehouse/scan', () => HttpResponse.json({ error: { code: 'RETURN_NOT_FOUND', message: 'x' } }, { status: 404 })))
    const { user, onLoaded } = setup()
    const input = screen.getByLabelText(/scan return label/i)

    await user.type(input, 'NOPE{Enter}')

    expect(await screen.findByText(/no return matches that code/i)).toBeInTheDocument()
    expect(onLoaded).not.toHaveBeenCalled()
    expect(input).toHaveFocus()
  })
})
