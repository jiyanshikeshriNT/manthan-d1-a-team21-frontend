import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { problem } from '../../../mocks/handlers'
import { signInStaff } from '../../../test/sessions'
import InspectionForm from '../InspectionForm'

const ret = {
  returnId: 'RMA-T1',
  id: 'uuid-t1',
  orderNumber: 'ORD-1',
  status: 'RECEIVED',
  refundMethod: 'ORIGINAL_PAYMENT',
  labelCode: null,
  items: [
    { returnItemId: '11', itemId: 11, productName: 'Cotton kurta', sku: 'K1', quantity: 1, unitPricePaise: 129900, reason: 'DAMAGED', photoCount: 0, photoUrl: null },
    { returnItemId: '12', itemId: 12, productName: 'Steel bottle', sku: 'B1', quantity: 3, unitPricePaise: 64900, reason: 'CHANGED_MIND', photoCount: 2, photoUrl: null },
  ],
}

/** WarehouseReturnView as the backend returns it after an inspection. */
const view = (over = {}) => ({
  returnId: 'uuid-t1', rma: 'RMA-T1', orderNumber: 'ORD-1', status: 'REFUND_IN_PROGRESS', refundMethod: 'ORIGINAL_PAYMENT',
  totalRefundPaise: 194750, items: [], refund: { id: 9, status: 'PENDING' }, ...over,
})

function setup(props = {}) {
  signInStaff('WAREHOUSE')
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const onDone = vi.fn()
  const onReload = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <InspectionForm ret={ret} onDone={onDone} onReload={onReload} {...props} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onDone, onReload }
}

const ctrlEnter = '{Control>}{Enter}{/Control}'
const capture = (calls, body = view()) =>
  server.use(
    http.post('*/api/v1/warehouse/returns/:rma/inspection', async ({ request, params }) => {
      calls.push({ rma: params.rma, body: await request.json() })
      await delay(150)
      return HttpResponse.json(body)
    }),
  )

describe('InspectionForm: keyboard-driven inspection', () => {
  it('grades, decides and submits using only the keyboard', async () => {
    const calls = []
    capture(calls)
    const { user, onDone } = setup()

    expect(screen.getAllByRole('radio', { name: /^A/ })[0]).toHaveFocus() // focus starts on item 1's first grade button
    await user.keyboard('3a') // grade C, accept
    expect(screen.getAllByRole('radio', { name: /^C/ })[0]).toBeChecked()
    expect(screen.getByTestId('refund-11')).toHaveTextContent('₹649.50') // 50%, round half up

    await user.tab() // decision group
    await user.tab() // item 2, grade group
    await user.keyboard('1p') // grade A, partial: the quantity box appears and takes focus
    const qty = await screen.findByLabelText(/accepted quantity/i)
    expect(qty).toHaveFocus()
    await user.keyboard('2')
    expect(screen.getByTestId('refund-12')).toHaveTextContent('₹1,298')
    expect(screen.getByTestId('refund-total')).toHaveTextContent('₹1,947.50')

    await user.keyboard(ctrlEnter)
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    // Partial is sent as ACCEPTED with acceptedQty; a full accept leaves acceptedQty out.
    expect(calls).toEqual([
      {
        rma: 'RMA-T1',
        body: {
          items: [
            { itemId: 11, grade: 'C', decision: 'ACCEPTED' },
            { itemId: 12, grade: 'A', decision: 'ACCEPTED', acceptedQty: 2 },
          ],
        },
      },
    ])
    expect(onDone).toHaveBeenCalledWith({
      returnId: 'RMA-T1', status: 'REFUND_IN_PROGRESS', refundPaise: 194750, outcome: 'REFUND_IN_PROGRESS', refundStatus: 'PENDING',
    })
  })

  it('shows the quantity box only for Partial and disables Partial for a single unit', async () => {
    const { user } = setup()
    expect(screen.queryByLabelText(/accepted quantity/i)).not.toBeInTheDocument()

    const partials = screen.getAllByRole('radio', { name: /partial/i })
    expect(partials[0]).toBeDisabled() // item 1 has quantity 1
    expect(partials[1]).toBeEnabled()

    await user.click(partials[1])
    expect(screen.getByLabelText(/accepted quantity/i)).toBeInTheDocument()
    await user.click(screen.getAllByRole('radio', { name: /accept/i })[1])
    expect(screen.queryByLabelText(/accepted quantity/i)).not.toBeInTheDocument()
  })

  it('does not submit an incomplete form and says what is missing', async () => {
    const calls = []
    capture(calls)
    const { user } = setup()

    await user.keyboard(ctrlEnter)

    expect(await screen.findByText('Complete 2 items to continue')).toBeInTheDocument()
    expect(screen.getAllByText('Choose accept, partial or reject.')).toHaveLength(2)
    expect(screen.getAllByText('Choose a grade.')).toHaveLength(2)
    expect(calls).toHaveLength(0)
  })

  it('needs a grade for a rejected item too, and sends it as REJECTED', async () => {
    const calls = []
    capture(calls, view({ status: 'REJECTED', totalRefundPaise: 0, refund: null }))
    const { user, onDone } = setup()

    await user.keyboard('r') // reject item 1 without a grade
    await user.tab()
    await user.tab()
    await user.keyboard('2r') // item 2: grade B, reject
    await user.keyboard(ctrlEnter)
    expect(await screen.findByText('Complete 1 item to continue')).toBeInTheDocument()
    expect(calls).toHaveLength(0)

    await user.click(screen.getAllByRole('radio', { name: /^C/ })[0])
    await user.keyboard(ctrlEnter)
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(calls[0].body.items).toEqual([
      { itemId: 11, grade: 'C', decision: 'REJECTED' },
      { itemId: 12, grade: 'B', decision: 'REJECTED' },
    ])
  })
})

describe('InspectionForm: disabled while pending', () => {
  it('sends one request however many times submit is triggered, and locks the form', async () => {
    const calls = []
    capture(calls)
    const { user, onDone } = setup()

    await user.keyboard('1a')
    await user.tab()
    await user.tab()
    await user.keyboard('2r')

    await user.keyboard(ctrlEnter)
    await user.keyboard(ctrlEnter)
    await user.click(screen.getByRole('button', { name: /saving inspection/i }))

    const submit = screen.getByRole('button', { name: /saving inspection/i })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAttribute('aria-busy', 'true')
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled())

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(calls).toHaveLength(1)
  })
})

describe('InspectionForm: conflicts', () => {
  async function fillAndSubmit(user) {
    await user.keyboard('1a')
    await user.tab()
    await user.tab()
    await user.keyboard('1a')
    await user.keyboard(ctrlEnter)
  }

  it.each([
    ['CONCURRENT_MODIFICATION', 409, /someone else changed this return/i],
    ['INVALID_TRANSITION', 409, /can’t be inspected in its current state/i],
  ])('shows a clear message and a Reload button for %s', async (code, _status, text) => {
    server.use(
      http.post('*/api/v1/warehouse/returns/:rma/inspection', () => problem(code, 'Conflict.', { currentStatus: 'INSPECTED' })),
      http.get('*/api/v1/warehouse/returns/:rma', () =>
        HttpResponse.json({ ...view({ status: 'INSPECTED', refund: null }), items: [] }),
      ),
    )
    const { user, onReload } = setup()
    await fillAndSubmit(user)

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByText(/couldn’t save the inspection/i)).not.toBeInTheDocument()
    // The form is usable again, with nothing lost.
    expect(screen.getByRole('button', { name: /submit inspection/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /reload return/i }))
    await waitFor(() => expect(onReload).toHaveBeenCalledWith(expect.objectContaining({ returnId: 'RMA-T1', status: 'INSPECTED' })))
  })
})
