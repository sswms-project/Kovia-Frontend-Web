import { describe, expect, it } from 'vitest'

import { describeReturnLineSource } from './goods-return-suggestion'

describe('describeReturnLineSource', () => {
  it('shows SKU, lot, picked slot and issued quantity so duplicate lines are distinguishable', () => {
    expect(
      describeReturnLineSource({
        sku: 'SKU-01',
        lotNumber: 'L1',
        sourceSlotCode: 'A-01-01',
        issuedQuantity: 1200,
      })
    ).toBe('SKU-01 · Lô L1 · Lấy tại A-01-01 · Đã xuất 1.200')
  })

  it('omits unknown source info for saved-only lines', () => {
    expect(describeReturnLineSource({ sku: 'SKU-02', lotNumber: null })).toBe(
      'SKU-02 · Không theo lô'
    )
  })
})
