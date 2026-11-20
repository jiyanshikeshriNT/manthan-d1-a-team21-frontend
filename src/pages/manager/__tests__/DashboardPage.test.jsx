import { describe, expect, it } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { FIX, db } from '../../../mocks/db'
import { renderRoute } from '../../../test/renderRoute'
import { formatDuration } from '../../../lib/format'

const T = { timeout: 4000 }

/** GET /api/v1/manager/dashboard as the backend returns it (units, masked emails). */
const dashboard = (over = {}) => ({
  from: '2026-10-22',
  to: '2026-11-20',
  returnRateByCategory: [
    { category: 'Beauty', returnable: true, soldUnits: 100, returnedUnits: 5, returnRate: 0.05 },
    { category: 'Apparel', returnable: true, soldUnits: 100, returnedUnits: 20, returnRate: 0.2 },
    { category: 'Innerwear', returnable: false, soldUnits: 50, returnedUnits: 0, returnRate: 0 },
  ],
  topReasons: [{ reasonCode: 'DAMAGED', count: 4 }, { reasonCode: 'WRONG_SIZE', count: 16 }],
  cycleTime: { closedReturns: 12, averageHours: 52 },
  flaggedCustomers: [
    { customerId: 1, maskedEmail: 'z***@example.com', activeFlags: 1, highestReturnCount: 4, lastFlaggedAt: '2026-11-19T10:00:00Z' },
    { customerId: 2, maskedEmail: 'a***@example.com', activeFlags: 2, highestReturnCount: 6, lastFlaggedAt: '2026-11-10T10:00:00Z' },
  ],
  ...over,
})

const mock = (respond = () => HttpResponse.json(dashboard())) => server.use(http.get('*/api/v1/manager/dashboard', respond))

describe('formatDuration', () => {
  it('formats hours as days and hours', () => {
    expect(formatDuration(52)).toBe('2 d 4 h')
    expect(formatDuration(5)).toBe('5 h')
    expect(formatDuration(0.5)).toBe('30 min')
  })
})

describe('Manager dashboard', () => {
  it('shows the three KPIs', async () => {
    mock()
    renderRoute('/manager', { role: 'MANAGER' })
    expect(await screen.findByTestId('kpi-Average cycle time', {}, T)).toHaveTextContent('2 d 4 h')
    expect(screen.getByText(/12 closed/)).toBeInTheDocument()
    expect(screen.getByTestId('kpi-Overall return rate')).toHaveTextContent('10.0%') // 25 of 250 units
    expect(screen.getByText('25 units returned of 250 sold')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days', { exact: false })).toBeInTheDocument()
    expect(screen.getByTestId('kpi-Flagged customers')).toHaveTextContent('2')
  })

  it('describes each chart and offers a sorted data table behind "View as table"', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    const chart = await screen.findByRole('img', { name: /return rate by category/i }, T)
    expect(chart).toHaveAccessibleName(/highest is apparel at 20\.0%.*innerwear are not returnable/i)
    expect(screen.getByRole('img', { name: /most common is wrong size/i })).toBeInTheDocument()

    const panel = screen.getByRole('region', { name: 'Return rate by category' })
    const table = within(panel).getByRole('table', { hidden: true })
    const rows = within(table).getAllByRole('row', { hidden: true }).slice(1).map((r) => r.textContent)
    expect(rows[0]).toMatch(/^Apparel20\.0%20 of 100 units sold/) // sorted, highest first
    expect(rows[2]).toMatch(/^InnerwearNot returnable/)

    const toggle = within(panel).getByRole('button', { name: /view as table/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(table.parentElement).toHaveClass('sr-only') // visually hidden, still read by screen readers
    await user.click(toggle)
    expect(within(panel).getByRole('button', { name: /hide table/i })).toHaveAttribute('aria-pressed', 'true')
    expect(table.parentElement).not.toHaveClass('sr-only')
  })

  it('sorts the flagged customers table from the column headers', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })
    const region = await screen.findByRole('region', { name: /flagged customers table/i }, T)
    const names = () => within(region).getAllByRole('rowheader').map((c) => c.textContent)

    expect(names()[0]).toMatch(/^a\*\*\*@example\.com/) // default: most returns first
    const nameHeader = within(region).getByRole('columnheader', { name: /customer/i })
    await user.click(within(nameHeader).getByRole('button'))
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(names()[0]).toMatch(/^a\*\*\*/)
    await user.click(within(nameHeader).getByRole('button'))
    expect(names()[0]).toMatch(/^z\*\*\*/)
  })

  it('shows an error with retry on every panel, and recovers', async () => {
    let fail = true
    mock(() => (fail ? HttpResponse.json({ title: 'Internal Server Error', status: 500, detail: 'down' }, { status: 500 }) : HttpResponse.json(dashboard())))
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    await waitFor(() => expect(screen.getAllByRole('button', { name: /try again/i })).toHaveLength(6), T) // 3 KPIs + 3 panels
    fail = false
    await user.click(screen.getAllByRole('button', { name: /try again/i })[0])
    expect(await screen.findByTestId('kpi-Average cycle time', {}, T)).toHaveTextContent('2 d 4 h')
  })

  it('shows empty states when there is nothing to show', async () => {
    mock(() =>
      HttpResponse.json(dashboard({ returnRateByCategory: [], topReasons: [], cycleTime: { closedReturns: 0, averageHours: null }, flaggedCustomers: [] })),
    )
    renderRoute('/manager', { role: 'MANAGER' })
    expect(await screen.findByText('No orders in this period', {}, T)).toBeInTheDocument()
    expect(screen.getByText('No returns yet')).toBeInTheDocument()
    expect(screen.getByText('No customers are flagged')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-Average cycle time')).toHaveTextContent('—')
  })
})

describe('Manager review queue', () => {
  it('approves a flagged return, which leaves the queue', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    const queue = await screen.findByRole('region', { name: 'Returns waiting for review' }, T)
    expect(await within(queue).findByText(FIX.pendingReview, {}, T)).toBeInTheDocument()
    expect(within(queue).getByText(/customer has 4 return requests/i)).toBeInTheDocument()

    await user.click(within(queue).getByRole('button', { name: /approve/i }))
    expect(await within(queue).findByText('Nothing to review', {}, T)).toBeInTheDocument()
    expect(db.returns.get(FIX.pendingReview).status).toBe('APPROVED')
  })

  it('needs a reason to reject', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    const queue = await screen.findByRole('region', { name: 'Returns waiting for review' }, T)
    await user.click(await within(queue).findByRole('button', { name: /^reject$/i }, T))
    await user.click(within(queue).getByRole('button', { name: /confirm rejection/i }))
    expect(within(queue).getByText(/add a reason/i)).toBeInTheDocument()
    expect(db.returns.get(FIX.pendingReview).status).toBe('PENDING_REVIEW')

    await user.type(within(queue).getByLabelText(/reason for rejecting/i), 'Serial returner')
    await user.click(within(queue).getByRole('button', { name: /confirm rejection/i }))
    await waitFor(() => expect(db.returns.get(FIX.pendingReview).status).toBe('REJECTED'))
  })

  it('shows a return’s audit trail from "History"', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    const queue = await screen.findByRole('region', { name: 'Returns waiting for review' }, T)
    await user.click(await within(queue).findByRole('button', { name: /history/i }, T))

    const audit = screen.getByRole('region', { name: 'Audit trail' })
    const trail = await within(audit).findByRole('list', { name: /history of/i }, T)
    expect(within(trail).getAllByRole('listitem')).toHaveLength(2) // created, then routed to review
    expect(within(trail).getByText(/under review/i)).toBeInTheDocument()
  })
})

describe('Gateway drill panel', () => {
  it('shows the current mode and applies a new one', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    const panel = await screen.findByRole('region', { name: 'Payment gateway drill' }, T)
    // The current mode shows as a badge, next to the same words in the mode picker.
    await waitFor(() => expect(within(panel).getAllByText('Normal')).toHaveLength(2), T)

    await user.selectOptions(within(panel).getByLabelText('Mode'), 'DECLINE')
    await user.click(within(panel).getByRole('button', { name: /apply/i }))
    await waitFor(() => expect(db.faults.mode).toBe('DECLINE'))
    await waitFor(() => expect(within(panel).getAllByText('Decline new payments')).toHaveLength(2))
  })
})
