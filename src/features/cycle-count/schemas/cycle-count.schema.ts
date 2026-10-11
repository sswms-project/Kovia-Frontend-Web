import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

// Khớp giới hạn của CreateCycleCountCommandValidator ở BE.
export const MAX_CYCLE_COUNT_ITEMS = 500

const cycleCountItemSchema = z.object({
  productId: dotNetGuidSchema('Sản phẩm không hợp lệ.'),
  slotId: dotNetGuidSchema('Vị trí không hợp lệ.'),
  lotId: dotNetGuidSchema('Lô hàng không hợp lệ.').nullable(),
  qualityStatus: z.enum(['Good', 'Damaged', 'Quarantine']),
})

export const createCycleCountSchema = z
  .object({
    warehouseId: dotNetGuidSchema('Vui lòng chọn kho.'),
    zoneId: z.string(),
    scheduledDate: z.string().min(1, 'Vui lòng chọn thời gian kiểm kê.'),
    priority: z.enum(['Normal', 'Urgent']),
    assignedTo: dotNetGuidSchema('Vui lòng chọn nhân viên phụ trách.'),
    items: z
      .array(cycleCountItemSchema)
      .min(1, 'Vui lòng chọn ít nhất một vị trí tồn kho.')
      .max(
        MAX_CYCLE_COUNT_ITEMS,
        `Mỗi phiếu kiểm kê tối đa ${MAX_CYCLE_COUNT_ITEMS} dòng, hãy thu hẹp phạm vi.`
      ),
    isBlindCount: z.boolean(),
    purpose: z.string().max(500, 'Mục đích không được vượt quá 500 ký tự.'),
    dueDate: z.string(),
  })
  .superRefine((values, context) => {
    if (values.dueDate && values.dueDate < values.scheduledDate.slice(0, 10)) {
      context.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'Kiểm kê đến ngày không được trước ngày kiểm kê dự kiến.',
      })
    }
    // Hạn công việc dùng chung "kiểm kê đến ngày"; kiểm kê khẩn bắt buộc có.
    if (values.priority === 'Urgent' && !values.dueDate) {
      context.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'Kiểm kê khẩn phải có ngày kiểm kê đến.',
      })
    }
    const keys = new Set<string>()
    values.items.forEach((item, index) => {
      const key = `${item.productId}:${item.slotId}:${item.lotId ?? ''}:${item.qualityStatus}`
      if (keys.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index],
          message: 'Dòng tồn kho này đã được chọn.',
        })
      }
      keys.add(key)
    })
  })

// BE yêu cầu số đếm >= 0 và cột DB có độ chính xác 2 chữ số thập phân.
export const recordCycleCountItemSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập số lượng đếm.')
  .regex(/^\d+(\.\d{1,2})?$/, 'Số lượng đếm phải từ 0 và tối đa 2 chữ số thập phân.')

export const CYCLE_COUNT_NOTE_MAX_LENGTH = 500

export const recountSchema = z.object({
  itemIds: z.array(dotNetGuidSchema('Dòng kiểm kê không hợp lệ.')).min(1, 'Chọn ít nhất một dòng.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do kiểm đếm lại.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
})

export const cancelCycleCountSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do huỷ phiếu.')
    .max(500, 'Lý do huỷ không được vượt quá 500 ký tự.'),
})

// Khớp CreateStockAdjustmentVoucherCommandValidator ở BE.
export const MAX_STOCK_ADJUSTMENT_VOUCHER_LINES = 500

export const createStockAdjustmentVoucherSchema = z.object({
  cycleCountItemIds: z
    .array(dotNetGuidSchema('Dòng kiểm kê không hợp lệ.'))
    .min(1, 'Chọn ít nhất một dòng lệch.')
    .max(MAX_STOCK_ADJUSTMENT_VOUCHER_LINES, 'Mỗi phiếu điều chỉnh tối đa 500 dòng.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do điều chỉnh.')
    .max(255, 'Lý do không được vượt quá 255 ký tự.'),
})

export const rejectStockAdjustmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do từ chối.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
})

export type CreateCycleCountFormValues = z.infer<typeof createCycleCountSchema>
export type CancelCycleCountFormValues = z.infer<typeof cancelCycleCountSchema>
export type RecountFormValues = z.infer<typeof recountSchema>
export type CreateStockAdjustmentVoucherFormValues = z.infer<
  typeof createStockAdjustmentVoucherSchema
>
export type RejectStockAdjustmentFormValues = z.infer<typeof rejectStockAdjustmentSchema>
