import { describe, expect, it } from 'vitest'
import { createTransferReceiptSchema } from '../schemas/transfer-fulfillment.schema'
import {
  buildExpectedReceiptQuantities,
  buildInitialReceiptEntries,
  toReceiveRequest,
} from './transfer-receive'
import {
  changedReceivePlanLines,
  receiptPlanStates,
  receiveScanProgress,
  splitReceiptExcess,
} from './transfer-receive-plan'
import { LOT_ID, plannedReceiveSheet, SLOT_A } from './transfer-plan-test-fixtures'

describe('planned transfer receipt', () => {
  it('prefills allocations, keeps unplanned quantity without a destination, and does not confirm a prefilled scan', () => {
    const sheet = plannedReceiveSheet()
    const entries = buildInitialReceiptEntries(sheet)
    expect(entries.map((entry) => [entry.goodQuantity, entry.destinationSlotId])).toEqual([
      [4, SLOT_A],
      [2, ''],
    ])
    expect(receiveScanProgress(entries)).toEqual({ required: 2, confirmed: 0 })
    entries[0]!.scannedSlotCode = 'A01'
    expect(receiveScanProgress(entries).confirmed).toBe(1)
  })
  it('shares one item-slot budget across lots and marks the entire overflowing entry as off-plan', () => {
    const sheet = plannedReceiveSheet()
    const first = sheet.lines[0]!.lots[0]!
    sheet.lines[0]!.lots = [
      {
        ...first,
        dispatchedQuantity: 3,
        unplannedQuantity: 0,
        plan: [{ ...first.plan![0]!, plannedQuantity: 3 }],
      },
      {
        ...first,
        lotId: LOT_ID,
        dispatchedQuantity: 3,
        unplannedQuantity: 2,
        plan: [{ ...first.plan![0]!, plannedQuantity: 1 }],
      },
    ]
    const entries = buildInitialReceiptEntries(sheet)
    entries[1]!.goodQuantity = 3
    entries.splice(2, 1)
    const states = receiptPlanStates(sheet, entries)
    expect(states.map((state) => state.isOffPlan)).toEqual([false, true])
    expect(states[1]).toMatchObject({ withinPlan: 1, excess: 2 })
    const split = splitReceiptExcess(entries, 1, states[1]!)
    expect(split.map((entry) => entry.goodQuantity)).toEqual([3, 1, 2])
    expect(receiptPlanStates(sheet, split).map((state) => state.isOffPlan)).toEqual([
      false,
      false,
      true,
    ])
  })
  it('does not consume plan budget for damaged/missing quantities', () => {
    const sheet = plannedReceiveSheet()
    const entries = buildInitialReceiptEntries(sheet)
    entries[0] = { ...entries[0]!, goodQuantity: 0, damagedQuantity: 4 }
    entries[1] = { ...entries[1]!, destinationSlotId: SLOT_A }
    expect(receiptPlanStates(sheet, entries)[1]?.isOffPlan).toBe(false)
  })
  it('requires actual scan confirmation, an off-plan reason, and 5–500 characters for Other', () => {
    const sheet = plannedReceiveSheet()
    const entries = buildInitialReceiptEntries(sheet)
    const schema = createTransferReceiptSchema(buildExpectedReceiptQuantities(sheet), sheet)
    expect(schema.safeParse({ entries }).success).toBe(false)
    entries[0]!.scannedSlotCode = 'A01'
    entries[1] = { ...entries[1]!, destinationSlotId: SLOT_A, scannedSlotCode: 'A01' }
    expect(schema.safeParse({ entries }).success).toBe(false)
    entries[1]!.deviationReasonCode = 'SlotFull'
    expect(schema.safeParse({ entries }).success).toBe(true)
    entries[1]!.deviationReasonCode = 'Other'
    for (const note of ['', 'abcd', 'x'.repeat(501)]) {
      entries[1]!.note = note
      expect(schema.safeParse({ entries }).success).toBe(false)
    }
    entries[1]!.note = 'Ô khác còn chỗ'
    expect(schema.safeParse({ entries }).success).toBe(true)
    expect(toReceiveRequest({ entries }, 'v1', 'hash1')).toMatchObject({
      planVersion: 'hash1',
      entries: [expect.anything(), expect.objectContaining({ deviationReasonCode: 'Other' })],
    })
  })
  it('keeps legacy behavior and does not infer planned mode from a client reason', () => {
    const sheet = plannedReceiveSheet()
    sheet.lines[0]!.planMode = 'Legacy'
    const entries = buildInitialReceiptEntries(sheet)
    expect(entries).toHaveLength(1)
    entries[0]!.destinationSlotId = SLOT_A
    expect(
      createTransferReceiptSchema(buildExpectedReceiptQuantities(sheet), sheet).safeParse({
        entries,
      }).success
    ).toBe(true)
    expect(receiptPlanStates(sheet, entries)[0]?.isOffPlan).toBe(false)
  })
  it('marks only the line with changed allocations rather than all lines when the token changes', () => {
    const sheet = plannedReceiveSheet()
    expect(changedReceivePlanLines(sheet, { ...sheet, planVersion: 'hash2' }).size).toBe(0)
    const fresh = structuredClone(sheet)
    fresh.lines[0]!.lots[0]!.plan![0]!.plannedQuantity = 3
    expect([...changedReceivePlanLines(sheet, fresh)]).toEqual([sheet.lines[0]!.lineId])
  })
})
