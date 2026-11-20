import { describe, expect, it } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { renderRoute } from '../../../test/renderRoute'
import { formatDuration } from '../../../lib/format'

const T = { timeout: 4000 }
const metrics = {
  periodDays: 30,
  avgCycleTimeHours: 52,
  returnRateByCategory: [
    { category: 'Beauty', returnable: true, returns: 5, orders: 100, returnRate: 0.05 },
    { category: 'Fashion', returnable: true, returns: 20, orders: 100, returnRate: 0.2 },
    { category: 'Innerwear', returnable: false, returns: 0, orders: 50, returnRate: 0 },
  ],
  topReasons: [{ reason: 'DAMAGED', count: 4 }, { reason: 'WRONG_SIZE', count: 16 }],
}
const customers = [
  { customerId: 'c1', customerName: 'Zara Khan', returnCount30d: 4, lastReturnAt: '2026-11-19T10:00:00Z' },
  { customerId: 'c2', customerName: 'Amit Shah', returnCount30d: 6, lastReturnAt: '2026-11-10T10:00:00Z' },
]

function mock({ m = () => HttpResponse.json(metrics), f = () => HttpResponse.json({ customers }) } = {}) {
  server.use(http.get('*/api/manager/metrics', m), http.get('*/api/manager/flagged', f))
}

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
    expect(screen.getByTestId('kpi-Overall return rate')).toHaveTextContent('10.0%') // 25 of 250
    expect(screen.getByText('25 returns from 250 orders')).toBeInTheDocument()
    expect(await screen.findByTestId('kpi-Flagged customers')).toHaveTextContent('2')
  })

  it('describes each chart and offers a sorted data table behind "View as table"', async () => {
    mock()
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    const chart = await screen.findByRole('img', { name: /return rate by category/i }, T)
    expect(chart).toHaveAccessibleName(/highest is fashion at 20\.0%.*innerwear are not returnable/i)
    expect(screen.getByRole('img', { name: /most common is wrong size/i })).toBeInTheDocument()

    const panel = screen.getByRole('region', { name: 'Return rate by category' })
    const table = within(panel).getByRole('table', { hidden: true })
    const rows = within(table).getAllByRole('row', { hidden: true }).slice(1).map((r) => r.textContent)
    expect(rows[0]).toMatch(/^Fashion20\.0%/) // sorted, highest first
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

    expect(names()[0]).toMatch(/^Amit Shah/) // default: most returns first
    const nameHeader = within(region).getByRole('columnheader', { name: /customer/i })
    await user.click(within(nameHeader).getByRole('button'))
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(names()[0]).toMatch(/^Amit Shah/)
    await user.click(within(nameHeader).getByRole('button'))
    expect(names()[0]).toMatch(/^Zara Khan/)
  })

  it('shows an error with retry on every panel, and recovers', async () => {
    let fail = true
    mock({
      m: () => (fail ? HttpResponse.json({ error: { code: 'X', message: 'down' } }, { status: 500 }) : HttpResponse.json(metrics)),
      f: () => (fail ? HttpResponse.json({ error: { code: 'X', message: 'down' } }, { status: 500 }) : HttpResponse.json({ customers })),
    })
    const user = userEvent.setup()
    renderRoute('/manager', { role: 'MANAGER' })

    await waitFor(() => expect(screen.getAllByRole('button', { name: /try again/i })).toHaveLength(6), T) // 3 KPIs + 3 panels
    fail = false
    await user.click(screen.getAllByRole('button', { name: /try again/i })[0])
    expect(await screen.findByTestId('kpi-Average cycle time', {}, T)).toHaveTextContent('2 d 4 h')
  })

  it('shows empty states when there is nothing to show', async () => {
    mock({
      m: () => HttpResponse.json({ periodDays: 30, avgCycleTimeHours: null, returnRateByCategory: [], topReasons: [] }),
      f: () => HttpResponse.json({ customers: [] }),
    })
    renderRoute('/manager', { role: 'MANAGER' })
    expect(await screen.findByText('No orders in this period', {}, T)).toBeInTheDocument()
    expect(screen.getByText('No returns yet')).toBeInTheDocument()
    expect(await screen.findByText('No customers are flagged')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-Average cycle time')).toHaveTextContent('—')
  })
})
