import { describe, expect, it } from 'vitest'
import { formatStockIssueLocation } from './stock-issue-location'
import { summarizeStockIssueSlots, stockIssuePendingSlotCodes } from './stock-issue-format'
import type { StockIssueRequestItem, StockIssuePickLocation } from '../types/stock-issue.types'

describe('outbound location labels', () => {
  it('summarizes physical paths without merging racks sharing the internal default code', () => {
    const source = (
      zoneCode: string,
      rackCode: string,
      slotCode = '__SYSTEM_DEFAULT__'
    ): StockIssuePickLocation => ({
      zoneCode,
      rackCode,
      slotCode,
      inventoryStockId: `${zoneCode}-${rackCode}`,
      slotId: `${zoneCode}-${rackCode}`,
      lotId: null,
      lotNumber: null,
      expiryDate: null,
      reservedQuantity: 1,
    })
    // Only pickLocations is read by the display helpers.
    const order = {
      items: [
        {
          pickLocations: [
            source('K01', 'A04'),
            source('K02', 'A04'),
            source('K01', 'A04'),
            source('K02', 'A05', 'S01'),
          ],
        } as StockIssueRequestItem,
      ],
    }
    expect(summarizeStockIssueSlots(order)).toBe(
      'Khu K01 / Kệ A04, Khu K02 / Kệ A04, Khu K02 / Kệ A05 / S01'
    )
    expect(summarizeStockIssueSlots(order, 1)).toBe('Khu K01 / Kệ A04 +2')
    expect(stockIssuePendingSlotCodes(order)).toEqual(['__SYSTEM_DEFAULT__', 'S01'])
    expect(summarizeStockIssueSlots({ items: [] })).toBeNull()
    expect(
      summarizeStockIssueSlots({
        items: [{ pickLocations: [source('', '')] } as StockIssueRequestItem],
      })
    ).toBe('Vị trí chưa xác định')
  })
  it('shows zone/rack for default slots and all three levels for real slots', () => {
    expect(
      formatStockIssueLocation({ slotCode: '__SYSTEM_DEFAULT__', zoneCode: 'K01', rackCode: 'A04' })
    ).toBe('Khu K01 / Kệ A04')
    expect(
      formatStockIssueLocation({
        slotCode: 'internal',
        zoneCode: 'K01',
        rackCode: 'A04',
        isSystemDefaultSlot: true,
      })
    ).toBe('Khu K01 / Kệ A04')
    expect(formatStockIssueLocation({ slotCode: 'S01', zoneCode: 'K01', rackCode: 'A04' })).toBe(
      'Khu K01 / Kệ A04 / S01'
    )
  })
  it('does not invent a rack for old responses missing its metadata', () => {
    expect(formatStockIssueLocation({ slotCode: '__system_default__' })).toBe(
      'Vị trí chưa xác định'
    )
    expect(formatStockIssueLocation({ slotCode: '__SYSTEM_DEFAULT__', zoneCode: 'K01' })).toBe(
      'Khu K01 / Vị trí chưa xác định'
    )
    expect(formatStockIssueLocation({ slotCode: 'BIN-__SYSTEM_DEFAULT__' })).toBe(
      'BIN-__SYSTEM_DEFAULT__'
    )
  })
})
