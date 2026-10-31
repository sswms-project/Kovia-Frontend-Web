import { expect, it } from 'vitest'
import { baseSourceQuantity, stockIssueSourcesSchema } from './stock-issue-sources.schema'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'

const order = {
  items: [{ id: 'item', sku: 'SKU-A', quantity: 30, pickedQuantity: 10, conversionFactor: 10 }],
} as StockIssueRequestSummary
const values = {
  reason: 'Kệ gần cửa xuất',
  allocations: [{ itemId: 'item', inventoryStockId: 'stock', quantity: 2, path: 'Khu A / Kệ 1' }],
}
it('converts entered units and validates only the unpicked remainder', () => {
  expect(stockIssueSourcesSchema(order).safeParse(values).success).toBe(true)
  expect(baseSourceQuantity(3, 0.1)).toBe(0.3)
})
it('rejects duplicate sources, fractional entered units and incomplete allocations', () => {
  for (const allocations of [
    [{ ...values.allocations[0], quantity: 1 }],
    [{ ...values.allocations[0], quantity: 1.5 }],
    [values.allocations[0], values.allocations[0]],
    [{ ...values.allocations[0], inventoryStockId: '' }],
    [{ ...values.allocations[0], itemId: 'other' }],
  ])
    expect(stockIssueSourcesSchema(order).safeParse({ ...values, allocations }).success).toBe(false)
})
it('allows splitting across distinct sources while requiring a reason', () => {
  const split = {
    ...values,
    allocations: [
      { ...values.allocations[0], quantity: 1 },
      { ...values.allocations[0], inventoryStockId: 'stock-2', quantity: 1 },
    ],
  }
  expect(stockIssueSourcesSchema(order).safeParse(split).success).toBe(true)
  expect(stockIssueSourcesSchema(order).safeParse({ ...split, reason: '  ' }).success).toBe(false)
})
