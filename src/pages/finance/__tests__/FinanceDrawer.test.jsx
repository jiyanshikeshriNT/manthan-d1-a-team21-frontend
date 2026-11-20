import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { problem } from '../../../mocks/handlers'
import { signInStaff } from '../../../test/sessions'
import FinanceDrawer from '../FinanceDrawer'

const refund = (over = {}) => ({
  id: 77, returnId: 'uuid-77', rma: 'RMA-F1', amountPaise: 5499000, method: 'ORIGINAL_PAYMENT', status: 'AWAITING_APPROVAL',
  attempts: 0, requiresApproval: true, approvedBy: null, approvedAt: null, gatewayTxnId: null, lastError: null,
  nextAttemptAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...over,
})

const detail = (over = {}) => ({
  refund: refund(over),
  returnId: 'uuid-77', rma: 'RMA-F1', orderNumber: 'ORD-9', returnStatus: 'AWAITING_FINANCE', flagged: true,
  flagReason: 'Customer has 4 return requests in the last 30 days; manual review required', requestedAt: new Date().toISOString(),
  items: [{
    itemId: 1, orderLineId: 9, sku: 'ELE-LAP', productName: 'Laptop 14"', requestedQty: 1, unitPricePaise: 5499000, reasonCode: 'DEFECTIVE',
    reasonText: null, photoCount: 2, conditionGrade: 'A', decision: 'ACCEPTED', acceptedQty: 1, refundPaise: 5499000, inspectionNote: null,
  }],
})

function setup(data = detail()) {
  signInStaff('FINANCE')
  server.use(http.get('*/api/v1/finance/refunds/:id', () => HttpResponse.json(data)))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <FinanceDrawer refundId={77} onClose={() => {}} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const actionHandler = (action, calls, respond) =>
  server.use(
    http.post(`*/api/v1/finance/refunds/:id/${action}`, async ({ request, params }) => {
      const text = await request.text()
      calls.push({ id: params.id, body: text ? JSON.parse(text) : null, auth: request.headers.get('Authorization') })
      await delay(150)
      return respond()
    }),
  )

describe('FinanceDrawer: review', () => {
  it('shows the refund, the graded items and the flag reason', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: /return rma-f1/i })).toBeInTheDocument()
    expect(screen.getByText('Flagged customer')).toBeInTheDocument()
    expect(screen.getByText(/customer has 4 return requests/i)).toBeInTheDocument()
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument()
    expect(screen.getByText('Grade A × 1')).toBeInTheDocument()
    expect(screen.getByTestId('drawer-total')).toHaveTextContent('₹54,990')
  })
})

describe('FinanceDrawer: approve', () => {
  it('asks for confirmation with the amount before sending anything', async () => {
    const calls = []
    actionHandler('approve', calls, () => HttpResponse.json(refund({ status: 'SUCCEEDED', attempts: 1 })))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    expect(screen.getByText('Approve a refund of ₹54,990?')).toBeInTheDocument()
    expect(calls).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /confirm and pay ₹54,990/i }))
    expect(await screen.findByText('Refund of ₹54,990 sent')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ id: '77', body: null })
    expect(calls[0].auth).toMatch(/^Basic /)
  })

  it('disables every action while pending, so a double click sends one request', async () => {
    const calls = []
    actionHandler('approve', calls, () => HttpResponse.json(refund({ status: 'SUCCEEDED', attempts: 1 })))
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

  it('explains a payment the gateway did not confirm and offers a retry', async () => {
    actionHandler('approve', [], () => HttpResponse.json(refund({ status: 'UNKNOWN', attempts: 1, lastError: 'The payment gateway did not answer in time' })))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: /confirm and pay/i }))

    expect(await screen.findByText('The gateway didn’t confirm this refund')).toBeInTheDocument()
    expect(screen.getByText(/can’t be paid twice/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry refund/i })).toBeEnabled()
  })

  it('offers a reload when the refund changed meanwhile (409)', async () => {
    actionHandler('approve', [], () => problem('INVALID_TRANSITION', 'This refund has already been rejected.', { currentStatus: 'REJECTED' }))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: /confirm and pay/i }))

    expect(await screen.findByText('This refund changed')).toBeInTheDocument()
    expect(screen.getByText(/already been rejected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload refund/i })).toBeInTheDocument()
  })
})

describe('FinanceDrawer: reject and refund failure', () => {
  it('requires a reason to reject and sends nothing without one', async () => {
    const calls = []
    actionHandler('reject', calls, () => HttpResponse.json(refund({ status: 'REJECTED', lastError: 'Item was used' })))
    const user = setup()

    await user.click(await screen.findByRole('button', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: /confirm rejection/i }))
    expect(await screen.findByText('Add a note explaining why this refund is rejected.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)

    await user.type(screen.getByLabelText(/reason/i), 'Item was used')
    await user.click(screen.getByRole('button', { name: /confirm rejection/i }))
    expect(await screen.findByText('Refund rejected')).toBeInTheDocument()
    expect(calls[0].body).toEqual({ reason: 'Item was used' })
  })

  it('shows a failed refund with a Retry button, and the retry is single-shot while pending', async () => {
    let retries = 0
    server.use(
      http.post('*/api/v1/finance/refunds/:id/retry', async () => {
        retries += 1
        await delay(150)
        return HttpResponse.json(refund({ status: 'SUCCEEDED', attempts: 6 }))
      }),
    )
    const user = setup(detail({ status: 'FAILED', attempts: 5, lastError: 'Gateway declined the payment' }))

    expect(await screen.findByText('The refund failed')).toBeInTheDocument()
    expect(screen.getByText(/gateway declined the payment/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    const retry = screen.getByRole('button', { name: /retry refund/i })
    await Promise.all([user.click(retry), user.click(retry)])
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled()

    await waitFor(() => expect(screen.getByText(/refund of ₹54,990 sent/i)).toBeInTheDocument())
    expect(retries).toBe(1)
  })
})
