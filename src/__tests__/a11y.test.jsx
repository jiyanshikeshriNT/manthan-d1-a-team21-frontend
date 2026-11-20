import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '../test/renderRoute'
import { axeViolations } from '../test/axe'

const T = { timeout: 4000 }

// Every page, rendered through the real router and layouts, must have no axe violations.
describe('axe: every page', () => {
  it.each([
    ['home', '/', null, () => screen.findByRole('heading', { level: 1, name: /return an item/i })],
    ['return wizard', '/return/new', null, () => screen.findByRole('heading', { level: 1, name: /find your order/i })],
    ['return status', '/return/RET-2026-04820', null, () => screen.findByText('Items in this return', {}, T)],
    ['return status with label', '/return/RET-2026-04817', null, () => screen.findByText('Label number', {}, T)],
    ['staff sign in', '/login', null, () => screen.findByRole('heading', { level: 1, name: /staff sign in/i })],
    ['not found', '/no-such-page', null, () => screen.findByRole('heading', { name: /page not found/i })],
    ['warehouse', '/warehouse', 'WAREHOUSE', () => screen.findByLabelText(/scan return label/i)],
    ['finance queue', '/finance', 'FINANCE', () => screen.findByRole('table', {}, T)],
    ['manager dashboard', '/manager', 'MANAGER', () => screen.findByRole('region', { name: /flagged customers table/i }, T)],
    ['no-access page', '/manager', 'WAREHOUSE', () => screen.findByText(/don't have access/i)],
  ])('%s has no violations', async (_name, path, role, ready) => {
    renderRoute(path, { role })
    await ready()
    expect(await axeViolations()).toEqual([])
  })

  it('warehouse inspection form has no violations', async () => {
    const user = userEvent.setup()
    renderRoute('/warehouse', { role: 'WAREHOUSE' })
    await user.type(await screen.findByLabelText(/scan return label/i), 'RET-2026-04902{Enter}')
    await screen.findByRole('form', { name: /inspect return/i }, T)
    expect(await axeViolations()).toEqual([])
  })

  it('finance review drawer has no violations', async () => {
    const user = userEvent.setup()
    renderRoute('/finance', { role: 'FINANCE' })
    await user.click(await screen.findByRole('button', { name: /review return\s*RET-2026-04912/i }, T))
    await screen.findByRole('button', { name: 'Approve' }, T)
    expect(await axeViolations()).toEqual([])
  })
})

describe('focus management on route change', () => {
  it('moves focus to the new page heading and updates the title', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: /return an item/i })
    await user.click(within(document.getElementById('main')).getByRole('link', { name: /^start a return$/i }))

    const h1 = await screen.findByRole('heading', { level: 1, name: /find your order/i })
    await waitFor(() => expect(h1).toHaveFocus())
    expect(document.title).toBe('Start a return · ReturnRight')
    expect(screen.getByText('Start a return page')).toBeInTheDocument() // polite announcement
  })

  it('offers a skip link to the main content on every layout', async () => {
    renderRoute('/finance', { role: 'FINANCE' })
    const skip = await screen.findByRole('link', { name: /skip to main content/i })
    expect(skip).toHaveAttribute('href', '#main')
    expect(document.getElementById('main')).toHaveAttribute('tabindex', '-1')
  })
})
