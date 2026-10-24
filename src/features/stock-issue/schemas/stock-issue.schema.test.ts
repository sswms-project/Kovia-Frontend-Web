import { describe, expect, it } from 'vitest'
import { createStockIssueRequestSchema, recordStockPickingSchema } from './stock-issue.schema'

describe('outbound request code validation', () => {
  const values = {
    stockRecipientId: '10000000-0000-4000-8000-000000000001',
    warehouseId: '10000000-0000-4000-8000-000000000002',
    purpose: '',
    referenceCode: '',
    issueDate: '',
    note: '',
    lines: [
      { productId: '10000000-0000-4000-8000-000000000003', quantity: 1, unitId: '', note: '' },
    ],
  }
  it.each(['', '  MY-CODE  ', 'X'.repeat(100)])(
    'accepts blank or editable codes within the server limit',
    (code) => {
      const result = createStockIssueRequestSchema.parse({ ...values, stockIssueRequestCode: code })
      expect(result.stockIssueRequestCode).toBe(code.trim())
    }
  )
  it('rejects a code beyond the server limit', () => {
    const result = createStockIssueRequestSchema.safeParse({
      ...values,
      stockIssueRequestCode: 'X'.repeat(101),
    })
    expect(result.error?.issues[0]?.path).toEqual(['stockIssueRequestCode'])
  })
})

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
    destinationStagingSlotId: 'staging-slot',
    scannedStagingSlotCode: 'STAGING-01',
    scannedSlotCode: 'SOURCE-01',
    unitName: 'Cái',
    unitFactor: 1,
    ...overrides,
  }
}

describe('recordStockPickingSchema', () => {
  it('requires a configured destination but not a destination scan', () => {
    expect(
      recordStockPickingSchema.safeParse({
        lines: [line({ barcode: null, scannedStagingSlotCode: undefined })],
      }).success
    ).toBe(true)
    expect(
      recordStockPickingSchema.safeParse({
        lines: [
          line({
            barcode: null,
            destinationStagingSlotId: undefined,
            scannedStagingSlotCode: undefined,
          }),
        ],
      }).success
    ).toBe(false)
  })
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
