import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import StatusTimeline from '../StatusTimeline'

const ev = (...statuses) => statuses.map((status, i) => ({ status, at: `2026-11-1${i}T10:00:00Z` }))
const items = () => screen.getAllByRole('listitem')
const labels = () => items().map((li) => within(li).getAllByText(/./)[0].textContent)

describe('StatusTimeline: Refunded path', () => {
  it('shows all six steps as done with the refund message and no current step', () => {
    render(<StatusTimeline status="REFUNDED" events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUND_IN_PROGRESS', 'REFUNDED')} />)

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

  it.each(['AWAITING_FINANCE', 'REFUND_IN_PROGRESS'])('maps %s to Inspected (current)', (status) => {
    render(<StatusTimeline status={status} events={ev('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED')} />)

    expect(items()[4]).toHaveAttribute('aria-current', 'step')
    expect(within(items()[4]).getByText('In progress')).toBeInTheDocument()
    expect(within(items()[5]).getByText('Upcoming')).toBeInTheDocument()
    expect(screen.queryByText(/awaiting finance|refund processing/i)).not.toBeInTheDocument()
  })

  it('shows PENDING_REVIEW as the Requested step with a review message', () => {
    render(<StatusTimeline status="PENDING_REVIEW" events={ev('REQUESTED')} />)

    const requested = items()[0]
    expect(requested).toHaveAttribute('aria-current', 'step')
    expect(within(requested).getByText('In progress')).toBeInTheDocument()
    expect(within(requested).getByText(/being reviewed by our team/i)).toBeInTheDocument()
    expect(screen.queryByText('Under review')).not.toBeInTheDocument()
  })
})

describe('StatusTimeline: Cancelled path', () => {
  it('ends with a Cancelled step after the steps reached', () => {
    render(<StatusTimeline status="CANCELLED" events={ev('REQUESTED', 'APPROVED', 'CANCELLED')} />)

    expect(labels()).toEqual(['Requested', 'Approved', 'Cancelled'])
    const cancelled = items()[2]
    expect(cancelled).toHaveAttribute('aria-current', 'step')
    expect(within(cancelled).getAllByText('Cancelled')).toHaveLength(2) // label and state text
    expect(within(cancelled).getByText('You cancelled this return.')).toBeInTheDocument()
  })
})
