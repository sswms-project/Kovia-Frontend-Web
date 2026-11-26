import { describe, it, expect } from 'vitest'
import { validateLowStockFilters, lowStockDate, LOW_STOCK_FILTER_LABELS } from './low-stock-alert'
const base = { statusFilter: 'Active', pageNumber: 1, pageSize: 20 }
describe('low stock filters', () => {
  it('accepts default and validates query values without widening scope', () => {
    expect(validateLowStockFilters(base)).toBeNull()
    for (const change of [
      { warehouseId: 'bad' },
      { productId: '00000000-0000-0000-0000-000000000000' },
      { statusFilter: 'Unknown' },
      { pageNumber: -1 },
      { pageNumber: 2147483647 },
      { pageSize: 1000 },
      { searchTerm: 'a'.repeat(101) },
      { dateFrom: '2026-02-30' },
      { dateFrom: '2026-11-27', dateTo: '2026-11-26' },
    ])
      expect(validateLowStockFilters({ ...base, ...change })).not.toBeNull()
    expect(validateLowStockFilters(base, 'bad')).not.toBeNull()
  })
  it('formats Vietnam time and never guesses missing resolution dates', () => {
    expect(lowStockDate('2026-11-25T17:00:00Z')).toContain('26/11/26')
    expect(lowStockDate(null)).toBe('Chưa có thông tin')
    expect(LOW_STOCK_FILTER_LABELS.Acknowledged).toBe('Đã tiếp nhận')
  })
})
