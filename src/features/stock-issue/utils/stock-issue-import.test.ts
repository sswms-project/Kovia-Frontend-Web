import { describe, expect, it } from 'vitest'
import type { StockIssueImportPreviewRow } from '../types/stock-issue.types'
import { groupStockIssueImportRows } from './stock-issue-import'

function row(overrides: Partial<StockIssueImportPreviewRow>): StockIssueImportPreviewRow {
  return {
    rowNumber: 2,
    warehouseCode: 'KHO-1',
    recipientCode: 'KH1',
    referenceCode: null,
    purpose: null,
    sku: 'SKU',
    quantity: 1,
    warehouseId: 'warehouse',
    warehouseName: 'Kho',
    stockRecipientId: 'recipient-1',
    recipientName: 'Khách 1',
    productId: 'product-1',
    productName: 'Sản phẩm 1',
    errors: [],
    unitId: 'unit-1',
    unitName: 'Thùng',
    availableQuantity: 10,
    warnings: null,
    ...overrides,
  }
}

describe('groupStockIssueImportRows', () => {
  it('merges rows of the same recipient and reference into one request', () => {
    const groups = groupStockIssueImportRows([
      row({ referenceCode: 'PO-1', productId: 'a', purpose: 'Bán hàng' }),
      row({ referenceCode: 'PO-1', productId: 'b', quantity: 3, purpose: null }),
      row({ referenceCode: 'PO-2', productId: 'a' }),
      row({ stockRecipientId: 'recipient-2', referenceCode: 'PO-1', productId: 'a' }),
    ])

    expect(groups).toHaveLength(3)
    expect(groups[0]).toMatchObject({
      stockRecipientId: 'recipient-1',
      referenceCode: 'PO-1',
      purpose: 'Bán hàng',
    })
    expect(groups[0]?.items).toEqual([
      { productId: 'a', quantity: 1, unitId: 'unit-1' },
      { productId: 'b', quantity: 3, unitId: 'unit-1' },
    ])
  })

  it('takes the first purpose given for a request and skips rows without resolved ids', () => {
    const groups = groupStockIssueImportRows([
      row({ purpose: null }),
      row({ productId: 'b', purpose: 'Lý do muộn' }),
      row({ productId: null }),
      row({ quantity: null }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.purpose).toBe('Lý do muộn')
    expect(groups[0]?.items).toHaveLength(2)
  })
})
