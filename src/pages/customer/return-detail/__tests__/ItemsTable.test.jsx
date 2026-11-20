import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ItemsTable from '../ItemsTable'

const base = { returnItemId: 'r1', productName: 'Steel water bottle', quantity: 2, reason: 'DAMAGED', unitPricePaise: 64900 }

describe('ItemsTable', () => {
  it('shows the Grade C 50% reduction with a note', () => {
    const items = [{ ...base, status: 'ACCEPTED', grade: 'C', refundPaise: 64900 }]
    render(<ItemsTable items={items} estimatedRefundPaise={129800} status="REFUNDED" />)

    const row = screen.getByRole('row', { name: /steel water bottle/i })
    expect(within(row).getByText('Grade C')).toBeInTheDocument()
    expect(within(row).getByText('₹649')).toBeInTheDocument()
    expect(within(row).getByText('50% of ₹1,298')).toBeInTheDocument()
    expect(screen.getByText(/refunded at 50% of the item price/i)).toBeInTheDocument()
    expect(screen.getByTestId('refund-total')).toHaveTextContent('₹649')
  })

  it('shows the estimate and "after inspection" before the item is graded', () => {
    const items = [{ ...base, status: 'AWAITING_INSPECTION', grade: null, refundPaise: null }]
    render(<ItemsTable items={items} estimatedRefundPaise={129800} status="IN_TRANSIT" />)

    expect(screen.getAllByText('Pending')).toHaveLength(2) // item status and refund
    expect(screen.getByText('Not graded')).toBeInTheDocument()
    expect(screen.getByText('Estimated refund')).toBeInTheDocument()
    expect(screen.getByTestId('refund-total')).toHaveTextContent('₹1,298')
    expect(screen.queryByText(/Why is a refund lower/i)).not.toBeInTheDocument()
  })
})
