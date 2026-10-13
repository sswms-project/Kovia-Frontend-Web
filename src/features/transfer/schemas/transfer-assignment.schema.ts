import { z } from 'zod'
import type { AssignWarehouseTaskFormValues } from '@/features/inbound/schemas/inbound.schema'

export function toTransferLocalDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function createTransferAssignmentSchema(
  currentAssignee: string | null,
  currentDueAt: string | null
) {
  return z
    .object({
      staffId: z.guid('Vui lòng chọn nhân viên nhận việc.'),
      priority: z.enum(['Normal', 'Urgent']),
      dueAt: z.string(),
      reason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự.'),
    })
    .superRefine((values: AssignWarehouseTaskFormValues, ctx) => {
      if (currentAssignee && values.staffId !== currentAssignee && !values.reason) {
        ctx.addIssue({
          code: 'custom',
          path: ['reason'],
          message: 'Nhập lý do đổi người nhận việc.',
        })
      }
      if (values.priority === 'Urgent' && !values.dueAt) {
        ctx.addIssue({
          code: 'custom',
          path: ['dueAt'],
          message: 'Công việc khẩn phải có hạn hoàn thành.',
        })
      }
      if (
        values.dueAt &&
        values.dueAt !== toTransferLocalDate(currentDueAt) &&
        (!Number.isFinite(Date.parse(values.dueAt)) || Date.parse(values.dueAt) <= Date.now())
      ) {
        ctx.addIssue({ code: 'custom', path: ['dueAt'], message: 'Hạn mới phải ở tương lai.' })
      }
    })
}
