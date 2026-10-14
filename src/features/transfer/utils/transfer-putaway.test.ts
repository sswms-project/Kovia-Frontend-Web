import { describe, expect, it } from 'vitest'
import {
  buildTransferPutAwayEntries,
  splitTransferPutAwayExcess,
  transferPutAwayPlanStates,
} from './transfer-putaway'
import {
  putAwayFixture,
  putAwaySuggestionsFixture,
  RECEIPT_LOT,
  RECEIPT_SLOT,
} from './transfer-receipt-test-fixtures'

describe('Ngân sách cất hàng tốt dùng chung', () => {
  it('does not add a saved allocation absent from a capacity-validated proposal', () => {
    const sheet = putAwayFixture()
    const first = {
      ...sheet.rows[0]!,
      remainingQuantity: 8,
      planBudgets: [{ slotId: RECEIPT_SLOT, slotCode: 'S', path: 'S', remainingBudget: 8 }],
    }
    const second = {
      ...first,
      lineId: 'second-line',
      itemId: 'second-item',
      productId: 'second-product',
      sku: 'SKU-02',
      planBudgets: [],
    }
    sheet.rows = [first, second]
    const suggestions = putAwaySuggestionsFixture()
    const original = suggestions.items[0]!
    suggestions.items = [
      {
        ...original,
        itemId: first.itemId,
        suggestions: [
          { ...original.suggestions[0]!, slotId: 'T', path: 'T', suggestedQuantity: 8 },
        ],
      },
      {
        ...original,
        itemId: second.itemId,
        suggestions: [{ ...original.suggestions[0]!, suggestedQuantity: 8 }],
      },
    ]
    const entries = buildTransferPutAwayEntries(sheet, suggestions)
    expect(entries.map((entry) => [entry.destinationSlotId, entry.quantity])).toEqual([
      ['T', 8],
      [RECEIPT_SLOT, 8],
    ])
    expect(
      entries
        .filter((entry) => entry.destinationSlotId === RECEIPT_SLOT)
        .reduce((sum, entry) => sum + entry.quantity, 0)
    ).toBeLessThanOrEqual(10)
  })
  it('caps retained plans to validated capacity and leaves the excess unallocated', () => {
    const suggestions = putAwaySuggestionsFixture()
    suggestions.items[0]!.suggestions[0]!.suggestedQuantity = 3
    const entries = buildTransferPutAwayEntries(putAwayFixture(), suggestions)
    expect(entries.map((entry) => [entry.quantity, Boolean(entry.destinationSlotId)])).toEqual([
      [3, true],
      [5, false],
    ])
  })
  it('prefills rule suggestions without making them a saved manager plan or scan confirmation', () => {
    const sheet = putAwayFixture()
    sheet.rows.forEach((row) => {
      row.planBudgets = []
      row.planMode = 'Legacy'
    })
    const entries = buildTransferPutAwayEntries(sheet, putAwaySuggestionsFixture())
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      quantity: 8,
      destinationSlotId: RECEIPT_SLOT,
      plannedSlotId: '',
      scannedSlotCode: '',
      qualityStatus: 'Good',
    })
  })
  it('does not double allocate suggestions already consumed by the shared saved-plan budget', () => {
    const sheet = putAwayFixture()
    sheet.rows = [
      { ...sheet.rows[0]!, lotId: RECEIPT_LOT, remainingQuantity: 4 },
      { ...sheet.rows[0]!, remainingQuantity: 4 },
    ]
    expect(
      buildTransferPutAwayEntries(sheet, putAwaySuggestionsFixture()).map((entry) => entry.quantity)
    ).toEqual([4, 2, 2])
  })
  it('caps suggestions to actual remaining and leaves insufficient capacity visibly unallocated', () => {
    const sheet = putAwayFixture()
    sheet.rows.forEach((row) => {
      row.planBudgets = []
    })
    const suggestions = putAwaySuggestionsFixture()
    suggestions.items[0]!.suggestions[0]!.suggestedQuantity = 3
    expect(
      buildTransferPutAwayEntries(sheet, suggestions).map((entry) => [
        entry.quantity,
        Boolean(entry.destinationSlotId),
      ])
    ).toEqual([
      [3, true],
      [5, false],
    ])
    sheet.rows[0]!.remainingQuantity = 2
    expect(buildTransferPutAwayEntries(sheet, suggestions).map((entry) => entry.quantity)).toEqual([
      2,
    ])
  })
  it('allocates once across lots and excludes damaged stock from the form', () => {
    const sheet = putAwayFixture()
    sheet.rows = [
      { ...sheet.rows[0]!, lotId: RECEIPT_LOT, remainingQuantity: 4 },
      { ...sheet.rows[0]!, remainingQuantity: 4 },
      sheet.rows[1]!,
    ]
    const entries = buildTransferPutAwayEntries(sheet)
    expect(entries.map((entry) => [entry.quantity, Boolean(entry.destinationSlotId)])).toEqual([
      [4, true],
      [2, true],
      [2, false],
    ])
    expect(entries.every((entry) => entry.qualityStatus === 'Good')).toBe(true)
  })
  it('consumes only good quantities in the same slot budget', () => {
    const sheet = putAwayFixture()
    const entry = buildTransferPutAwayEntries(sheet)[0]!
    const states = transferPutAwayPlanStates(sheet, [
      { ...entry, quantity: 4, qualityStatus: 'Damaged' },
      { ...entry, quantity: 4 },
      { ...entry, quantity: 4 },
    ])
    expect(states.map((state) => state.isOffPlan)).toEqual([false, false, true])
    expect(states[2]!).toMatchObject({ withinPlan: 2, excess: 2 })
  })
  it('splits only the excess and preserves the scan confirmation', () => {
    const sheet = putAwayFixture()
    const entry = {
      ...buildTransferPutAwayEntries(sheet)[0]!,
      quantity: 8,
      scannedSlotCode: 'A-01',
      deviationReasonCode: 'Other',
      note: 'Đổi vị trí',
    }
    const split = splitTransferPutAwayExcess(
      [entry],
      0,
      transferPutAwayPlanStates(sheet, [entry])[0]!
    )
    expect(split.map((row) => row.quantity)).toEqual([6, 2])
    expect(split.map((row) => row.scannedSlotCode)).toEqual(['A-01', 'A-01'])
    expect(split[0]!.deviationReasonCode).toBe('')
    expect(transferPutAwayPlanStates(sheet, split).map((row) => row.isOffPlan)).toEqual([
      false,
      true,
    ])
  })
  it('does not produce entries for already fully putaway rows', () => {
    const sheet = putAwayFixture()
    sheet.rows.forEach((row) => (row.remainingQuantity = 0))
    expect(buildTransferPutAwayEntries(sheet)).toEqual([])
  })
})
