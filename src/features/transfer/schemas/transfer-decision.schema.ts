import { z } from 'zod'

export const withdrawTransferRequestSchema = z.object({
  expectedVersion: z.string().min(1, 'Vui lòng tải lại phiên bản phiếu.'),
  commandId: z.uuid(),
})

export const transferRequestDecisionSchema = withdrawTransferRequestSchema
  .extend({
    accept: z.boolean(),
    reason: z.string().trim().max(500).nullable(),
  })
  .refine((value) => value.accept || Boolean(value.reason), {
    path: ['reason'],
    message: 'Vui lòng nhập lý do từ chối.',
  })
