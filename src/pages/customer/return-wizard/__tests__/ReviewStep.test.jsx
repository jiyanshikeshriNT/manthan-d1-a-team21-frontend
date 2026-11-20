import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { problem } from '../../../../mocks/handlers'
import { renderStep } from '../../../../test/renderWithProviders'
import { signInCustomer } from '../../../../test/sessions'
import { createInitialState } from '../wizardState'
import ReviewStep from '../steps/ReviewStep'

const item = {
  orderItemId: '103', productName: 'Cotton kurta', sku: 'APP-KUR-03', category: 'Apparel',
  unitPricePaise: 129900, quantity: 1, returnableQuantity: 1, eligible: true, reasonCode: 'ELIGIBLE', message: '', daysLeft: 24,
}

const reviewState = (selection = {}) =>
  createInitialState({
    step: 3,
    lookup: { orderNumber: 'ORD-100245', email: 'priya.sharma@example.com' },
    order: { orderId: 'ORD-100245', orderNumber: 'ORD-100245' },
    items: { 103: item },
    selections: { 103: { quantity: 1, reason: 'WRONG_SIZE', reasonNote: '', photo: null, ...selection } },
    refundMethod: 'STORE_CREDIT',
    idempotencyKey: 'test-key-1',
  })

const created = { rma: 'RMA-1', orderNumber: 'ORD-100245', status: 'APPROVED', statusLabel: 'Approved', refundMethod: 'STORE_CREDIT', labelCode: 'RR-RMA-1-0', createdAt: new Date().toISOString(), totalRefundPaise: null, items: [], timeline: [] }

describe('ReviewStep', () => {
  it('shows the estimated refund and the inspection note', () => {
    renderStep(<ReviewStep />, { wizardState: reviewState() })
    expect(screen.getByTestId('estimate')).toHaveTextContent('₹1,299')
    expect(screen.getByText(/graded C .* refunded at 50%/i)).toBeInTheDocument()
  })

  it('sends one multipart request with the return and its photo, whatever the number of clicks', async () => {
    const calls = []
    server.use(
      http.post('*/api/v1/customer/returns', async ({ request }) => {
        const form = await request.formData()
        calls.push({
          key: request.headers.get('Idempotency-Key'),
          auth: request.headers.get('Authorization'),
          body: JSON.parse(await form.get('request').text()),
          photo: form.get('photos_103')?.name,
        })
        await delay(150)
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    signInCustomer('ORD-100245')
    const photo = new File(['png'], 'kurta.png', { type: 'image/png' })
    const user = userEvent.setup()
    renderStep(<ReviewStep />, { wizardState: reviewState({ reasonNote: '  Too tight  ', photo }) })

    const submit = screen.getByRole('button', { name: /submit return/i })
    await Promise.all([user.click(submit), user.click(submit), user.dblClick(submit)])

    expect(await screen.findByText('Return detail page')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({
      key: 'test-key-1',
      auth: 'Bearer mock-session:ORD-100245',
      body: {
        orderNumber: 'ORD-100245',
        refundMethod: 'STORE_CREDIT',
        items: [{ orderLineId: 103, qty: 1, reasonCode: 'WRONG_SIZE', reasonText: 'Too tight' }],
      },
      photo: 'kurta.png',
    })
  })

  it('lists the reason for each item the server refuses (422)', async () => {
    server.use(
      http.post('*/api/v1/customer/returns', () =>
        problem('ITEM_NOT_RETURNABLE', "Some items in your request can't be returned.", {
          items: [{ orderLineId: 103, code: 'WINDOW_EXPIRED', message: 'The 30-day return window for this item closed on 1 November 2026.' }],
        }),
      ),
    )
    const user = userEvent.setup()
    renderStep(<ReviewStep />, { wizardState: reviewState() })

    await user.click(screen.getByRole('button', { name: /submit return/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Some items in your request can't be returned.")
    expect(within(alert).getByText('Cotton kurta:')).toBeInTheDocument()
    expect(alert).toHaveTextContent(/30-day return window for this item closed/)
  })

  it('asks the customer to look up the order again when the session has expired', async () => {
    const user = userEvent.setup()
    renderStep(<ReviewStep />, { wizardState: reviewState() }) // no customer session: the server answers 401

    await user.click(screen.getByRole('button', { name: /submit return/i }))
    expect(await screen.findByText(/your session has expired/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /look up order/i })).toBeInTheDocument()
  })

  it('disables the button while submitting and re-enables it after a failure', async () => {
    server.use(
      http.post('*/api/v1/customer/returns', async () => {
        await delay(100)
        return HttpResponse.json({ title: 'Internal Server Error', status: 500, detail: 'Something went wrong.' }, { status: 500 })
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
