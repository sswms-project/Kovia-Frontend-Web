import { describe, expect, it } from 'vitest'
import { reviewInventoryAnomalySchema } from './review-inventory-anomaly.schema'

describe('reviewInventoryAnomalySchema', () => {
  it.each([
    ['Confirmed', '', false],
    ['Confirmed', '   ', false],
    ['Confirmed', 'Xuất nhầm lô', true],
    ['Dismissed', '', true],
  ] as const)('%s with note "%s" is valid: %s', (decision, note, valid) => {
    expect(reviewInventoryAnomalySchema.safeParse({ decision, note }).success).toBe(valid)
  })

  it('trims the note', () => {
    expect(
      reviewInventoryAnomalySchema.parse({ decision: 'Confirmed', note: '  Đã kiểm  ' }).note
    ).toBe('Đã kiểm')
  })
})
