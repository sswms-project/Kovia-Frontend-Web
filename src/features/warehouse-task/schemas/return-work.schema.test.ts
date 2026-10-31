import { expect, it } from 'vitest'
import { returnWorkAssignmentSchema } from './return-work.schema'
import { toOperationalDateTimeInput, toOperationalDateTimeApi } from '@/lib/operational-date-time'

it('preserves overdue deadlines and their original precision during reassignment', () => {
  const due = '2025-10-01T08:12:34.1234567+07:00'
  const values = {
    staffId: 'staff',
    priority: 'Urgent',
    dueAt: toOperationalDateTimeInput(due),
    reason: 'Đổi người nhận',
  }
  expect(returnWorkAssignmentSchema(due).safeParse(values).success).toBe(true)
  expect(toOperationalDateTimeApi(values.dueAt, due)).toBe(due)
  expect(returnWorkAssignmentSchema(null).safeParse(values).success).toBe(false)
})

it('requires a deadline for urgent work', () => {
  expect(
    returnWorkAssignmentSchema(null).safeParse({
      staffId: 'staff',
      priority: 'Urgent',
      dueAt: '',
      reason: '',
    }).success
  ).toBe(false)
})
