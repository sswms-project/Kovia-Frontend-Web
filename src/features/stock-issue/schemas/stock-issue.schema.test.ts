import { describe, expect, it } from 'vitest'
import { recordStockPickingSchema } from './stock-issue.schema'

function line(overrides: Record<string, unknown>) {
  return {
    stockIssueRequestItemId: 'item',
    productId: 'product',
    productName: 'Sản phẩm',
    sku: 'SKU',
    barcode: 'SKU',
    remainingQuantity: 40,
    inventoryStockId: 'stock',
    availableQuantity: 40,
    pickedQuantity: 40,
    scannedBarcode: '',
    unitName: 'Cái',
    unitFactor: 1,
    ...overrides,
  }
}

describe('recordStockPickingSchema', () => {
  it('asks to scan a product that has a barcode before confirming', () => {
    const result = recordStockPickingSchema.safeParse({ lines: [line({})] })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('quét mã SKU')
  })

  it('accepts a quantity typed after the barcode was scanned once', () => {
    expect(
      recordStockPickingSchema.safeParse({ lines: [line({ scannedBarcode: 'SKU' })] }).success
    ).toBe(true)
  })

  it('does not require a scan for a product without a barcode', () => {
    expect(recordStockPickingSchema.safeParse({ lines: [line({ barcode: null })] }).success).toBe(
      true
    )
  })
})
