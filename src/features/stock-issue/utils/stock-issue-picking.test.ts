import { describe, expect, it } from 'vitest'
import type {
  StockIssuePickLocation,
  StockIssueRequestItem,
  StockIssueRequestSummary,
} from '../types/stock-issue.types'
import {
  buildStockPickingLines,
  normalizeScanCode,
  resolveStockPickingScan,
} from './stock-issue-picking'

function location(overrides: Partial<StockIssuePickLocation>): StockIssuePickLocation {
  return {
    inventoryStockId: 'stock',
    slotId: 'slot',
    slotCode: 'A-01',
    zoneCode: 'Z1',
    rackCode: 'R1',
    lotId: null,
    lotNumber: null,
    expiryDate: null,
    reservedQuantity: 1,
    ...overrides,
  }
}

function item(overrides: Partial<StockIssueRequestItem>): StockIssueRequestItem {
  return {
    id: 'item',
    productId: 'product',
    productName: 'Sản phẩm',
    sku: 'SKU',
    quantity: 1,
    pickedQuantity: 0,
    returnedQuantity: 0,
    returnableQuantity: 0,
    note: null,
    barcode: null,
    enteredQuantity: 1,
    enteredUnitId: 'unit',
    enteredUnitName: 'Lon',
    conversionFactor: 1,
    pickLocations: [],
    pickDetails: [],
    ...overrides,
  }
}

// Sữa: 5 lon, đã lấy 1, còn 4 lon giữ ở A-2 (1) và B-10 (3). Trà: 2 thùng x 24 lon, giữ ở A-02.
const order = {
  items: [
    item({
      id: 'item-milk',
      productId: 'milk',
      productName: 'Sữa hộp',
      sku: 'MILK',
      barcode: '8930001',
      quantity: 5,
      enteredQuantity: 5,
      pickedQuantity: 1,
      pickLocations: [
        location({
          inventoryStockId: 'stock-b',
          slotCode: 'B-10',
          zoneCode: 'Z1',
          rackCode: 'R2',
          reservedQuantity: 3,
        }),
        location({
          inventoryStockId: 'stock-a',
          slotCode: 'A-2',
          lotNumber: 'L1',
          reservedQuantity: 1,
        }),
      ],
    }),
    item({
      id: 'item-tea',
      productId: 'tea',
      productName: 'Trà',
      sku: 'TEA',
      quantity: 48,
      enteredQuantity: 2,
      enteredUnitName: 'Thùng',
      conversionFactor: 24,
      pickLocations: [
        location({ inventoryStockId: 'stock-tea', slotCode: 'A-02', reservedQuantity: 48 }),
      ],
    }),
    item({
      id: 'item-done',
      productId: 'done',
      sku: 'DONE',
      quantity: 3,
      enteredQuantity: 3,
      pickedQuantity: 3,
    }),
  ],
} as unknown as StockIssueRequestSummary

describe('buildStockPickingLines', () => {
  it('shows the full physical rack path and accepts its code for a default slot', () => {
    const source = location({
      slotCode: '__SYSTEM_DEFAULT__',
      rackCode: 'A04',
      isSystemDefaultSlot: true,
    })
    const lines = buildStockPickingLines({ ...order, items: [item({ pickLocations: [source] })] })
    expect(lines[0]).toMatchObject({
      inventoryStockId: source.inventoryStockId,
      slotCode: 'A04',
      slotPath: 'Khu Z1 / Kệ A04',
    })
    expect(resolveStockPickingScan(lines, 'A04', null)).toMatchObject({
      kind: 'shelf',
      lineIndex: 0,
    })
    expect(resolveStockPickingScan(lines, '__SYSTEM_DEFAULT__', null).kind).toBe('rejected')
  })
  it('creates one line per reserved location in walking order and skips fully picked items', () => {
    const lines = buildStockPickingLines(order)

    expect(lines.map((line) => `${line.slotCode}:${line.sku}`)).toEqual([
      'A-2:MILK',
      'A-02:TEA',
      'B-10:MILK',
    ])
    expect(lines[0]).toMatchObject({
      inventoryStockId: 'stock-a',
      availableQuantity: 1,
      remainingQuantity: 4,
      lotNumber: 'L1',
      pickedQuantity: 0,
    })
  })

  it('counts cartons, not base units, for lines ordered in a conversion unit', () => {
    const tea = buildStockPickingLines(order).find((line) => line.sku === 'TEA')

    expect(tea).toMatchObject({
      unitName: 'Thùng',
      unitFactor: 24,
      availableQuantity: 2,
      remainingQuantity: 2,
    })
  })

  it('keeps an unallocated line when an item has no reserved location', () => {
    const lines = buildStockPickingLines({
      items: [item({ id: 'x', sku: 'X', quantity: 2, enteredQuantity: 2 })],
    } as unknown as StockIssueRequestSummary)

    expect(lines).toHaveLength(1)
    expect(lines[0]?.inventoryStockId).toBe('')
  })
})

describe('resolveStockPickingScan', () => {
  const lines = buildStockPickingLines(order)

  it('normalises codes the same way as the backend', () => {
    expect(normalizeScanCode(' A-01 ')).toBe('a01')
  })

  it('treats a reserved location code as a shelf scan', () => {
    expect(resolveStockPickingScan(lines, 'b10', null)).toEqual({
      kind: 'shelf',
      slotCode: 'B-10',
      lineIndex: 2,
    })
  })

  it('fills the whole quantity of the first pending line of the product along the route', () => {
    expect(resolveStockPickingScan(lines, '8930001', null)).toEqual({
      kind: 'product',
      lineIndex: 0,
      pickedQuantity: 1,
    })
    // 2 cartons are reserved at A-02: one scan takes both.
    expect(resolveStockPickingScan(lines, 'TEA', null)).toEqual({
      kind: 'product',
      lineIndex: 1,
      pickedQuantity: 2,
    })
  })

  it('fills only what the request still needs when several locations hold the product', () => {
    const picked = lines.map((line, index) => (index === 0 ? { ...line, pickedQuantity: 1 } : line))

    // 4 cans are still needed in total and B-10 holds 3 of them.
    expect(resolveStockPickingScan(picked, 'milk', 'B-10')).toEqual({
      kind: 'product',
      lineIndex: 2,
      pickedQuantity: 3,
    })
  })

  it('moves to the next location once the first one is exhausted', () => {
    const picked = lines.map((line, index) => (index === 0 ? { ...line, pickedQuantity: 1 } : line))

    expect(resolveStockPickingScan(picked, 'milk', null)).toMatchObject({
      kind: 'product',
      lineIndex: 2,
    })
  })

  it('only picks from the scanned shelf', () => {
    expect(resolveStockPickingScan(lines, 'MILK', 'B-10')).toMatchObject({
      kind: 'product',
      lineIndex: 2,
    })
    expect(resolveStockPickingScan(lines, 'TEA', 'B-10')).toMatchObject({ kind: 'rejected' })
  })

  it('rejects unknown codes and quantities beyond what the request still needs', () => {
    expect(resolveStockPickingScan(lines, 'UNKNOWN', null)).toMatchObject({ kind: 'rejected' })
    const full = lines.map((line) => (line.sku === 'TEA' ? { ...line, pickedQuantity: 2 } : line))
    expect(resolveStockPickingScan(full, 'TEA', null)).toMatchObject({ kind: 'rejected' })
  })
})
