import { describe, expect, it } from 'vitest'
import { getNotificationQueryKeys } from './platform-services-format'

const id = '6c4f1d2e-9a3b-4c5d-8e7f-0a1b2c3d4e5f'

describe('getNotificationQueryKeys', () => {
  it('targets the referenced cycle count plus its lists', () => {
    expect(
      getNotificationQueryKeys({
        type: 'CycleCountUpdate',
        referenceType: 'CycleCount',
        referenceId: id,
      })
    ).toEqual([
      ['cycle-counts', 'detail', id],
      ['cycle-counts', 'list'],
    ])
  })

  it('keeps cross-domain roots when the reference belongs to another group', () => {
    expect(
      getNotificationQueryKeys({
        type: 'StockAdjustmentUpdate',
        referenceType: 'StockAdjustment',
        referenceId: id,
      })
    ).toEqual([
      ['stock-adjustments', 'detail', id],
      ['stock-adjustments', 'list'],
      ['cycle-counts'],
      ['inventory'],
    ])
  })

  it('falls back to whole roots without a reference', () => {
    expect(
      getNotificationQueryKeys({ type: 'CycleCountUpdate', referenceType: null, referenceId: null })
    ).toEqual([['cycle-counts']])
  })
})
