import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { renderStep } from '../../../../test/renderWithProviders'
import { createInitialState } from '../wizardState'
import ReviewStep from '../steps/ReviewStep'

const item = {
  orderItemId: 'oi_1', productName: 'Cotton kurta', sku: 'FSH-KUR', category: 'Fashion',
  unitPricePaise: 129900, quantity: 1, returnableQuantity: 1, eligible: true, reasonCode: 'ELIGIBLE', message: '', daysLeft: 24,
}

const reviewState = () =>
  createInitialState({
    step: 3,
    lookup: { orderNumber: 'RR-100245', email: 'priya.sharma@example.com' },
    order: { orderId: 'ord_7f3a91', orderNumber: 'RR-100245' },
    items: { oi_1: item },
    selections: { oi_1: { quantity: 1, reason: 'WRONG_SIZE', reasonNote: '', photo: null } },
    refundMethod: 'STORE_CREDIT',
    idempotencyKey: 'test-key-1',
  })

describe('ReviewStep', () => {
  it('shows the estimated refund and the inspection note', () => {
    renderStep(<ReviewStep />, { wizardState: reviewState() })
    expect(screen.getByTestId('estimate')).toHaveTextContent('₹1,299')
    expect(screen.getByText(/graded C .* refunded at 50%/i)).toBeInTheDocument()
  })

  it('sends only one create request when Submit is clicked repeatedly', async () => {
    const calls = []
    server.use(
      http.post('*/api/returns', async ({ request }) => {
        calls.push(request.headers.get('Idempotency-Key'))
        await delay(150)
        return HttpResponse.json({ returnId: 'RET-1', status: 'APPROVED', items: [{ returnItemId: 'RET-1-1', orderItemId: 'oi_1' }] }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderStep(<ReviewStep />, { wizardState: reviewState() })

    const submit = screen.getByRole('button', { name: /submit return/i })
    await Promise.all([user.click(submit), user.click(submit), user.dblClick(submit)])

    expect(await screen.findByText('Return detail page')).toBeInTheDocument()
    expect(calls).toEqual(['test-key-1'])
  })

  it('disables the button while submitting and re-enables it after a failure', async () => {
    server.use(
      http.post('*/api/returns', async () => {
        await delay(100)
        return HttpResponse.json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } }, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderStep(<ReviewStep />, { wizardState: reviewState() })

    await user.click(screen.getByRole('button', { name: /submit return/i }))
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t submit your return/i)
    expect(screen.getByRole('button', { name: /submit return/i })).toBeEnabled()
  })
})
