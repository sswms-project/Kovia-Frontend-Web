import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferPickSheetLine } from '../../types/transfer.types'
import { PickLineCard } from './PickLineCard'

afterEach(cleanup)

const line: TransferPickSheetLine = {
  lineId: 'l1',
  itemId: 'i1',
  productId: 'p1',
  sku: 'SKU-1',
  productName: 'Bia Tiger',
  productBarcode: null,
  baseUnitName: 'Thùng',
  plannedQuantity: 3,
  pickedQuantity: 1,
  remainingQuantity: 2,
  pendingReturnQuantity: 0,
  status: 'Picking',
  suggestions: [
    {
      inventoryStockId: 's1',
      slotId: 'sl1',
      slotCode: '__SYSTEM_DEFAULT__',
      slotBarcode: null,
      lotId: null,
      lotNumber: null,
      expiryDate: null,
      suggestedQuantity: 2,
      reservedQuantity: 6,
      rackCode: 'A07',
      isSystemDefaultSlot: true,
    },
  ],
  picks: [
    {
      id: 'd1',
      inventoryStockId: 's1',
      slotCode: '__SYSTEM_DEFAULT__',
      lotId: null,
      lotNumber: null,
      pickedQuantity: 1,
      returnedQuantity: 0,
      dispatchedQuantity: 1,
      pickedAt: '2026-10-08T00:00:00Z',
      rackCode: 'A07',
      isSystemDefaultSlot: true,
    },
  ],
  exceptions: [],
} as TransferPickSheetLine

function renderCard(canAct: boolean) {
  const noop = vi.fn()
  render(
    <PickLineCard
      line={line}
      canAct={canAct}
      onPick={noop}
      onSwitch={noop}
      onEscalate={noop}
      onReturn={noop}
    />
  )
}

describe('PickLineCard', () => {
  it('shows pick suggestions with the rack name while the shipment can be picked', () => {
    renderCard(true)
    expect(screen.getByText('Lấy tại (theo FEFO)')).toBeInTheDocument()
    expect(screen.getAllByText('Kệ A07').length).toBeGreaterThan(0)
    expect(screen.queryByText('__SYSTEM_DEFAULT__')).not.toBeInTheDocument()
  })

  it('hides suggestions on a read-only shipment and counts dispatched quantity as picked', () => {
    renderCard(false)
    expect(screen.queryByText('Lấy tại (theo FEFO)')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
