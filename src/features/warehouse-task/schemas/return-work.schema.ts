import { z } from 'zod'
import { assignWarehouseTaskSchema } from '@/features/inbound/schemas/inbound.schema'
import { toOperationalDateTimeApi } from '@/lib/operational-date-time'

// Reassignment may preserve an overdue deadline; only a changed deadline must be in the future.
export function returnWorkAssignmentSchema(originalDueAt: string | null) {
  return z.object(assignWarehouseTaskSchema.shape).superRefine((values, context) => {
    if (values.priority === 'Urgent' && !values.dueAt)
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'Công việc khẩn phải có hạn hoàn thành.',
      })
    const dueAt = toOperationalDateTimeApi(values.dueAt, originalDueAt)
    if (
      dueAt &&
      dueAt !== originalDueAt &&
      (!Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt) <= Date.now())
    )
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'Hạn hoàn thành mới phải ở tương lai.',
      })
  })
}
