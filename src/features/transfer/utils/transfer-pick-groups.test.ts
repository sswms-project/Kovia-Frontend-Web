import { describe, expect, it } from 'vitest'
import type { TransferPickDetail } from '../types/transfer.types'
import { groupPicks } from './transfer-pick-groups'

function pick(overrides: Partial<TransferPickDetail>): TransferPickDetail {
  return {
    id: crypto.randomUUID(),
    inventoryStockId: 'stock-1',
    slotCode: 'A-01',
    lotId: null,
    lotNumber: null,
    pickedQuantity: 0,
    returnedQuantity: 0,
    dispatchedQuantity: 0,
    pickedAt: '2026-10-09T01:00:00Z',
    rackCode: 'A-01',
    isSystemDefaultSlot: true,
    ...overrides,
  }
}

describe('groupPicks', () => {
  it('merges repeated picks at one location into a single holding figure', () => {
    const groups = groupPicks([
      pick({ pickedQuantity: 6, returnedQuantity: 5 }),
      pick({ pickedQuantity: 5 }),
      pick({ inventoryStockId: 'stock-2', pickedQuantity: 14 }),
    ])
    expect(groups.map((group) => [group.picked, group.returned, group.held])).toEqual([
      [11, 5, 6],
      [14, 0, 14],
    ])
  })

  it('hides fully returned locations but keeps dispatched ones', () => {
    const groups = groupPicks([
      pick({ pickedQuantity: 4, returnedQuantity: 4 }),
      pick({ inventoryStockId: 'stock-2', pickedQuantity: 3, dispatchedQuantity: 3 }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ held: 0, dispatched: 3 })
  })
})
