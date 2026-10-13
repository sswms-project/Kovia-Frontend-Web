import { describe, expect, it } from 'vitest'
import {
  buildTransferPutAwayEntries,
  splitTransferPutAwayExcess,
  transferPutAwayPlanStates,
} from './transfer-putaway'
import { putAwayFixture, RECEIPT_LOT } from './transfer-receipt-test-fixtures'

describe('Ngân sách cất hàng tốt dùng chung', () => {
  it('allocates once across lots and leaves damaged stock unplanned', () => {
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
      [2, false],
    ])
    expect(entries[3]!.qualityStatus).toBe('Damaged')
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
