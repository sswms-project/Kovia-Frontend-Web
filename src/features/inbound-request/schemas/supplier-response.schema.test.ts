import { describe, expect, it } from 'vitest'
import { operationalToday } from '@/lib/operational-date-time'
import { supplierResponseSchema } from './supplier-response.schema'

describe('supplierResponseSchema', () => {
  it('accepts a plain confirmation without note or date', () => {
    expect(
      supplierResponseSchema.safeParse({ decision: 'Confirmed', note: '', proposedDate: '' })
        .success
    ).toBe(true)
  })

  it('requires a reason when the supplier rejects', () => {
    const result = supplierResponseSchema.safeParse({
      decision: 'Rejected',
      note: '   ',
      proposedDate: '',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['note'])
  })

  it('requires a date that is not in the past when proposing a new date', () => {
    expect(
      supplierResponseSchema.safeParse({ decision: 'ProposedNewDate', note: '', proposedDate: '' })
        .success
    ).toBe(false)
    expect(
      supplierResponseSchema.safeParse({
        decision: 'ProposedNewDate',
        note: '',
        proposedDate: '2000-01-01',
      }).success
    ).toBe(false)
    expect(
      supplierResponseSchema.safeParse({
        decision: 'ProposedNewDate',
        note: '',
        proposedDate: operationalToday(),
      }).success
    ).toBe(true)
  })
})
