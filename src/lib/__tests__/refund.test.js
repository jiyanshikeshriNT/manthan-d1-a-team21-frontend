import { describe, expect, it } from 'vitest'
import { formatINR } from '../format'
import { acceptedUnits, refundForItem, refundTotal } from '../refund'

const item = (unitPricePaise, quantity = 1, id = 'a') => ({ returnItemId: id, unitPricePaise, quantity })

describe('refundForItem', () => {
  it('refunds grades A and B in full and grade C at 50%', () => {
    expect(refundForItem(item(129900), { grade: 'A', decision: 'ACCEPT' })).toBe(129900)
    expect(refundForItem(item(129900), { grade: 'B', decision: 'ACCEPT' })).toBe(129900)
    expect(refundForItem(item(129900), { grade: 'C', decision: 'ACCEPT' })).toBe(64950)
  })

  it('refunds nothing for a rejected item or before a grade is chosen', () => {
    expect(refundForItem(item(129900), { grade: 'A', decision: 'REJECT' })).toBe(0)
    expect(refundForItem(item(129900), { grade: '', decision: 'ACCEPT' })).toBe(0)
    expect(refundForItem(item(129900), {})).toBe(0)
  })

  it('rounds half up on integer paise', () => {
    expect(refundForItem(item(1), { grade: 'C', decision: 'ACCEPT' })).toBe(1) // 0.5 -> 1
    expect(refundForItem(item(3), { grade: 'C', decision: 'ACCEPT' })).toBe(2) // 1.5 -> 2
    expect(refundForItem(item(5), { grade: 'C', decision: 'ACCEPT' })).toBe(3) // 2.5 -> 3
    expect(refundForItem(item(7, 3), { grade: 'C', decision: 'ACCEPT' })).toBe(11) // 10.5 -> 11
  })

  it('refunds only the accepted units on a partial accept', () => {
    expect(refundForItem(item(64900, 3), { grade: 'A', decision: 'PARTIAL', acceptedQty: '2' })).toBe(129800)
    expect(refundForItem(item(64900, 3), { grade: 'C', decision: 'PARTIAL', acceptedQty: 2 })).toBe(64900)
  })
})

describe('acceptedUnits', () => {
  it('clamps a partial quantity to what was returned', () => {
    expect(acceptedUnits(3, { decision: 'PARTIAL', acceptedQty: '9' })).toBe(3)
    expect(acceptedUnits(3, { decision: 'PARTIAL', acceptedQty: '-1' })).toBe(0)
    expect(acceptedUnits(3, { decision: 'PARTIAL', acceptedQty: 'abc' })).toBe(0)
  })
})

describe('refundTotal / formatINR', () => {
  it('adds the lines and formats paise', () => {
    const items = [item(129900, 1, 'a'), item(64900, 3, 'b')]
    const lines = { a: { grade: 'C', decision: 'ACCEPT' }, b: { grade: 'A', decision: 'PARTIAL', acceptedQty: 2 } }
    expect(refundTotal(items, lines)).toBe(194750)
    expect(formatINR(194750)).toBe('₹1,947.50')
    expect(formatINR(129900)).toBe('₹1,299')
  })
})
