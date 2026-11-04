import { describe, expect, it } from 'vitest'
import type { StockIssueRequestItem } from '../types/stock-issue.types'
import { stockIssuePdfQuantities } from './stock-issue-pdf-quantities'

describe('stock issue PDF quantities', () => {
  const item = {
    quantity: 20,
    enteredQuantity: 2,
    conversionFactor: 10,
    pickDetails: [
      { pickedQuantity: 10, issuedAt: '2026-11-04T00:00:00Z', returnedQuantity: 5 },
      { pickedQuantity: 10, issuedAt: null },
    ],
  } as StockIssueRequestItem
  it('counts issued base units only and does not subtract customer returns', () => {
    expect(stockIssuePdfQuantities(item)).toEqual({ requested: 2, issued: 1 })
  })
  it('rejects an invalid conversion factor', () => {
    expect(() => stockIssuePdfQuantities({ ...item, conversionFactor: 0 })).toThrow()
  })
})
