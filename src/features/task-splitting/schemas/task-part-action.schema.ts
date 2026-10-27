import { z } from 'zod'
import { taskPartActionSchema } from './task-splitting.schema'
import { parseQuantity } from '../utils/task-split-quantity'

export const taskPartDialogActionSchema = z.union([taskPartActionSchema, z.literal('cancelSplit')])
export type TaskPartDialogAction = z.infer<typeof taskPartDialogActionSchema>

/**
 * Mirrors the backend: changing the assignee always needs a reason (TaskAssignmentRules.EnsureReassignmentReason),
 * as do cancelling a part, completing it short and cancelling the split.
 */
export const REASON_ACTIONS: ReadonlySet<TaskPartDialogAction> = new Set([
  'reassign',
  'cancel',
  'complete',
  'cancelSplit',
])
export const STAFF_ACTIONS: ReadonlySet<TaskPartDialogAction> = new Set([
  'edit',
  'reassign',
  'splitRemaining',
])
export const QUANTITY_ACTIONS: ReadonlySet<TaskPartDialogAction> = new Set([
  'edit',
  'splitRemaining',
])

export const taskPartActionFormSchema = z
  .object({
    action: taskPartDialogActionSchema,
    staffId: z.string(),
    intoPartId: z.string(),
    reason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự.'),
    quantities: z.record(z.string(), z.string()),
  })
  .superRefine((values, context) => {
    if (REASON_ACTIONS.has(values.action) && !values.reason)
      context.addIssue({ code: 'custom', path: ['reason'], message: 'Vui lòng nhập lý do.' })
    if (STAFF_ACTIONS.has(values.action) && !values.staffId)
      context.addIssue({ code: 'custom', path: ['staffId'], message: 'Vui lòng chọn nhân viên.' })
    if (values.action === 'merge' && !values.intoPartId)
      context.addIssue({
        code: 'custom',
        path: ['intoPartId'],
        message: 'Vui lòng chọn phần để gộp vào.',
      })
    if (QUANTITY_ACTIONS.has(values.action)) {
      const quantities = Object.values(values.quantities).map(parseQuantity)
      if (quantities.some((quantity) => quantity === null))
        context.addIssue({
          code: 'custom',
          path: ['quantities'],
          message: 'Số lượng không hợp lệ.',
        })
      else if (!quantities.some((quantity) => (quantity ?? 0) > 0))
        context.addIssue({
          code: 'custom',
          path: ['quantities'],
          message: 'Nhập ít nhất một số lượng lớn hơn 0.',
        })
    }
  })

export type TaskPartActionFormValues = z.infer<typeof taskPartActionFormSchema>
