import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderStep } from '../../../../test/renderWithProviders'
import { createInitialState } from '../wizardState'
import SelectItemsStep from '../steps/SelectItemsStep'

const order = { orderId: 'ord_7f3a91', orderNumber: 'RR-100245', placedAt: null, deliveredAt: null }
const state = () => createInitialState({ step: 1, order })

describe('SelectItemsStep', () => {
  it('shows ineligible items as disabled with the server message and a reason badge', async () => {
    renderStep(<SelectItemsStep />, { wizardState: state() })

    const briefs = await screen.findByRole('checkbox', { name: /cotton briefs/i })
    expect(briefs).toBeDisabled()
    expect(briefs).toHaveAccessibleDescription('Innerwear can’t be returned for hygiene reasons.')

    const rows = screen.getAllByTestId('ineligible-item')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Not returnable')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Not delivered yet')).toBeInTheDocument()
  })

  it('shows days left on eligible items and handles a mixed basket', async () => {
    renderStep(<SelectItemsStep />, { wizardState: state() })

    expect(await screen.findByText('3 of 5 items can be returned')).toBeInTheDocument()
    expect(screen.getByText('4 days left')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /wireless earbuds/i })).toBeEnabled()
  })

  it('keeps Next disabled until an eligible item is selected', async () => {
    const user = userEvent.setup()
    renderStep(<SelectItemsStep />, { wizardState: state() })

    const next = await screen.findByRole('button', { name: /next/i })
    expect(next).toBeDisabled()
    expect(next).toHaveAccessibleDescription('Select at least one item to continue.')

    await user.click(screen.getByRole('checkbox', { name: /steel water bottle/i }))
    expect(next).toBeEnabled()
    expect(screen.getByRole('group', { name: /quantity to return for steel water bottle/i })).toBeInTheDocument()
  })
})
