import { describe, expect, it } from 'vitest'
import type { ReceivingTaskLine } from '../types/inbound.types'
import { getOverReceiveMessage } from './receipt-units'

const line: ReceivingTaskLine = {
  baseUnitId: 'pcs',
  baseUnitName: 'Cái',
  baseUnitQuantityPrecision: 0,
  enteredUnitId: 'box',
  enteredUnitName: 'Thùng',
  enteredUnitQuantityPrecision: 0,
  conversionFactorSnapshot: 12,
  inboundRequestItemId: 'item-1',
  productId: 'p-1',
  productSKU: 'SKU-1',
  productName: 'Sản phẩm',
  barcodeValue: null,
  isLotTracked: false,
  orderedQuantity: 1200,
  receivedQuantity: 0,
  remainingQuantity: 1200,
}

describe('getOverReceiveMessage', () => {
  it('returns null while received quantity fits the remaining quantity', () => {
    expect(getOverReceiveMessage(line, 'pcs', 1200)).toBeNull()
    expect(getOverReceiveMessage(line, 'box', 100)).toBeNull()
  })

  it('formats the remaining quantity without trailing zeros in the selected unit', () => {
    expect(getOverReceiveMessage(line, 'pcs', 1201)).toBe('Vượt số lượng còn lại (còn 1.200 Cái).')
    expect(getOverReceiveMessage(line, 'box', 101)).toBe('Vượt số lượng còn lại (còn 100 Thùng).')
  })

  it('ignores an empty input', () => {
    expect(getOverReceiveMessage(line, 'pcs', Number.NaN)).toBeNull()
    expect(getOverReceiveMessage(line, 'pcs', undefined)).toBeNull()
  })
})
