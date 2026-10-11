import { describe, expect, it } from 'vitest'
import type {
  TransferPickAlternative,
  TransferPickSheetLine,
  TransferPickSuggestion,
} from '../types/transfer.types'
import {
  INITIAL_PICK_SCAN_STATE,
  codesMatch,
  getDefaultPickQuantity,
  isNonFefoChoice,
  nextEachUnitQuantity,
  normalizeScanCode,
  pickScanReducer,
  validatePickQuantity,
} from './transfer-scan'

const suggestion: TransferPickSuggestion = {
  inventoryStockId: 'stock-a',
  slotId: 'slot-a',
  slotCode: 'A-01',
  slotBarcode: 'BC-A-01',
  lotId: null,
  lotNumber: null,
  expiryDate: null,
  suggestedQuantity: 6,
  reservedQuantity: 10,
  rackCode: 'A',
  isSystemDefaultSlot: false,
}

const alternative: TransferPickAlternative = {
  inventoryStockId: 'stock-b',
  slotId: 'slot-b',
  slotCode: 'B-02',
  slotBarcode: null,
  lotId: null,
  lotNumber: null,
  expiryDate: null,
  availableQuantity: 8,
  rackCode: 'B',
  isSystemDefaultSlot: false,
}

const defaultSlotSuggestion: TransferPickSuggestion = {
  ...suggestion,
  inventoryStockId: 'stock-d',
  slotCode: '__SYSTEM_DEFAULT__',
  slotBarcode: null,
  rackCode: 'A07',
  isSystemDefaultSlot: true,
}

const line = {
  sku: 'SKU-001',
  productBarcode: '893000111',
  remainingQuantity: 4,
} as TransferPickSheetLine

describe('scan code matching', () => {
  it('ignores case and surrounding spaces like the backend', () => {
    expect(normalizeScanCode('  a-01 ')).toBe('a-01')
    expect(codesMatch(' a-01', 'A-01')).toBe(true)
    expect(codesMatch('bc-a-01', 'A-01', 'BC-A-01')).toBe(true)
    expect(codesMatch('A-02', 'A-01', null)).toBe(false)
    expect(codesMatch('   ', '')).toBe(false)
  })
})

describe('pickScanReducer', () => {
  it('moves from slot to product to ready when both codes match', () => {
    const afterSlot = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: 'a-01',
      suggestions: [suggestion],
      alternatives: [],
    })
    expect(afterSlot.step).toBe('product')
    expect(afterSlot.suggestion).toBe(suggestion)

    const ready = pickScanReducer(afterSlot, { type: 'scan-product', code: '893000111', line })
    expect(ready.step).toBe('ready')
    expect(ready.error).toBeNull()
  })

  it('accepts the SKU as a product code when there is no barcode', () => {
    const afterSlot = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: 'BC-A-01',
      suggestions: [suggestion],
      alternatives: [],
    })
    const ready = pickScanReducer(afterSlot, {
      type: 'scan-product',
      code: 'sku-001',
      line: { ...line, productBarcode: null },
    })
    expect(ready.step).toBe('ready')
  })

  it('rejects an unknown slot and stays on the slot step', () => {
    const state = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: 'Z-99',
      suggestions: [suggestion],
      alternatives: [alternative],
    })
    expect(state.step).toBe('slot')
    expect(state.error).toContain('Z-99')
    expect(state.offeredAlternative).toBeNull()
  })

  it('offers the scanned slot as a replacement when it holds eligible stock', () => {
    const state = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: 'b-02',
      suggestions: [suggestion],
      alternatives: [alternative],
    })
    expect(state.step).toBe('slot')
    expect(state.offeredAlternative).toBe(alternative)
  })

  it('keeps the slot but asks again when the product code is wrong', () => {
    const afterSlot = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: 'A-01',
      suggestions: [suggestion],
      alternatives: [],
    })
    const wrong = pickScanReducer(afterSlot, { type: 'scan-product', code: 'OTHER', line })
    expect(wrong.step).toBe('product')
    expect(wrong.error).toContain('OTHER')
    expect(wrong.suggestion).toBe(suggestion)
  })

  it('ignores a product scan before a slot is chosen and resets cleanly', () => {
    expect(
      pickScanReducer(INITIAL_PICK_SCAN_STATE, { type: 'scan-product', code: 'SKU-001', line })
    ).toBe(INITIAL_PICK_SCAN_STATE)
    expect(pickScanReducer({ ...INITIAL_PICK_SCAN_STATE, step: 'ready' }, { type: 'reset' })).toBe(
      INITIAL_PICK_SCAN_STATE
    )
  })
})

describe('pick quantity', () => {
  it('fills in the suggested quantity capped by what is still needed', () => {
    expect(getDefaultPickQuantity(suggestion, { remainingQuantity: 4 })).toBe(4)
    expect(getDefaultPickQuantity(suggestion, { remainingQuantity: 20 })).toBe(6)
    expect(getDefaultPickQuantity(suggestion, { remainingQuantity: 0 })).toBe(0)
  })

  it('validates positive, two-decimal quantities that do not exceed the maximum', () => {
    expect(validatePickQuantity(3, 4)).toBeNull()
    expect(validatePickQuantity(0, 4)).toContain('lớn hơn 0')
    expect(validatePickQuantity(Number.NaN, 4)).toContain('lớn hơn 0')
    expect(validatePickQuantity(1.234, 4)).toContain('2 chữ số')
    expect(validatePickQuantity(5, 4)).toContain('vượt quá')
  })
})

describe('isNonFefoChoice', () => {
  const early = { inventoryStockId: 'early', expiryDate: '2026-11-01' }
  const late = { inventoryStockId: 'late', expiryDate: '2027-02-01' }
  const noExpiry = { inventoryStockId: 'none', expiryDate: null }

  it('flags a lot that expires later than the earliest candidate', () => {
    expect(isNonFefoChoice(late, [early, late, noExpiry])).toBe(true)
    expect(isNonFefoChoice(early, [early, late, noExpiry])).toBe(false)
    expect(isNonFefoChoice(noExpiry, [early, noExpiry])).toBe(true)
  })

  it('never flags when every candidate has no expiry', () => {
    expect(isNonFefoChoice(noExpiry, [noExpiry])).toBe(false)
  })
})

describe('scanning a system default slot', () => {
  it('accepts the rack code and keeps the same suggestion', () => {
    const next = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: ' a07 ',
      suggestions: [defaultSlotSuggestion],
      alternatives: [],
    })
    expect(next.step).toBe('product')
    expect(next.suggestion).toBe(defaultSlotSuggestion)
  })

  it('does not accept the rack code of a regular slot', () => {
    const next = pickScanReducer(INITIAL_PICK_SCAN_STATE, {
      type: 'scan-slot',
      code: 'A',
      suggestions: [suggestion],
      alternatives: [],
    })
    expect(next.step).toBe('slot')
    expect(next.suggestion).toBeNull()
  })
})

describe('scanning one unit at a time', () => {
  it('counts from zero on the first product scan and stops at the maximum', () => {
    expect(nextEachUnitQuantity('product', 5, 3)).toBe(1)
    expect(nextEachUnitQuantity('ready', 1, 3)).toBe(2)
    expect(nextEachUnitQuantity('ready', 2, 3)).toBe(3)
    expect(nextEachUnitQuantity('ready', 3, 3)).toBeNull()
    expect(nextEachUnitQuantity('ready', 0, 0)).toBeNull()
  })
})
