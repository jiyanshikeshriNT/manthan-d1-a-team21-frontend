import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import FinanceDrawer from '../FinanceDrawer'

const detail = (over = {}) => ({
  returnId: 'RET-F1', orderNumber: 'RR-9', customerName: 'Vikram P.', flagged: true, flagReason: '4 returns in the last 30 days',
  status: 'PENDING_FINANCE', version: 3, refundMethod: 'ORIGINAL', refundPaise: 5499000, submittedAt: new Date().toISOString(), failureReason: null,
  items: [{ returnItemId: 'f1', productName: 'Laptop 14"', quantity: 1, grade: 'A', decision: 'ACCEPT', refundPaise: 5499000, photoUrl: null }],
  ...over,
})

function setup(data = detail()) {
  server.use(http.get('*/api/finance/returns/:id', () => HttpResponse.json(data)))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <FinanceDrawer returnId="RET-F1" onClose={() => {}} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const decisionHandler = (calls, respond) =>
  server.use(
    http.post('*/api/finance/returns/:id/decision', async ({ request }) => {
      calls.push({ body: await request.json(), key: request.headers.get('Idempotency-Key') })
      await delay(150)
      return respond()
    }),
  )

describe('FinanceDrawer: approve', () => {
  it('asks for confirmation with the amount before sending anything', async () => {
    const calls = []
    decisionHandler(calls, () => HttpResponse.json({ returnId: 'RET-F1', status: 'REFUNDED', version: 4 }))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    expect(screen.getByText('Approve a refund of ₹54,990?')).toBeInTheDocument()
    expect(calls).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /confirm and pay ₹54,990/i }))
    expect(await screen.findByText('Refund of ₹54,990 sent')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0].body).toEqual({ version: 3, decision: 'APPROVE' })
    expect(calls[0].key).toBeTruthy()
  })

  it('disables every action while pending, so a double click sends one request', async () => {
    const calls = []
    decisionHandler(calls, () => HttpResponse.json({ returnId: 'RET-F1', status: 'REFUNDED', version: 4 }))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    const confirm = screen.getByRole('button', { name: /confirm and pay/i })
    await Promise.all([user.click(confirm), user.dblClick(confirm)])

    const busy = screen.getByRole('button', { name: /approving/i })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()

    await screen.findByText('Refund of ₹54,990 sent')
    expect(calls).toHaveLength(1)
  })

  it('explains separation of duties on a 403 and lets the reviewer go back', async () => {
    decisionHandler([], () => HttpResponse.json({ error: { code: 'SEPARATION_OF_DUTIES', message: 'no' } }, { status: 403 }))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: /confirm and pay/i }))

    expect(await screen.findByText('You can’t decide on this return')).toBeInTheDocument()
    expect(screen.getByText(/ask another finance reviewer/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
  })

  it('offers a reload on a stale version', async () => {
    decisionHandler([], () => HttpResponse.json({ error: { code: 'STALE_VERSION', message: 'x' } }, { status: 409 }))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: /confirm and pay/i }))

    expect(await screen.findByText('This return changed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload return/i })).toBeInTheDocument()
  })
})

describe('FinanceDrawer: reject and refund failure', () => {
  it('requires a note to reject and sends nothing without one', async () => {
    const calls = []
    decisionHandler(calls, () => HttpResponse.json({ returnId: 'RET-F1', status: 'REJECTED', version: 4 }))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: /confirm rejection/i }))
    expect(await screen.findByText('Add a note explaining why this refund is rejected.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)

    await user.type(screen.getByLabelText(/note for the customer record/i), 'Item was used')
    await user.click(screen.getByRole('button', { name: /confirm rejection/i }))
    expect(await screen.findByText('Return rejected')).toBeInTheDocument()
    expect(calls[0].body).toEqual({ version: 3, decision: 'REJECT', note: 'Item was used' })
  })

  it('shows a failed refund with a Retry button, and the retry is single-shot while pending', async () => {
    let retries = 0
    server.use(
      http.post('*/api/finance/returns/:id/retry-refund', async () => {
        retries += 1
        await delay(150)
        return HttpResponse.json({ returnId: 'RET-F1', status: 'REFUNDED', version: 5 })
      }),
    )
    const user = setup(detail({ status: 'REFUND_FAILED', failureReason: 'The payment gateway timed out' }))

    expect(await screen.findByText('The refund failed')).toBeInTheDocument()
    expect(screen.getByText(/payment gateway timed out/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    const retry = screen.getByRole('button', { name: /retry refund/i })
    await Promise.all([user.click(retry), user.click(retry)])
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled()

    await waitFor(() => expect(screen.getByText(/refund of ₹54,990 sent/i)).toBeInTheDocument())
    expect(retries).toBe(1)
  })
})
