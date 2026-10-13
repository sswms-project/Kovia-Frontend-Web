import { afterEach, describe, expect, it, vi } from 'vitest'
import { transferDateIssues } from './transfer-dates'
import {
  transferRequestSchema,
  transferRequestSchemaWithLocks,
} from '../schemas/transfer-request.schema'
import { emptyTransferForm } from './transfer-form'

const now = new Date('2026-10-13T12:00:00+07:00')

describe('transfer date validation', () => {
  afterEach(() => vi.useRealTimers())
  it.each([
    ['2026-10-13', '2026-10-13T10:00', true],
    ['2026-10-14T15:00', '2026-10-14', true],
    ['2026-10-14T15:00', '2026-10-14T10:00', false],
    ['2026-10-15', '2026-10-14T10:00', false],
    ['2026-10-14', '2026-10-15T10:00', true],
  ])('compares %s to %s correctly', (plannedTransferDate, requiredBy, valid) => {
    const issues = transferDateIssues({ plannedTransferDate, requiredBy }, undefined, now)
    expect(issues.some((issue) => issue.message.includes('không được trước'))).toBe(!valid)
  })

  it('checks today without time and the five minute tolerance', () => {
    expect(
      transferDateIssues({ plannedTransferDate: '2026-10-13', requiredBy: '' }, undefined, now)
    ).toEqual([])
    expect(
      transferDateIssues(
        { plannedTransferDate: '2026-10-13T11:55', requiredBy: '' },
        undefined,
        now
      )
    ).toEqual([])
    expect(
      transferDateIssues(
        { plannedTransferDate: '2026-10-13T11:54', requiredBy: '' },
        undefined,
        now
      )
    ).toHaveLength(1)
  })

  it('does not block unchanged past dates during an update but checks effective ordering on date changes', () => {
    const original = { plannedTransferDate: '2026-10-12', requiredBy: '2026-10-12' }
    expect(transferDateIssues(original, original, now)).toEqual([])
    expect(
      transferDateIssues({ ...original, plannedTransferDate: '2026-10-15' }, original, now)
    ).toEqual([
      { path: 'requiredBy', message: 'Ngày hàng về không được trước ngày dự kiến điều chuyển.' },
    ])
    expect(
      transferDateIssues({ ...original, requiredBy: '2026-10-11' }, original, now)
    ).toHaveLength(1)
  })

  it('applies the rules in the form schema, including invalid dates and clear values', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    const form = {
      ...emptyTransferForm(),
      sourceWarehouseId: '70000000-0000-4000-8000-000000000001',
      destinationWarehouseId: '70000000-0000-4000-8000-000000000002',
      lines: [
        { ...emptyTransferForm().lines[0]!, productId: '30000000-0000-4000-8000-000000000001' },
      ],
    }
    expect(
      transferRequestSchema.safeParse({ ...form, plannedTransferDate: '2026-02-30' }).success
    ).toBe(false)
    const original = { plannedTransferDate: '2026-10-12', requiredBy: '2026-10-12' }
    expect(transferRequestSchema.safeParse({ ...form, ...original }).success).toBe(false)
    const editSchema = transferRequestSchemaWithLocks(new Map(), original)
    expect(editSchema.safeParse({ ...form, ...original, reason: 'Sửa ghi chú' }).success).toBe(true)
    expect(editSchema.safeParse({ ...form, plannedTransferDate: '', requiredBy: '' }).success).toBe(
      true
    )
  })
})
