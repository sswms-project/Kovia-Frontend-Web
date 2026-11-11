import type { GoodsReceiptDetail } from '../types/inbound.types'

// Submit falls back to the receipt's saved receiving slot, so the picker is only needed when none is saved.
export function needsReceivingLocationPick(
  receipt: Pick<GoodsReceiptDetail, 'receivingSlotId' | 'items'>
): boolean {
  return !receipt.receivingSlotId && receipt.items.some((item) => item.receivedQuantity > 0)
}
