import { z } from 'zod'

export const createSupplierReturnSchema = z
  .object({
    warehouseId: z.string().min(1, 'Vui lòng chọn kho.'),
    supplierId: z.string().min(1, 'Vui lòng chọn nhà cung cấp.'),
    sourceGoodsReceiptId: z.string().uuid('Vui lòng chọn phiếu nhận hàng nguồn.'),
    reason: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập lý do trả hàng.')
      .max(500, 'Lý do trả hàng tối đa 500 ký tự.'),
    negotiationNote: z.string().trim().max(1000, 'Ghi chú thương lượng tối đa 1000 ký tự.'),
    lines: z
      .array(
        z.object({
          inventoryStockId: z.string().min(1, 'Vui lòng chọn vị trí tồn.'),
          // Display-only fields; BE only receives inventoryStockId + quantity.
          label: z.string(),
          maxQuantity: z.number(),
          unit: z.string(),
          quantity: z.number({ error: 'Vui lòng nhập số lượng.' }),
          quantityPrecision: z.number().int().min(0).max(6).optional(),
          sourceGroupKey: z.string().optional(),
          sourceRemainingQuantity: z.number().optional(),
        })
      )
      .min(1, 'Phiếu trả NCC cần ít nhất một dòng hàng.'),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()
    value.lines.forEach((line, index) => {
      if (line.sourceGroupKey && line.sourceRemainingQuantity !== undefined) {
        const total = value.lines
          .filter((other) => other.sourceGroupKey === line.sourceGroupKey)
          .reduce((sum, other) => sum + other.quantity, 0)
        if (total > line.sourceRemainingQuantity)
          context.addIssue({
            code: 'custom',
            path: ['lines', index, 'quantity'],
            message: 'Tổng lượng trả ở các vị trí vượt phần còn được trả theo phiếu nguồn.',
          })
      }
      if (seen.has(line.inventoryStockId)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'inventoryStockId'],
          message: 'Mỗi vị trí tồn chỉ được chọn một lần trong phiếu.',
        })
      }
      seen.add(line.inventoryStockId)
      if (Number(line.quantity.toFixed(Math.min(line.quantityPrecision ?? 2, 2))) !== line.quantity)
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: 'Số lượng không phù hợp độ chính xác đơn vị và giới hạn 2 chữ số thập phân.',
        })
      if (!(line.quantity > 0)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: 'Số lượng trả phải lớn hơn 0.',
        })
      } else if (line.quantity > line.maxQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: `Số lượng trả không được vượt quá số có thể trả (${line.maxQuantity}).`,
        })
      }
    })
  })

export type CreateSupplierReturnFormValues = z.infer<typeof createSupplierReturnSchema>

export const supplierReturnReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do.').max(500, 'Lý do tối đa 500 ký tự.'),
})

export type SupplierReturnReasonFormValues = z.infer<typeof supplierReturnReasonSchema>

export const confirmSupplierReturnDeliverySchema = z
  .object({
    items: z.array(
      z.object({
        itemId: z.string().min(1, 'Thiếu dòng hàng của phiếu.'),
        approvedQuantity: z.number(),
        deliveredQuantity: z.number({ error: 'Vui lòng nhập số lượng giao.' }),
        quantityPrecision: z.number().int().min(0).max(6).optional(),
      })
    ),
  })
  .superRefine((value, context) => {
    value.items.forEach((item, index) => {
      const precision = Math.min(item.quantityPrecision ?? 2, 2)
      if (
        Number(item.deliveredQuantity.toFixed(precision)) !== item.deliveredQuantity ||
        Number(item.approvedQuantity.toFixed(precision)) !== item.approvedQuantity
      )
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'deliveredQuantity'],
          message:
            'Số lượng không phù hợp đơn vị. Phiếu cũ sai số lượng cần được đối soát trước khi giao.',
        })
      if (!(item.deliveredQuantity >= 0)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'deliveredQuantity'],
          message: 'Số lượng giao không được âm.',
        })
      } else if (item.deliveredQuantity > item.approvedQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'deliveredQuantity'],
          message: 'Số lượng giao không được vượt quá số lượng đã duyệt.',
        })
      }
    })
    const total = value.items.reduce((sum, item) => sum + (item.deliveredQuantity || 0), 0)
    if (total <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Tổng số lượng giao phải lớn hơn 0.',
      })
    }
  })

export type ConfirmSupplierReturnDeliveryFormValues = z.infer<
  typeof confirmSupplierReturnDeliverySchema
>
