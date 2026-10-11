import { describe, expect, it } from 'vitest'
import type {
  GoodsReceiptItem,
  PutAwayHeldSlot,
  PutAwayPlanLine,
  PutAwaySlotSuggestion,
} from '../types/inbound.types'
import {
  buildPlannedAllocations,
  buildPlanRequestFromAllocations,
  getPutawayEvidenceError,
  getPutawayHeldRows,
  getPutawayPlanDeviation,
  getRequiredScanRows,
  isPutawayDeviationReasonValid,
  matchScannedSlotCode,
  isPutawayReasonValid,
  resolveSlotCode,
} from './putaway-plan'
import {
  buildPlanDrafts,
  getHeldSlotWarning,
  getSuggestedQuantities,
  getUnplannedQuantity,
  toSavePlanRequest,
  validatePlanDrafts,
} from './putaway-plan-draft'

const baseUnitId = 'base-unit'
const cartonUnitId = 'carton-unit'

function planLine(slotId: string, quantity: number): PutAwayPlanLine {
  return {
    id: `plan-${slotId}`,
    slotId,
    slotCode: slotId.toUpperCase(),
    rackCode: 'KE-01',
    isSystemDefaultSlot: false,
    quantity,
  }
}

function makeItem(overrides: Partial<GoodsReceiptItem> = {}): GoodsReceiptItem {
  return {
    id: 'item-1',
    inboundRequestItemId: 'request-item',
    productId: 'product',
    productSKU: 'BEER',
    productName: 'Bia',
    baseUnitId,
    baseUnitName: 'Lon',
    enteredUnitId: cartonUnitId,
    conversionFactorSnapshot: 24,
    allowedUnits: [
      {
        unitId: baseUnitId,
        unitName: 'Lon',
        unitCode: 'LON',
        quantityPrecision: 0,
        conversionFactor: 1,
      },
      {
        unitId: cartonUnitId,
        unitName: 'Thùng',
        unitCode: 'THUNG',
        quantityPrecision: 0,
        conversionFactor: 24,
      },
    ],
    lotId: null,
    lotNumber: null,
    manufacturedDate: null,
    expiryDate: null,
    orderedQuantity: 240,
    receivedQuantity: 240,
    damagedQuantity: 0,
    usableQuantity: 240,
    putAwayQuantity: 0,
    remainingPutAwayQuantity: 240,
    exceptionReason: null,
    putAwayDetails: [],
    putAwayPlan: [],
    ...overrides,
  }
}

describe('buildPlannedAllocations', () => {
  it('keeps the previous behaviour for items without a plan', () => {
    const lines = buildPlannedAllocations(makeItem())

    expect(lines).toEqual([
      {
        goodsReceiptItemId: 'item-1',
        slotId: '',
        enteredQuantity: 10,
        enteredUnitId: cartonUnitId,
      },
    ])
  })

  it('pre-fills one line per planned slot and leaves the unplanned remainder without a slot', () => {
    const lines = buildPlannedAllocations(
      makeItem({ putAwayPlan: [planLine('slot-a', 96), planLine('slot-b', 48)] })
    )

    expect(lines).toEqual([
      {
        goodsReceiptItemId: 'item-1',
        slotId: 'slot-a',
        enteredQuantity: 4,
        enteredUnitId: cartonUnitId,
      },
      {
        goodsReceiptItemId: 'item-1',
        slotId: 'slot-b',
        enteredQuantity: 2,
        enteredUnitId: cartonUnitId,
      },
      { goodsReceiptItemId: 'item-1', slotId: '', enteredQuantity: 4, enteredUnitId: cartonUnitId },
    ])
  })

  it('falls back to the base unit when the plan is not a whole number of cartons', () => {
    const lines = buildPlannedAllocations(makeItem({ putAwayPlan: [planLine('slot-a', 10)] }))

    expect(lines[0]).toMatchObject({
      slotId: 'slot-a',
      enteredQuantity: 10,
      enteredUnitId: baseUnitId,
    })
  })
})

describe('getPutawayPlanDeviation', () => {
  const item = makeItem({ putAwayPlan: [planLine('slot-a', 96)] })
  const line = (slotId: string) => ({
    goodsReceiptItemId: 'item-1',
    slotId,
    enteredQuantity: 1,
    enteredUnitId: baseUnitId,
  })

  it('is not a deviation when the quantity stays within the planned slot', () => {
    const result = getPutawayPlanDeviation([line('slot-a')], [96], [item])

    expect(result.requiresReason).toBe(false)
  })

  it('flags a different slot and any excess over the planned quantity', () => {
    expect(getPutawayPlanDeviation([line('slot-b')], [10], [item]).offPlanRows).toEqual(
      new Set([0])
    )
    expect(getPutawayPlanDeviation([line('slot-a')], [100], [item]).requiresReason).toBe(true)
  })

  it('never flags items that have no plan', () => {
    const result = getPutawayPlanDeviation([line('slot-z')], [10], [makeItem()])

    expect(result.requiresReason).toBe(false)
  })

  it('ignores rows that are not complete yet', () => {
    expect(getPutawayPlanDeviation([line('')], [10], [item]).requiresReason).toBe(false)
    expect(getPutawayPlanDeviation([line('slot-b')], [null], [item]).requiresReason).toBe(false)
  })
})

describe('reason and photo rules', () => {
  it('requires a reason of at least five characters', () => {
    expect(isPutawayReasonValid('  abc ')).toBe(false)
    expect(isPutawayReasonValid('Kệ đã đầy')).toBe(true)
    expect(isPutawayReasonValid('x'.repeat(501))).toBe(false)
  })

  it('accepts at most three JPG or PNG photos up to 5 MB', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' })

    expect(getPutawayEvidenceError(png, 0)).toBeNull()
    expect(getPutawayEvidenceError(png, 3)).toContain('tối đa 3 ảnh')
    expect(
      getPutawayEvidenceError(new File(['x'], 'a.pdf', { type: 'application/pdf' }), 0)
    ).toContain('JPG')
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    expect(getPutawayEvidenceError(big, 0)).toContain('5 MB')
  })
})

describe('plan drafts', () => {
  const item = makeItem({ putAwayPlan: [planLine('slot-a', 96)] })
  const slots = [{ id: 'slot-a' }, { id: 'slot-b', unavailableReason: 'Vị trí đã đầy' }]

  it('starts from the saved plan', () => {
    expect(buildPlanDrafts([item])).toEqual({
      'item-1': [{ key: 'plan-slot-a', slotId: 'slot-a', quantity: 96 }],
    })
  })

  it('rejects over-planning, duplicate slots and missing slots but only warns about full slots', () => {
    const valid = validatePlanDrafts(
      [item],
      {
        'item-1': [
          { key: '1', slotId: 'slot-a', quantity: 100 },
          { key: '2', slotId: 'slot-b', quantity: 40 },
        ],
      },
      slots
    )
    expect(valid.canSave).toBe(true)
    expect(valid.lineWarnings.get('item-1:2')).toBe('Vị trí đã đầy')

    const over = validatePlanDrafts(
      [item],
      { 'item-1': [{ key: '1', slotId: 'slot-a', quantity: 241 }] },
      slots
    )
    expect(over.canSave).toBe(false)
    expect(over.itemErrors.get('item-1')).toContain('Chỉ còn 240')

    const duplicate = validatePlanDrafts(
      [item],
      {
        'item-1': [
          { key: '1', slotId: 'slot-a', quantity: 1 },
          { key: '2', slotId: 'slot-a', quantity: 1 },
        ],
      },
      slots
    )
    expect(duplicate.lineErrors.get('item-1:2')).toContain('đã được cấu hình')

    const missing = validatePlanDrafts(
      [item],
      { 'item-1': [{ key: '1', slotId: '', quantity: 1 }] },
      slots
    )
    expect(missing.lineErrors.get('item-1:1')).toContain('chọn vị trí')

    const fractional = validatePlanDrafts(
      [item],
      { 'item-1': [{ key: '1', slotId: 'slot-a', quantity: 1.234 }] },
      slots
    )
    expect(fractional.canSave).toBe(false)
  })

  it('builds a request that clears items left without lines and reports the unplanned remainder', () => {
    const request = toSavePlanRequest([item], { 'item-1': [] }, 'v1')

    expect(request).toEqual({
      expectedVersion: 'v1',
      items: [{ goodsReceiptItemId: 'item-1', slots: [] }],
    })
    expect(getUnplannedQuantity(item, [{ key: '1', slotId: 'slot-a', quantity: 90.5 }])).toBe(149.5)
  })

  it('skips items that are already fully put away', () => {
    const done = makeItem({ remainingPutAwayQuantity: 0 })

    expect(toSavePlanRequest([done], {}, 'v1').items).toEqual([])
  })
})

describe('suggested allocation', () => {
  const item = makeItem()
  const suggestion = (slotId: string, suggestedQuantity: number): PutAwaySlotSuggestion => ({
    slotId,
    slotCode: slotId.toUpperCase(),
    rackCode: 'KE-01',
    zoneName: 'Khu A',
    score: 1,
    reason: 'ok',
    source: 'Rules',
    warnings: [],
    suggestedQuantity,
    availableQuantity: null,
  })

  it('splits the item across every slot the suggestion gave a quantity to', () => {
    const quantities = getSuggestedQuantities(item, [
      suggestion('slot-a', 150),
      suggestion('slot-b', 90),
      suggestion('slot-c', 0),
    ])

    expect(quantities).toEqual([
      { slotId: 'slot-a', quantity: 150 },
      { slotId: 'slot-b', quantity: 90 },
    ])
  })

  it('never plans more than what is left to put away', () => {
    const quantities = getSuggestedQuantities(
      item,
      [suggestion('slot-a', 150), suggestion('slot-b', 90)],
      100
    )

    expect(quantities).toEqual([{ slotId: 'slot-a', quantity: 100 }])
  })

  it('falls back to the first slot when the response carries no quantities', () => {
    expect(
      getSuggestedQuantities(item, [suggestion('slot-a', 0), suggestion('slot-b', 0)])
    ).toEqual([{ slotId: 'slot-a', quantity: 240 }])
  })

  it('warns when a slot is kept for another product that is about to arrive', () => {
    const heldSlots: PutAwayHeldSlot[] = [
      {
        slotId: 'slot-a',
        slotCode: 'A-01',
        productId: 'other-product',
        sku: 'WINE',
        productName: 'Rượu',
        heldQuantity: 40,
        expectedDate: '2026-10-10T03:00:00+00:00',
        inboundRequestCode: 'YC-1',
      },
    ]

    expect(getHeldSlotWarning(heldSlots, 'slot-a', 'product')).toContain('WINE')
    expect(getHeldSlotWarning(heldSlots, 'slot-a', 'product')).toContain('YC-1')
    // Chính sản phẩm đang được chừa chỗ thì không cảnh báo.
    expect(getHeldSlotWarning(heldSlots, 'slot-a', 'other-product')).toBeUndefined()
    expect(getHeldSlotWarning(heldSlots, 'slot-b', 'product')).toBeUndefined()
    expect(getHeldSlotWarning(undefined, 'slot-a', 'product')).toBeUndefined()
  })
})

describe('deviation reason groups, held slots and slot code confirmation', () => {
  const held = (heldQuantity: number | null): PutAwayHeldSlot => ({
    slotId: 'slot-a',
    slotCode: 'A-01',
    productId: 'other-product',
    sku: 'WINE',
    productName: 'Rượu',
    heldQuantity,
    expectedDate: '2026-10-10T03:00:00+00:00',
    inboundRequestCode: 'YC-1',
  })
  const allocation = (slotId: string) => ({
    goodsReceiptItemId: 'item-1',
    slotId,
    enteredQuantity: 1,
    enteredUnitId: baseUnitId,
  })

  it('accepts a preset reason group without a note but still asks for one on "Other"', () => {
    expect(isPutawayDeviationReasonValid('SlotFull', '')).toBe(true)
    expect(isPutawayDeviationReasonValid('Other', '')).toBe(false)
    expect(isPutawayDeviationReasonValid('', 'abc')).toBe(false)
    expect(isPutawayDeviationReasonValid('Other', 'Kệ đang sửa')).toBe(true)
  })

  it('warns on rows that use a held slot and requires a reason when the slot is fully kept', () => {
    const item = makeItem()

    const partial = getPutawayHeldRows(
      [allocation('slot-b'), allocation('slot-a')],
      [item],
      [held(40)]
    )
    expect([...partial.warnings.keys()]).toEqual([1])
    expect(partial.requiresReason).toBe(false)

    expect(getPutawayHeldRows([allocation('slot-a')], [item], [held(null)]).requiresReason).toBe(
      true
    )
    expect(getPutawayHeldRows([allocation('slot-a')], [item], undefined).warnings.size).toBe(0)
  })

  it('matches a scanned code to a slot and rejects a code of a different slot', () => {
    const slots = [
      { id: 'slot-a', code: 'A-01' },
      { id: 'slot-b', code: 'B-01' },
    ]

    expect(resolveSlotCode(' a-01 ', slots, '')).toEqual({
      status: 'confirmed',
      slotId: 'slot-a',
      code: 'a-01',
    })
    expect(resolveSlotCode('B-01', slots, 'slot-a').status).toBe('error')
    // Mã vạch riêng của vị trí không có trong danh sách: để Backend đối chiếu.
    expect(resolveSlotCode('8930001', slots, 'slot-a')).toEqual({
      status: 'confirmed',
      slotId: 'slot-a',
      code: '8930001',
    })
    expect(resolveSlotCode('8930001', slots, '').status).toBe('error')
    expect(resolveSlotCode('  ', slots, 'slot-a').status).toBe('error')
  })
})

describe('saving the put-away screen as a plan', () => {
  it('merges rows of the same slot, skips rows without a slot and clears items left empty', () => {
    const first = makeItem()
    const second = makeItem({ id: 'item-2' })
    const row = (goodsReceiptItemId: string, slotId: string) => ({
      goodsReceiptItemId,
      slotId,
      enteredQuantity: 1,
      enteredUnitId: baseUnitId,
    })

    const request = buildPlanRequestFromAllocations(
      [
        row('item-1', 'slot-a'),
        row('item-1', 'slot-a'),
        row('item-1', 'slot-b'),
        row('item-1', ''),
      ],
      [96, 24.5, 48, 10],
      [first, second],
      'v7'
    )

    expect(request).toEqual({
      expectedVersion: 'v7',
      items: [
        {
          goodsReceiptItemId: 'item-1',
          slots: [
            { slotId: 'slot-a', quantity: 120.5 },
            { slotId: 'slot-b', quantity: 48 },
          ],
        },
        { goodsReceiptItemId: 'item-2', slots: [] },
      ],
    })
  })
})

describe('scanning slot codes as put-away evidence', () => {
  const slots = [
    { id: 'slot-a', code: 'A-01' },
    { id: 'slot-b', code: 'B-01' },
    { id: 'slot-c', code: 'C-01' },
  ]
  const lines = [
    { index: 0, slotId: 'slot-a', confirmedSlotCode: 'A-01' },
    { index: 1, slotId: 'slot-b' },
    { index: 2, slotId: 'slot-b' },
  ]

  it('ticks the first unconfirmed row of the scanned slot', () => {
    expect(matchScannedSlotCode(' b-01 ', slots, lines)).toEqual({
      status: 'confirmed',
      index: 1,
      code: 'b-01',
      slotCode: 'B-01',
    })
  })

  it('rejects a slot that is not in the allocation, an unknown code and a repeated scan', () => {
    const wrongPlace = matchScannedSlotCode('C-01', slots, lines)
    expect(wrongPlace.status === 'error' && wrongPlace.message).toContain('không nằm trong phân bổ')
    expect(matchScannedSlotCode('ZZ-99', slots, lines).status).toBe('error')
    expect(matchScannedSlotCode('A-01', slots, lines).status).toBe('error')
  })

  it('requires a scan only for rows of products the manager gave a location to', () => {
    const planned = makeItem({ putAwayPlan: [planLine('slot-a', 96)] })
    const free = makeItem({ id: 'item-2' })
    const row = (goodsReceiptItemId: string, slotId: string, confirmedSlotCode?: string) => ({
      goodsReceiptItemId,
      slotId,
      enteredQuantity: 1,
      enteredUnitId: baseUnitId,
      confirmedSlotCode,
    })

    expect(
      getRequiredScanRows(
        [
          row('item-1', 'slot-a', 'A-01'),
          row('item-1', 'slot-b'),
          row('item-1', ''),
          row('item-2', 'slot-c'),
        ],
        [planned, free]
      )
    ).toEqual({ required: [0, 1], missing: [1] })
  })
})
