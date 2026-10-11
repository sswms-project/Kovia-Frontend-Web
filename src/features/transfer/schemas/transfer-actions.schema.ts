import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import { TRANSFER_FEEDBACK_REASONS } from '../types/transfer.types'
import { hasAtMostTwoDecimals } from '../utils/transfer-scan'

export const transferReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
})

export const transferFeedbackSchema = z.object({
  reasonCode: z.enum(TRANSFER_FEEDBACK_REASONS, 'Vui lòng chọn lý do phản hồi.'),
  itemId: z.string(),
  message: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập nội dung phản hồi.')
    .max(1000, 'Nội dung phản hồi không được vượt quá 1000 ký tự.'),
})

export const transferFeedbackReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập nội dung trả lời.')
    .max(1000, 'Nội dung trả lời không được vượt quá 1000 ký tự.'),
  close: z.boolean(),
})

export const shipmentLineDraftSchema = z.object({
  itemId: dotNetGuidSchema('Dòng hàng không hợp lệ.'),
  label: z.string(),
  unitName: z.string(),
  selected: z.boolean(),
  maximum: z.number().min(0),
  quantity: z.number('Số lượng phải là số.'),
})

export const createShipmentSchema = z
  .object({ lines: z.array(shipmentLineDraftSchema) })
  .superRefine((values, context) => {
    const selected = values.lines.filter((line) => line.selected)
    if (selected.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['lines'],
        message: 'Hãy chọn ít nhất một dòng hàng cho đợt xuất.',
      })
    }
    values.lines.forEach((line, index) => {
      if (!line.selected) return
      if (!(line.quantity > 0)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: 'Số lượng phải lớn hơn 0.',
        })
      } else if (line.quantity > line.maximum) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: `Không vượt quá phần chưa vào đợt (${line.maximum}).`,
        })
      } else if (!hasAtMostTwoDecimals(line.quantity)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: 'Số lượng chỉ có tối đa 2 chữ số thập phân.',
        })
      }
    })
  })

export type TransferReasonFormValues = z.infer<typeof transferReasonSchema>
export type TransferFeedbackFormValues = z.infer<typeof transferFeedbackSchema>
export type TransferFeedbackReplyFormValues = z.infer<typeof transferFeedbackReplySchema>
export type CreateShipmentFormValues = z.infer<typeof createShipmentSchema>
