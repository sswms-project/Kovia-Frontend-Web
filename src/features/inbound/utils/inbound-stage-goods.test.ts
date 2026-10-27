import { describe, expect, it } from 'vitest'
import { receiptStageGoodsRows, receivingStageGoodsRows } from './inbound-goods-preview'
import type { GoodsReceiptItem, ReceivingTaskLine } from '../types/inbound.types'

export function receiptItem(overrides: Partial<GoodsReceiptItem> = {}): GoodsReceiptItem {
  return {
    id: 'line-A',
    inboundRequestItemId: 'request-line',
    productId: 'product',
    productSKU: 'SKU001',
    productName: 'Bia Tiger',
    baseUnitId: 'base',
    baseUnitName: 'Lon',
    enteredUnitId: 'box',
    enteredUnitName: 'Thùng',
    conversionFactorSnapshot: 24,
    allowedUnits: [],
    lotId: null,
    lotNumber: null,
    manufacturedDate: null,
    expiryDate: null,
    orderedQuantity: 240,
    receivedQuantity: 220,
    damagedQuantity: 4,
    rejectedQuantity: 20,
    usableQuantity: 216,
    putAwayQuantity: 96,
    remainingPutAwayQuantity: 120,
    exceptionReason: null,
    putAwayDetails: [],
    putAwayPlan: [
      {
        id: 'plan',
        slotId: 'slot',
        slotCode: '__SYSTEM_DEFAULT__',
        rackCode: 'A04',
        zoneCode: 'K01',
        zoneName: 'Khu đồ uống',
        isSystemDefaultSlot: true,
        quantity: 120,
      },
    ],
    ...overrides,
  }
}

describe('stage-specific inbound goods quantities', () => {
  it('uses task remaining and base units without reconstructing closed quantities', () => {
    const line: ReceivingTaskLine = {
      inboundRequestItemId: 'a',
      productId: 'p',
      productSKU: 'SKU001',
      productName: 'Bia',
      barcodeValue: null,
      isLotTracked: false,
      orderedQuantity: 100,
      receivedQuantity: 20,
      remainingQuantity: 30,
      baseUnitId: 'base',
      baseUnitName: 'Lon',
      enteredUnitId: 'box',
      enteredUnitName: 'Thùng',
      conversionFactorSnapshot: 24,
    }
    const row = receivingStageGoodsRows([line])[0]!
    expect(row.quantities).toEqual({ requested: 100, received: 20, remaining: 30 })
    expect(row.unit).toBe('Lon')
    expect(row.conversion).toBe('1 Thùng = 24 Lon')
    expect(row.plan).toEqual([])
  })
  it('does not add rejected goods to physical receipt or subtract damage twice', () => {
    const row = receiptStageGoodsRows([receiptItem()], 'receipt')[0]!
    expect(row.quantities).toEqual({ received: 220, usable: 216, damaged: 4, rejected: 20 })
    expect(row.plan).toEqual([])
  })
  it('shows remaining plans with zone before rack and hides internal slot codes', () => {
    const row = receiptStageGoodsRows([receiptItem()], 'putaway')[0]!
    expect(row.plan[0]?.label).toBe('Khu vực K01 · Khu đồ uống / Kệ A04')
    expect(row.plan[0]?.quantity).toBe(120)
    expect(row.quantities).toEqual({ usable: 216, putaway: 96, remaining: 120 })
    expect(JSON.stringify(row)).not.toContain('__SYSTEM_DEFAULT__')
  })
  it('does not infer completed historical plans from an empty plan', () => {
    const noPlan = receiptStageGoodsRows([receiptItem({ putAwayPlan: [] })], 'putaway')[0]!
    expect(noPlan.planState).toBe('Chưa cấu hình')
    const kept = receiptStageGoodsRows(
      [receiptItem({ remainingPutAwayQuantity: 0, keptAtReceivingQuantity: 216 })],
      'putaway'
    )[0]!
    expect(kept.planState).toBe('Không còn cần cất')
    expect(kept.plan).toEqual([])
    expect(kept.quantities.putaway).toBe(96)
    expect(kept.kept).toBe(216)
  })
  it('keeps missing optional values unknown and handles older zone metadata', () => {
    const item = receiptItem({ rejectedQuantity: undefined })
    item.putAwayPlan[0]!.zoneCode = undefined
    item.putAwayPlan[0]!.zoneName = undefined
    expect(receiptStageGoodsRows([item], 'receipt')[0]?.quantities.rejected).toBeUndefined()
    expect(receiptStageGoodsRows([item], 'putaway')[0]?.plan[0]?.label).toBe(
      'Kệ A04 · Chưa có thông tin khu vực'
    )
  })
})
