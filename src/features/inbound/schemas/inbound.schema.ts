import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const receiptLineSchema = z
  .object({
    inboundRequestItemId: dotNetGuidSchema('Dòng yêu cầu nhập kho không hợp lệ.'),
    enteredUnitId: dotNetGuidSchema('Đơn vị nhận hàng không hợp lệ.').optional(),
    receivedQty: z.number().positive('Số lượng nhận phải lớn hơn 0.'),
    damagedQty: z.number().min(0, 'Số lượng hỏng không được âm.'),
    exceptionReason: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự.'),
    isLotTracked: z.boolean(),
    lotNumber: z.string().trim().max(100, 'Số lô không được vượt quá 100 ký tự.'),
    manufacturedDate: z.string(),
    expiryDate: z.string(),
  })
  .superRefine((line, context) => {
    if (line.damagedQty > line.receivedQty) {
      context.addIssue({
        code: 'custom',
        path: ['damagedQty'],
        message: 'Số lượng hỏng không được lớn hơn số lượng nhận.',
      })
    }
    if (line.damagedQty > 0 && line.exceptionReason.trim().length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['exceptionReason'],
        message: 'Vui lòng ghi rõ tình trạng hàng hỏng.',
      })
    }
    if (line.isLotTracked && !line.lotNumber) {
      context.addIssue({
        code: 'custom',
        path: ['lotNumber'],
        message: 'Vui lòng nhập số lô cho sản phẩm quản lý theo lô.',
      })
    }
    if (!line.isLotTracked && (line.lotNumber || line.manufacturedDate || line.expiryDate)) {
      context.addIssue({
        code: 'custom',
        path: ['lotNumber'],
        message: 'Sản phẩm quản lý theo số lượng không nhận thông tin lô.',
      })
    }
    if (
      line.manufacturedDate &&
      line.expiryDate &&
      new Date(line.expiryDate) < new Date(line.manufacturedDate)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['expiryDate'],
        message: 'Hạn sử dụng phải bằng hoặc sau ngày sản xuất.',
      })
    }
  })

export const goodsReceiptSchema = z.object({
  receiptCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã phiếu nhận.')
    .max(100, 'Mã phiếu nhận không được vượt quá 100 ký tự.')
    .toUpperCase(),
  inboundRequestId: dotNetGuidSchema('Yêu cầu nhập kho không hợp lệ.'),
  lines: z.array(receiptLineSchema).min(1, 'Phiếu nhận hàng phải có ít nhất một sản phẩm.'),
})

export const putawayLineSchema = z.object({
  goodsReceiptItemId: dotNetGuidSchema('Vui lòng chọn sản phẩm thuộc phiếu nhận hàng.'),
  slotId: dotNetGuidSchema('Vui lòng chọn vị trí lưu trữ.'),
  enteredUnitId: dotNetGuidSchema('Vui lòng chọn đơn vị cất hàng.'),
  enteredQuantity: z
    .number({ error: 'Vui lòng nhập số lượng hợp lệ.' })
    .positive('Số lượng cất phải lớn hơn 0.')
    .lt(1_000_000_000_000, 'Số lượng vượt giới hạn cho phép.')
    .multipleOf(0.000001, 'Số lượng chỉ được có tối đa sáu chữ số thập phân.'),
  confirmedSlotCode: z.string().max(100).optional(),
})

export const putawaySchema = z
  .object({
    lines: z.array(putawayLineSchema).min(1, 'Vui lòng thêm ít nhất một phân bổ vị trí.'),
    overrideReason: z.string().max(500, 'Lý do không được vượt quá 500 ký tự.').optional(),
    overrideReasonCode: z
      .enum(['', 'SlotFull', 'SlotBlocked', 'LabelMismatch', 'Consolidation', 'Other'])
      .optional(),
  })
  .superRefine((values, context) => {
    const allocations = new Set<string>()
    values.lines.forEach((line, index) => {
      const allocationKey = `${line.goodsReceiptItemId}:${line.slotId}`
      if (allocations.has(allocationKey)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'slotId'],
          message: 'Sản phẩm đã được phân bổ vào vị trí này.',
        })
      }
      allocations.add(allocationKey)
    })
  })

export const cancelPutawayTaskSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do hủy phần cất hàng còn lại.')
    .max(500, 'Lý do không được vượt quá 500 ký tự.'),
  hasUnrecordedPhysicalMovement: z.boolean(),
})

export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>
export type PutawayFormValues = z.infer<typeof putawaySchema>
export type CancelPutawayTaskFormValues = z.infer<typeof cancelPutawayTaskSchema>

// Quy tắc phụ thuộc vào nhân viên đang được giao (khác người cũ, bắt buộc lý do khi giao lại)
// được kiểm tra trong hook điều phối (useAssignWarehouseTask), không đưa vào đây — schema phải
// tĩnh vì form sống ở page và không được tạo lại theo từng target (xem .rules: "Components
// receive form as a prop — they do NOT call useForm themselves").
export const assignWarehouseTaskSchema = z
  .object({
    staffId: z.string().min(1, 'Vui lòng chọn nhân viên nhận việc.'),
    priority: z.enum(['Normal', 'Urgent']),
    dueAt: z.string(),
    reason: z.string().trim().max(500, 'Lý do không được vượt quá 500 ký tự.'),
  })
  .superRefine((values, context) => {
    if (values.priority === 'Urgent' && !values.dueAt) {
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'Công việc khẩn phải có hạn hoàn thành.',
      })
    }
    if (values.dueAt && new Date(values.dueAt).getTime() <= Date.now()) {
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'Hạn hoàn thành phải ở tương lai.',
      })
    }
  })

export type AssignWarehouseTaskFormValues = z.infer<typeof assignWarehouseTaskSchema>
