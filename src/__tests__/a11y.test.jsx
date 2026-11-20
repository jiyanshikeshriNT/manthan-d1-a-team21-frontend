import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '../test/renderRoute'
import { axeViolations } from '../test/axe'
import { FIX } from '../mocks/db'

// Generous: the dashboard is lazy-loaded (Recharts) and can take a few seconds while other test files run in parallel.
const T = { timeout: 12_000 }
const TEST_TIMEOUT = 20_000

// Every page, rendered through the real router and layouts, must have no axe violations.
// Staff workspaces are single-role, matching the backend's /api/v1/{role} rules.
describe('axe: every page', () => {
  it.each([
    ['home', '/', {}, () => screen.findByRole('heading', { level: 1, name: /return an item/i })],
    ['return wizard', '/return/new', {}, () => screen.findByRole('heading', { level: 1, name: /find your order/i })],
    ['return status (refunded)', `/return/${FIX.refunded}`, { customer: 'ORD-100198' }, () => screen.findByText('Items in this return', {}, T)],
    ['return status (rejected)', `/return/${FIX.rejected}`, { customer: 'ORD-100198' }, () => screen.findByText('We couldn’t accept this return', {}, T)],
    ['return status with label and actions', `/return/${FIX.approved}`, { customer: 'ORD-100245' }, () => screen.findByText('Label code', {}, T)],
    ['return status, confirm the order (no session)', `/return/${FIX.approved}`, {}, () => screen.findByRole('heading', { level: 1, name: /track return/i }, T)],
    ['staff sign in', '/login', {}, () => screen.findByRole('heading', { level: 1, name: /staff sign in/i })],
    ['not found', '/no-such-page', {}, () => screen.findByRole('heading', { name: /page not found/i })],
    ['warehouse', '/warehouse', { role: 'WAREHOUSE' }, () => screen.findByLabelText(/scan return label/i)],
    ['finance queue', '/finance', { role: 'FINANCE' }, () => screen.findByRole('table', {}, T)],
    ['finance ledger', '/finance/ledger', { role: 'FINANCE' }, () => screen.findByRole('table', {}, T)],
    ['manager dashboard', '/manager', { role: 'MANAGER' }, () => screen.findByRole('region', { name: /flagged customers table/i }, T)],
    ['no-access page', '/manager', { role: 'WAREHOUSE' }, () => screen.findByText(/don't have access/i)],
    ['no-access page (manager on finance)', '/finance', { role: 'MANAGER' }, () => screen.findByText(/don't have access/i)],
  ])('%s has no violations', async (_name, path, opts, ready) => {
    renderRoute(path, opts)
    await ready()
    expect(await axeViolations()).toEqual([])
  }, TEST_TIMEOUT)

  it('warehouse inspection form has no violations', async () => {
    const user = userEvent.setup()
    renderRoute('/warehouse', { role: 'WAREHOUSE' })
    await user.type(await screen.findByLabelText(/scan return label/i), `${FIX.received}{Enter}`)
    await screen.findByRole('form', { name: /inspect return/i }, T)
    expect(await axeViolations()).toEqual([])
  }, TEST_TIMEOUT)

  it('finance review drawer has no violations', async () => {
    const user = userEvent.setup()
    renderRoute('/finance', { role: 'FINANCE' })
    await user.click(await screen.findByRole('button', { name: new RegExp(`review return\\s*${FIX.awaitingFinance}`, 'i') }, T))
    await screen.findByRole('button', { name: 'Approve' }, T)
    expect(await axeViolations()).toEqual([])
  }, TEST_TIMEOUT)
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
