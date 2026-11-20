import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import InspectionForm from '../InspectionForm'

const ret = {
  returnId: 'RET-T1',
  orderNumber: 'RR-1',
  status: 'RECEIVED',
  version: 7,
  items: [
    { returnItemId: 'i1', productName: 'Cotton kurta', sku: 'K1', quantity: 1, unitPricePaise: 129900, reason: 'DAMAGED', photoUrl: null },
    { returnItemId: 'i2', productName: 'Steel bottle', sku: 'B1', quantity: 3, unitPricePaise: 64900, reason: 'CHANGED_MIND', photoUrl: null },
  ],
}

function setup(props = {}) {
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
const capture = (calls, body = { returnId: 'RET-T1', status: 'REFUND_PROCESSING', version: 8, refundPaise: 194750, outcome: 'REFUND_PROCESSING' }) =>
  server.use(
    http.post('*/api/warehouse/returns/:id/inspect', async ({ request }) => {
      calls.push(await request.json())
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
    expect(screen.getByTestId('refund-i1')).toHaveTextContent('₹649.50') // 50%, round half up

    await user.tab() // decision group
    await user.tab() // item 2, grade group
    await user.keyboard('1p') // grade A, partial: the quantity box appears and takes focus
    const qty = await screen.findByLabelText(/accepted quantity/i)
    expect(qty).toHaveFocus()
    await user.keyboard('2')
    expect(screen.getByTestId('refund-i2')).toHaveTextContent('₹1,298')
    expect(screen.getByTestId('refund-total')).toHaveTextContent('₹1,947.50')

    await user.keyboard(ctrlEnter)
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(calls).toEqual([
      {
        version: 7, // the version the agent loaded
        items: [
          { returnItemId: 'i1', grade: 'C', decision: 'ACCEPT' },
          { returnItemId: 'i2', grade: 'A', decision: 'PARTIAL', acceptedQty: 2 },
        ],
      },
    ])
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
    expect(calls).toHaveLength(0)
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
    ['STALE_VERSION', /changed this return|someone else changed/i],
    ['ILLEGAL_TRANSITION', /can’t be inspected in its current state/i],
  ])('shows a clear message and a Reload button for %s', async (code, text) => {
    server.use(
      http.post('*/api/warehouse/returns/:id/inspect', () => HttpResponse.json({ error: { code, message: 'Conflict.' } }, { status: 409 })),
      http.get('*/api/warehouse/returns/:id', () => HttpResponse.json({ ...ret, version: 9 })),
    )
    const { user, onReload } = setup()
    await fillAndSubmit(user)

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByText(/couldn’t save the inspection/i)).not.toBeInTheDocument()
    // The form is usable again, with nothing lost.
    expect(screen.getByRole('button', { name: /submit inspection/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /reload return/i }))
    await waitFor(() => expect(onReload).toHaveBeenCalledWith(expect.objectContaining({ version: 9 })))
  })
})
