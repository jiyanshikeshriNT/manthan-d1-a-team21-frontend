import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FIX, db } from '../../../mocks/db'
import { renderRoute } from '../../../test/renderRoute'

const T = { timeout: 4000 }

describe('Return status page', () => {
  it('shows the label with its QR code, and "I’ve shipped my parcel" moves the return to In transit', async () => {
    const user = userEvent.setup()
    renderRoute(`/return/${FIX.approved}`, { customer: 'ORD-100245' })

    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(FIX.approved) }, T)).toBeInTheDocument()
    expect(await screen.findByText(db.returns.get(FIX.approved).labelCode, {}, T)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /qr code for label/i })).toBeInTheDocument()
    expect(screen.getByText('Phone case')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /i’ve shipped my parcel/i }))
    await waitFor(() => expect(db.returns.get(FIX.approved).status).toBe('IN_TRANSIT'))
    // The timeline and the polite live region both say it.
    await waitFor(() => expect(screen.getAllByText('Your parcel is on its way to our warehouse.')).toHaveLength(2), T)
    expect(screen.queryByRole('button', { name: /cancel return/i })).not.toBeInTheDocument() // too late to cancel
  })

  it('cancels only after confirmation', async () => {
    const user = userEvent.setup()
    renderRoute(`/return/${FIX.approved}`, { customer: 'ORD-100245' })

    await user.click(await screen.findByRole('button', { name: /cancel return/i }, T))
    const confirm = screen.getByRole('region', { name: /confirm cancellation/i })
    expect(db.returns.get(FIX.approved).status).toBe('APPROVED')

    await user.click(within(confirm).getByRole('button', { name: /yes, cancel it/i }))
    expect(await screen.findByText('Return cancelled', {}, T)).toBeInTheDocument()
    expect(db.returns.get(FIX.approved).status).toBe('CANCELLED')
  })

  it('explains a rejection with the note from the return’s history', async () => {
    renderRoute(`/return/${FIX.rejected}`, { customer: 'ORD-100198' })
    expect(await screen.findByText(/rejected after manager review: repeated returns of used items/i, {}, T)).toBeInTheDocument()
  })

  it('asks to confirm the order when there is no session, then loads the return', async () => {
    const user = userEvent.setup()
    renderRoute(`/return/${FIX.approved}`)

    expect(await screen.findByRole('heading', { level: 1, name: /track return/i }, T)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/order number/i), 'ord-100245')
    await user.type(screen.getByLabelText(/email address/i), 'someone@example.com')
    await user.click(screen.getByRole('button', { name: /view return/i }))
    expect(await screen.findByText(/couldn't find an order with those details/i, {}, T)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/email address/i))
    await user.type(screen.getByLabelText(/email address/i), 'Priya.Sharma@example.com')
    await user.click(screen.getByRole('button', { name: /view return/i }))
    expect(await screen.findByText('Items in this return', {}, T)).toBeInTheDocument()
  })

  it('does not show another order’s return', async () => {
    renderRoute(`/return/${FIX.refunded}`, { customer: 'ORD-100245' })
    expect(await screen.findByText('We couldn’t find that return', {}, T)).toBeInTheDocument()
  })
})
