import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { StockMovement } from '../../types/inventory.types'
import { StockMovementDesktopTable, StockMovementMobileList } from './StockMovementResults'

afterEach(cleanup)

const movement: StockMovement = {
  id: 'movement-1',
  productId: 'product-1',
  sku: 'SKU1',
  productName: 'Bia Tiger',
  slotId: 'slot-1',
  slotCode: '__SYSTEM_DEFAULT__',
  isSystemDefaultSlot: true,
  lotId: null,
  lotNumber: null,
  qualityStatus: 'Good',
  eligibilityStatus: 'Available',
  quantityChange: 2,
  balanceAfter: 16,
  movementType: 'PutAway',
  referenceType: 'GoodsReceipt',
  referenceId: 'receipt-1',
  correctsMovementId: null,
  correctionReason: null,
  performedByUserId: 'staff-1',
  performedByName: 'Nhân viên',
  occurredAt: '2026-10-28T09:20:00Z',
  createdAt: '2026-10-28T09:20:00Z',
  warehouseName: 'Đà Nẵng',
  zoneCode: 'Z-C',
  zoneName: 'Khu chờ nhận/cất hàng',
  rackCode: 'CHO-01',
  rackName: 'Điểm chờ cất hàng 01',
  unitName: 'Thùng',
}

describe.each([
  ['desktop', StockMovementDesktopTable],
  ['mobile', StockMovementMobileList],
] as const)('movement location on %s', (_name, Results) => {
  it('shows the warehouse, zone and rack names with their codes, hiding technical slots', () => {
    const { container } = render(<Results items={[movement]} />)
    expect(screen.getByText('Đà Nẵng')).toBeTruthy()
    expect(screen.getByText('Khu vực Z-C - Khu chờ nhận/cất hàng')).toBeTruthy()
    expect(screen.getByText('Kệ CHO-01 - Điểm chờ cất hàng 01')).toBeTruthy()
    expect(container.textContent).not.toContain('__SYSTEM_DEFAULT__')
  })

  it('supports older API responses without names and preserves real slot codes', () => {
    render(
      <Results
        items={[
          {
            ...movement,
            zoneName: null,
            rackName: undefined,
            slotCode: 'A-01-02',
            isSystemDefaultSlot: false,
          },
        ]}
      />
    )
    expect(screen.getByText('Khu vực Z-C')).toBeTruthy()
    expect(screen.getByText('Kệ CHO-01')).toBeTruthy()
    expect(screen.getByText('Vị trí A-01-02')).toBeTruthy()
  })
})
