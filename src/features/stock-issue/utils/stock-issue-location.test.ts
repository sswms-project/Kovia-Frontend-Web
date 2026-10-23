import { describe, expect, it } from 'vitest'
import { formatStockIssueLocation } from './stock-issue-location'

describe('outbound location labels', () => {
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
