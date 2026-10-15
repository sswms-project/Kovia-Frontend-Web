import { describe, expect, it } from 'vitest'
import { createTransferCountSchema } from './transfer-receipt.schema'
import { createTransferPutAwaySchema } from './transfer-putaway.schema'
import { createTransferAssignmentSchema, toTransferLocalDate } from './transfer-assignment.schema'
import { buildTransferPutAwayEntries } from '../utils/transfer-putaway'
import {
  putAwayFixture,
  receiptFixture,
  RECEIPT_LINE,
  RECEIPT_SLOT,
} from '../utils/transfer-receipt-test-fixtures'

describe('Phiếu kiểm hàng tách cất', () => {
  const entry = {
    lineId: RECEIPT_LINE,
    lotId: null,
    goodQuantity: 8,
    damagedQuantity: 2,
    missingQuantity: 0,
    reasonCode: 'Hàng hỏng',
    note: '',
  }
  it('accepts 8 good + 2 damaged without locations or scans', () =>
    expect(
      createTransferCountSchema(receiptFixture()).safeParse({ entries: [entry] }).success
    ).toBe(true))
  it.each([
    { ...entry, goodQuantity: 7 },
    { ...entry, reasonCode: '' },
    { ...entry, goodQuantity: 7.5, damagedQuantity: 2.5 },
    { ...entry, goodQuantity: -1 },
    { ...entry, lineId: RECEIPT_SLOT },
  ])('rejects incorrect quantities, missing reasons or foreign lines', (invalid) =>
    expect(
      createTransferCountSchema(receiptFixture()).safeParse({ entries: [invalid] }).success
    ).toBe(false)
  )
  it('accepts all missing with reason', () =>
    expect(
      createTransferCountSchema(receiptFixture()).safeParse({
        entries: [{ ...entry, goodQuantity: 0, damagedQuantity: 0, missingQuantity: 10 }],
      }).success
    ).toBe(true))
})
describe('Validation cất theo thực nhận và chất lượng', () => {
  const sheet = putAwayFixture()
  const valid = () => ({ ...buildTransferPutAwayEntries(sheet)[0], scannedSlotCode: 'A-01' })
  it('accepts partial good putaway', () =>
    expect(createTransferPutAwaySchema(sheet).safeParse({ entries: [valid()] }).success).toBe(true))
  it('requires confirmation scan for a selected planned location', () =>
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [{ ...valid(), scannedSlotCode: '' }],
      }).success
    ).toBe(false))
  it('requires reason when cumulative entries exceed the shared budget', () =>
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [
          { ...valid(), quantity: 4 },
          { ...valid(), quantity: 4 },
        ],
      }).success
    ).toBe(false))
  it('allows excess only with a reason, never beyond actual receipt', () => {
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [
          { ...valid(), quantity: 8, deviationReasonCode: 'Other', note: 'Kệ dự kiến đầy' },
        ],
      }).success
    ).toBe(true)
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [
          { ...valid(), quantity: 9, deviationReasonCode: 'Other', note: 'Kệ dự kiến đầy' },
        ],
      }).success
    ).toBe(false)
  })
  it('rejects new damaged putaway even when an older sheet includes damaged stock', () =>
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [{ ...valid(), qualityStatus: 'Damaged', quantity: 2 }],
      }).success
    ).toBe(false))
  it('sums damaged putaway separately and refuses duplicate over-receipt', () =>
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [
          { ...valid(), qualityStatus: 'Damaged', quantity: 2 },
          { ...valid(), qualityStatus: 'Damaged', quantity: 1 },
        ],
      }).success
    ).toBe(false))
  it.each(['LabelMismatch', 'Other'])('manual location %s needs an allowed reason', (reason) => {
    const manual = {
      ...valid(),
      scannedSlotCode: '',
      slotCodeUnreadable: true,
      deviationReasonCode: reason,
      note: reason === 'Other' ? 'Nhãn không đọc được' : '',
    }
    expect(createTransferPutAwaySchema(sheet).safeParse({ entries: [manual] }).success).toBe(true)
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [{ ...manual, deviationReasonCode: 'SlotFull' }],
      }).success
    ).toBe(false)
  })
  it('does not accept both manual mode and a scan', () =>
    expect(
      createTransferPutAwaySchema(sheet).safeParse({
        entries: [{ ...valid(), slotCodeUnreadable: true, deviationReasonCode: 'LabelMismatch' }],
      }).success
    ).toBe(false))
})
describe('Lịch giao việc điều chuyển', () => {
  const staff = RECEIPT_LINE
  const values = { staffId: staff, priority: 'Normal' as const, dueAt: '', reason: '' }
  it('allows keeping an overdue deadline unchanged', () => {
    const old = '2020-01-01T00:00:00Z'
    expect(
      createTransferAssignmentSchema(staff, old).safeParse({
        ...values,
        dueAt: toTransferLocalDate(old),
      }).success
    ).toBe(true)
  })
  it('does not allow setting a new overdue deadline', () =>
    expect(
      createTransferAssignmentSchema(staff, null).safeParse({
        ...values,
        dueAt: '2020-01-01T00:00',
      }).success
    ).toBe(false))
  it('requires reassignment reason but permits schedule-only changes', () => {
    expect(createTransferAssignmentSchema(staff, null).safeParse(values).success).toBe(true)
    expect(createTransferAssignmentSchema(RECEIPT_SLOT, null).safeParse(values).success).toBe(false)
  })
  it('requires deadline for urgent tasks', () =>
    expect(
      createTransferAssignmentSchema(null, null).safeParse({ ...values, priority: 'Urgent' })
        .success
    ).toBe(false))
})
