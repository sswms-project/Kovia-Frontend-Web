import { describe, expect, it } from 'vitest'
import type { TransferAllocationOption } from '../types/transfer.types'
import {
  buildAllocationMoves,
  hasChanges,
  initialTargets,
  nonFefoStockIds,
  validateTargets,
} from './transfer-allocation'

function option(overrides: Partial<TransferAllocationOption>): TransferAllocationOption {
  return {
    inventoryStockId: 'stock',
    location: 'Khu K01 / Kệ A / A-01',
    lotNumber: null,
    expiryDate: null,
    availableQuantity: 0,
    reservedForItem: 0,
    movableQuantity: 0,
    ...overrides,
  }
}

const HELD = option({
  inventoryStockId: 'a',
  location: 'Khu K01 / Kệ A / A-01',
  reservedForItem: 10,
  movableQuantity: 10,
})
const FREE = option({
  inventoryStockId: 'b',
  location: 'Khu K01 / Kệ A / B-01',
  availableQuantity: 20,
})
const OTHER = option({
  inventoryStockId: 'c',
  location: 'Khu K02 / Kệ C / C-01',
  availableQuantity: 5,
})

describe('allocation targets', () => {
  it('starts from what is reserved today and has no changes', () => {
    const targets = initialTargets([HELD, FREE])
    expect(targets).toEqual({ a: 10, b: 0 })
    expect(hasChanges([HELD, FREE], targets)).toBe(false)
    expect(validateTargets([HELD, FREE], targets)).toBeNull()
  })

  it('requires the total to stay the same', () => {
    expect(validateTargets([HELD, FREE], { a: 6, b: 0 })).toMatch(/Tổng số lượng/)
    expect(validateTargets([HELD, FREE], { a: 6, b: 4 })).toBeNull()
  })

  it('keeps the picked part where it is and caps each place by its free stock', () => {
    const partlyPicked = option({
      inventoryStockId: 'a',
      reservedForItem: 10,
      movableQuantity: 4,
    })
    expect(validateTargets([partlyPicked, FREE], { a: 3, b: 7 })).toMatch(/đã lấy/)
    expect(validateTargets([HELD, FREE], { a: 10 - 25, b: 25 })).toMatch(/không hợp lệ|trống/)
    expect(validateTargets([HELD, FREE], { a: -10, b: 20 })).toMatch(/không hợp lệ/)
    expect(
      validateTargets([HELD, option({ ...FREE, availableQuantity: 3 })], { a: 6, b: 4 })
    ).toMatch(/chỉ còn trống/)
  })

  it('rejects more than two decimals', () => {
    expect(validateTargets([HELD, FREE], { a: 5.005, b: 4.995 })).toMatch(/2 chữ số/)
  })
})

describe('buildAllocationMoves', () => {
  it('moves part of the reservation to another place', () => {
    expect(buildAllocationMoves('item', [HELD, FREE], { a: 6, b: 4 })).toEqual([
      { itemId: 'item', fromInventoryStockId: 'a', toInventoryStockId: 'b', quantity: 4 },
    ])
  })

  it('splits one source across several places', () => {
    expect(buildAllocationMoves('item', [HELD, FREE, OTHER], { a: 0, b: 7, c: 3 })).toEqual([
      { itemId: 'item', fromInventoryStockId: 'a', toInventoryStockId: 'b', quantity: 7 },
      { itemId: 'item', fromInventoryStockId: 'a', toInventoryStockId: 'c', quantity: 3 },
    ])
  })

  it('pairs several sources with several destinations', () => {
    const second = option({ inventoryStockId: 'd', reservedForItem: 5, movableQuantity: 5 })
    expect(
      buildAllocationMoves('item', [HELD, second, FREE, OTHER], { a: 4, d: 2, b: 5, c: 4 })
    ).toEqual([
      { itemId: 'item', fromInventoryStockId: 'a', toInventoryStockId: 'b', quantity: 5 },
      { itemId: 'item', fromInventoryStockId: 'a', toInventoryStockId: 'c', quantity: 1 },
      { itemId: 'item', fromInventoryStockId: 'd', toInventoryStockId: 'c', quantity: 3 },
    ])
  })

  it('has nothing to send when nothing changed', () => {
    expect(buildAllocationMoves('item', [HELD, FREE], initialTargets([HELD, FREE]))).toEqual([])
  })
})

describe('nonFefoStockIds', () => {
  const early = option({
    inventoryStockId: 'early',
    lotNumber: 'L1',
    expiryDate: '2026-11-01',
    reservedForItem: 5,
    movableQuantity: 5,
  })
  const late = option({
    inventoryStockId: 'late',
    lotNumber: 'L2',
    expiryDate: '2027-02-01',
    availableQuantity: 10,
  })

  it('flags taking more from a later lot while an earlier one still has stock', () => {
    expect([...nonFefoStockIds([early, late], { early: 0, late: 5 })]).toEqual(['late'])
  })

  it('does not flag staying with the earliest lot or places without a lot', () => {
    expect([...nonFefoStockIds([early, late], { early: 5, late: 0 })]).toEqual([])
    expect([...nonFefoStockIds([HELD, FREE], { a: 6, b: 4 })]).toEqual([])
  })
})
