import { describe, expect, it } from 'vitest'
import type { GoodsReceiptDetail } from '../types/inbound.types'
import { needsReceivingLocationPick } from './receipt-receiving-location'

const items = (receivedQuantity: number) =>
  [{ receivedQuantity }] as unknown as GoodsReceiptDetail['items']

describe('needsReceivingLocationPick', () => {
  it('hides the picker once the receipt has a saved receiving slot', () => {
    expect(needsReceivingLocationPick({ receivingSlotId: 'slot-1', items: items(5) })).toBe(false)
  })

  it('asks for a location when goods were received but no slot is saved', () => {
    expect(needsReceivingLocationPick({ receivingSlotId: null, items: items(5) })).toBe(true)
  })

  it('does not ask when nothing was received', () => {
    expect(needsReceivingLocationPick({ receivingSlotId: null, items: items(0) })).toBe(false)
  })
})
