import { describe, expect, it } from 'vitest'
import {
  getOpeningStockPendingLots,
  normalizeOpeningStockLotNumber,
  openingStockErrorMessage,
  openingStockLocationDescription,
} from './opening-stock-import'
import type { OpeningStockImportRow } from '../types/opening-stock-import.types'

describe('opening-stock location capacity labels', () => {
  const location = { id: 'slot', label: 'A-01' }
  it('shows remaining capacity and marks full locations without hiding their limit', () => {
    const configured = {
      ...location,
      capacity: 20,
      capacityUnitName: 'Thùng',
      requiresCapacityConfiguration: false,
    }
    expect(openingStockLocationDescription({ ...configured, remainingCapacity: 8 })).toBe(
      'Còn trống: 8 Thùng · Tối đa: 20 Thùng'
    )
    expect(openingStockLocationDescription({ ...configured, remainingCapacity: 0 })).toBe(
      'Còn trống: 0 Thùng (đã đầy) · Tối đa: 20 Thùng'
    )
    expect(
      openingStockLocationDescription({
        ...configured,
        requiresCapacityConfiguration: true,
        remainingCapacity: null,
      })
    ).not.toContain('Còn trống:')
  })
  it('shows configured maximum and unit using Vietnamese numbers', () => {
    expect(
      openingStockLocationDescription({
        ...location,
        capacity: 1234.5,
        capacityUnitName: 'Thùng',
        requiresCapacityConfiguration: false,
      })
    ).toBe('Sức chứa tối đa: 1.234,5 Thùng')
  })
  it('distinguishes no limit, invalid legacy configuration and an older API response', () => {
    expect(
      openingStockLocationDescription({
        ...location,
        capacity: null,
        requiresCapacityConfiguration: false,
      })
    ).toBe('Chưa đặt giới hạn sức chứa.')
    expect(
      openingStockLocationDescription({
        ...location,
        capacity: 100,
        requiresCapacityConfiguration: true,
      })
    ).toContain('100 (chưa có đơn vị)')
    expect(
      openingStockLocationDescription({ ...location, requiresCapacityConfiguration: true })
    ).toContain('Cần cấu hình')
    expect(openingStockLocationDescription(location)).toBeUndefined()
  })
})

function row(key: string, lotNumber: string, productId = 'product'): OpeningStockImportRow {
  return {
    rowKey: key,
    rowNumber: 2,
    sheetName: 'Tồn đầu',
    rawValues: {},
    productId,
    sku: 'SP',
    productName: 'Hàng',
    slotId: key,
    locationLabel: key,
    unitId: 'unit',
    unitName: 'Cái',
    quantity: 1,
    quantityText: '1',
    lotId: null,
    lotNumber,
    manufacturedDate: null,
    expiryDate: null,
    newLot: { lotNumber, manufacturedDate: null, expiryDate: null },
    qualityStatus: 'Good',
    eligibilityStatus: 'Available',
    fieldErrors: {},
    errors: [],
    warnings: [],
    isValid: true,
    validationFingerprint: key,
  }
}
describe('opening stock confirmation and errors', () => {
  it('counts a pending lot only once across locations, case, whitespace and NFC', () => {
    const rows = [row('1', ' LÔ-01 '), row('2', 'lô-01'.normalize('NFD'))]
    expect(getOpeningStockPendingLots(rows, ['1', '2'])).toHaveLength(1)
    expect(normalizeOpeningStockLotNumber(' lô-01 ')).toBe('LÔ-01')
  })
  it('never merges distinct accents or products and only counts selected new lots', () => {
    const rows = [
      row('1', 'LO-01'),
      row('2', 'LÔ-01'),
      row('3', 'LÔ-01', 'other-product'),
      { ...row('4', 'LÔ-02'), newLot: null },
    ]
    expect(getOpeningStockPendingLots(rows, ['1', '2', '3', '4'])).toHaveLength(3)
    expect(getOpeningStockPendingLots(rows, ['2'])).toHaveLength(1)
    expect(getOpeningStockPendingLots(rows, [])).toHaveLength(0)
  })
  it('preserves an ApiErrorResponse message without exposing machine codes', () => {
    expect(
      openingStockErrorMessage(
        {
          statusCode: 409,
          message: 'Lô đã thay đổi. Vui lòng kiểm tra lại.',
          errors: { errorCode: ['OPENING_STOCK_LOT_CHANGED'], code: ['INTERNAL'] },
        },
        'Lỗi chung'
      )
    ).toBe('Lô đã thay đổi. Vui lòng kiểm tra lại.')
  })
  it('keeps field validation details and supports ordinary errors and fallbacks', () => {
    expect(
      openingStockErrorMessage(
        {
          statusCode: 400,
          message: 'Dữ liệu chưa đúng.',
          errors: { quantity: ['Số lượng phải lớn hơn 0.'] },
        },
        'Lỗi chung'
      )
    ).toContain('Số lượng phải lớn hơn 0.')
    expect(openingStockErrorMessage(new Error('Mất kết nối'), 'Lỗi chung')).toBe('Mất kết nối')
    expect(openingStockErrorMessage(null, 'Lỗi chung')).toBe('Lỗi chung')
  })
})
