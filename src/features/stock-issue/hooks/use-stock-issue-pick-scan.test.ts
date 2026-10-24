import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { setScanPreferences } from '@/features/transfer/utils/scan-preferences'
import { useStockIssuePickScan } from './use-stock-issue-pick-scan'
import type { StockPickingLine } from '../utils/stock-issue-picking'

const source = {
  inventoryStockId: 'stock',
  slotId: 'slot',
  slotCode: '__SYSTEM_DEFAULT__',
  zoneCode: 'Z1',
  rackCode: 'R1',
  lotId: null,
  lotNumber: null,
  expiryDate: null,
  reservedQuantity: 20,
}
const line: StockPickingLine = {
  stockIssueRequestItemId: 'item',
  productId: 'product',
  inventoryStockId: 'stock',
  sku: 'SKU',
  barcode: 'BAR-01',
  productName: 'Hàng',
  remainingQuantity: 2,
  availableQuantity: 2,
  pickedQuantity: 0,
  unitName: 'Hộp',
  unitFactor: 10,
  slotCode: 'R1',
}
beforeEach(() => setScanPreferences({ eachUnit: false, feedback: false }))
describe('outbound shared scan sequence', () => {
  it('requires source then exact barcode and supports physical/printed location codes', () => {
    const { result } = renderHook(() => useStockIssuePickScan(line, source, 2, false))
    act(() => {
      expect(result.current.scanProduct('BAR-01')).toBe(false)
    })
    act(() => {
      expect(result.current.scanSlot('R-1')).toBe(false)
    })
    act(() => {
      expect(result.current.scanSlot('z1-r1')).toBe(true)
    })
    act(() => {
      expect(result.current.scanProduct('BAR01')).toBe(false)
    })
    act(() => {
      expect(result.current.scanProduct('BAR-01')).toBe(true)
    })
    expect(result.current.quantity).toBe(2)
    expect(result.current.slotCode).toBe('z1-r1')
    act(() => result.current.changeQuantity('1,5'))
    expect(result.current.quantityError).toContain('nguyên Hộp')
    act(() => result.current.reset())
    expect(result.current.ready).toBe(false)
    act(() => {
      expect(result.current.scanSlot('KOVIA:LOC:SLOT:slot')).toBe(true)
    })
  })
  it('counts entered units with rapid repeated scans and prevents exceeding the maximum', () => {
    setScanPreferences({ eachUnit: true })
    const { result } = renderHook(() => useStockIssuePickScan(line, source, 2, false))
    act(() => result.current.scanSlot('R1'))
    act(() => {
      result.current.scanProduct('BAR-01')
      result.current.scanProduct('BAR-01')
    })
    expect(result.current.quantity).toBe(2)
    act(() => {
      expect(result.current.scanProduct('BAR-01')).toBe(false)
    })
    expect(result.current.quantity).toBe(2)
  })
  it('blocks scans when locked and accepts SKU for products without a barcode', () => {
    const { result, rerender } = renderHook(
      ({ disabled }) => useStockIssuePickScan({ ...line, barcode: null }, source, 2, disabled),
      { initialProps: { disabled: true } }
    )
    act(() => {
      expect(result.current.scanSlot('R1')).toBe(false)
    })
    rerender({ disabled: false })
    act(() => result.current.scanSlot('R1'))
    act(() => {
      expect(result.current.scanProduct('SKU')).toBe(true)
    })
    expect(result.current.ready).toBe(true)
  })
})
