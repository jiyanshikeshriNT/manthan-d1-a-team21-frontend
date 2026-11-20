import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import StatusTimeline from '../StatusTimeline'

const ev = (...statuses) => statuses.map((status, i) => ({ status, at: `2026-11-1${i}T10:00:00Z` }))
const items = () => screen.getAllByRole('listitem')
const labels = () => items().map((li) => within(li).getAllByText(/./)[0].textContent)

describe('StatusTimeline: Refunded path', () => {
  it('shows all six steps as done with the refund message and no current step', () => {
    render(<StatusTimeline status="REFUNDED" events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUND_PROCESSING', 'REFUNDED')} />)

    expect(screen.getByRole('list', { name: 'Return progress' }).tagName).toBe('OL')
    expect(labels()).toEqual(['Requested', 'Approved', 'In transit', 'Received', 'Inspected', 'Refunded'])
    items().forEach((li) => {
      expect(within(li).getByText('Done')).toBeInTheDocument()
      expect(li).not.toHaveAttribute('aria-current')
    })
    expect(within(items()[5]).getByText('Your refund has been sent.')).toBeInTheDocument()
    expect(within(items()[0]).getByText(/Nov/)).toBeInTheDocument() // timestamp
  })
})

describe('StatusTimeline: Rejected path', () => {
  it('replaces the final steps with Rejected after inspection', () => {
    render(<StatusTimeline status="REJECTED" events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REJECTED')} />)

    expect(labels()).toEqual(['Requested', 'Approved', 'In transit', 'Received', 'Inspected', 'Rejected'])
    expect(screen.queryByText('Refunded')).not.toBeInTheDocument()

    const rejected = items()[5]
    expect(rejected).toHaveAttribute('aria-current', 'step')
    expect(within(rejected).getByText('Not accepted')).toBeInTheDocument()
    expect(within(rejected).getByText('We couldn’t accept this return.')).toBeInTheDocument()
    expect(within(items()[4]).getByText('Done')).toBeInTheDocument()
  })

  it('shows only Requested then Rejected when rejected straight away', () => {
    render(<StatusTimeline status="REJECTED" events={ev('REQUESTED', 'REJECTED')} />)
    expect(labels()).toEqual(['Requested', 'Rejected'])
  })
})

describe('StatusTimeline: in-progress states', () => {
  it('marks the current step with aria-current and a plain-language line', () => {
    render(<StatusTimeline status="RECEIVED" events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED')} />)

    const current = items()[3]
    expect(current).toHaveAttribute('aria-current', 'step')
    expect(within(current).getByText('In progress')).toBeInTheDocument()
    expect(within(current).getByText('Your parcel has been received and is waiting for inspection.')).toBeInTheDocument()
    expect(within(items()[4]).getByText('Upcoming')).toBeInTheDocument()
  })

  it.each(['PENDING_FINANCE', 'REFUND_PROCESSING'])('maps %s to Inspected (current)', (status) => {
    render(<StatusTimeline status={status} events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', status)} />)

    expect(items()[4]).toHaveAttribute('aria-current', 'step')
    expect(within(items()[4]).getByText('In progress')).toBeInTheDocument()
    expect(within(items()[5]).getByText('Upcoming')).toBeInTheDocument()
    expect(screen.queryByText(/pending finance|refund processing/i)).not.toBeInTheDocument()
  })

  it('shows REFUND_FAILED as a retrying Refunded step', () => {
    render(<StatusTimeline status="REFUND_FAILED" events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUND_PROCESSING', 'REFUND_FAILED')} />)

    const refunded = items()[5]
    expect(within(items()[4]).getByText('Done')).toBeInTheDocument()
    expect(refunded).toHaveAttribute('aria-current', 'step')
    expect(within(refunded).getByText('Retrying')).toBeInTheDocument()
    expect(within(refunded).getByText('We’re retrying your refund. No action needed.')).toBeInTheDocument()
  })
})
