import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StockIssueRequestItem } from '../../types/stock-issue.types'
import { StockIssueRequestLines } from './StockIssueRequestLines'

const item: StockIssueRequestItem = {
  id: 'item',
  productId: 'product',
  productName: 'Kềm A3',
  sku: 'SKU00001',
  quantity: 20,
  pickedQuantity: 10,
  returnedQuantity: 0,
  returnableQuantity: 10,
  note: null,
  barcode: null,
  enteredQuantity: 20,
  enteredUnitId: 'unit',
  enteredUnitName: 'Cái',
  conversionFactor: 1,
  pickLocations: [
    {
      inventoryStockId: 'stock',
      slotId: 'source',
      slotCode: '__SYSTEM_DEFAULT__',
      zoneCode: 'K01',
      rackCode: 'A04',
      isSystemDefaultSlot: true,
      lotId: null,
      lotNumber: null,
      expiryDate: null,
      reservedQuantity: 10,
    },
  ],
  pickDetails: [
    {
      id: 'pick',
      inventoryStockId: 'stock',
      slotId: 'source',
      slotCode: '__SYSTEM_DEFAULT__',
      zoneCode: 'K01',
      rackCode: 'A04',
      isSystemDefaultSlot: true,
      stagingSlotId: 'staging',
      stagingSlotCode: '__SYSTEM_DEFAULT__',
      stagingZoneCode: 'ZX',
      stagingRackCode: 'XUAT-01',
      isSystemDefaultStagingSlot: true,
      lotId: null,
      lotNumber: null,
      qualityStatus: 'Good',
      pickedQuantity: 10,
      returnedQuantity: 0,
      returnableQuantity: 10,
      pickedByUserId: 'staff',
      pickedByName: 'Nhân viên',
      pickedAt: '2026-10-23T10:00:00Z',
      issuedAt: null,
    },
  ],
}

describe('StockIssueRequestLines location labels', () => {
  it('shows physical source/staging paths on mobile and desktop even when internal codes are equal', () => {
    render(
      <StockIssueRequestLines
        items={[item]}
        canRemovePick={false}
        isRemovingPick={false}
        onRemovePickDetail={vi.fn()}
      />
    )
    expect(screen.getAllByText('Khu K01 / Kệ A04')).toHaveLength(4)
    expect(screen.getAllByText(/Chờ xuất tại Khu ZX \/ Kệ XUAT-01/)).toHaveLength(2)
    expect(screen.queryByText(/__SYSTEM_DEFAULT__/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bỏ phân bổ' })).not.toBeInTheDocument()
  })
  it('keeps real slot codes and explicitly handles old detail responses without metadata', () => {
    const legacyItem = {
      ...item,
      pickLocations: [{ ...item.pickLocations[0]!, slotCode: 'S01', isSystemDefaultSlot: false }],
      pickDetails: item.pickDetails.map((detail) => ({
        ...detail,
        rackCode: null,
        zoneCode: null,
        stagingZoneCode: null,
        stagingRackCode: null,
      })),
    }
    render(
      <StockIssueRequestLines
        items={[legacyItem]}
        canRemovePick={false}
        isRemovingPick={false}
        onRemovePickDetail={vi.fn()}
      />
    )
    expect(screen.getAllByText('Khu K01 / Kệ A04 / S01')).toHaveLength(2)
    expect(screen.getAllByText('Vị trí chưa xác định')).toHaveLength(2)
    expect(screen.queryByText(/__SYSTEM_DEFAULT__/)).not.toBeInTheDocument()
  })
})
