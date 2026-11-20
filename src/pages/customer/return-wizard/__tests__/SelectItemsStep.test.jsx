import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderStep } from '../../../../test/renderWithProviders'
import { signInCustomer } from '../../../../test/sessions'
import { createInitialState } from '../wizardState'
import SelectItemsStep from '../steps/SelectItemsStep'

// ORD-100245 (mock backend): delivered 6 days ago; 3 returnable lines, innerwear, and a phone case already in a return.
const order = { orderId: 'ORD-100245', orderNumber: 'ORD-100245' }
const state = () => createInitialState({ step: 1, order })

describe('SelectItemsStep', () => {
  it('shows ineligible items as disabled with the server message and a reason badge', async () => {
    signInCustomer('ORD-100245')
    renderStep(<SelectItemsStep />, { wizardState: state() })

    const briefs = await screen.findByRole('checkbox', { name: /cotton briefs/i })
    expect(briefs).toBeDisabled()
    expect(briefs).toHaveAccessibleDescription("For hygiene and safety reasons, Innerwear items can't be returned.")

    const rows = screen.getAllByTestId('ineligible-item')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Not returnable')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Already returned')).toBeInTheDocument()
  })

  it('shows the delivery date, days left on eligible items and handles a mixed basket', async () => {
    signInCustomer('ORD-100245')
    renderStep(<SelectItemsStep />, { wizardState: state() })

    expect(await screen.findByText('3 of 5 items can be returned')).toBeInTheDocument()
    expect(screen.getByText(/delivered/i)).toBeInTheDocument()
    expect(screen.getByText('4 days left')).toBeInTheDocument() // electronics: 10-day window
    expect(screen.getByRole('checkbox', { name: /wireless earbuds/i })).toBeEnabled()
  })

  it('keeps Next disabled until an eligible item is selected', async () => {
    signInCustomer('ORD-100245')
    const user = userEvent.setup()
    renderStep(<SelectItemsStep />, { wizardState: state() })

    const next = await screen.findByRole('button', { name: /next/i })
    expect(next).toBeDisabled()
    expect(next).toHaveAccessibleDescription('Select at least one item to continue.')

    await user.click(screen.getByRole('checkbox', { name: /steel water bottle/i }))
    expect(next).toBeEnabled()
    expect(screen.getByRole('group', { name: /quantity to return for steel water bottle/i })).toBeInTheDocument()
  })

  it('asks the customer to look up the order again when the session has expired', async () => {
    renderStep(<SelectItemsStep />, { wizardState: state() }) // no session: 401

    expect(await screen.findByText('Your session has expired')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /look up order/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })
})
