import { z } from 'zod'

export const createSupplierReturnSchema = z
  .object({
    warehouseId: z.string().min(1, 'Vui lòng chọn kho.'),
    supplierId: z.string().min(1, 'Vui lòng chọn nhà cung cấp.'),
    reason: z.string().trim().min(1, 'Vui lòng nhập lý do trả hàng.').max(500),
    negotiationNote: z.string().trim().max(1000),
    lines: z
      .array(
        z.object({
          inventoryStockId: z.string().min(1),
          // Display-only fields; BE only receives inventoryStockId + quantity.
          label: z.string(),
          maxQuantity: z.number(),
          unit: z.string(),
          quantity: z.number({ error: 'Vui lòng nhập số lượng.' }),
        })
      )
      .min(1, 'Phiếu trả NCC cần ít nhất một dòng hàng.'),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()
    value.lines.forEach((line, index) => {
      if (seen.has(line.inventoryStockId)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'inventoryStockId'],
          message: 'Mỗi vị trí tồn chỉ được chọn một lần trong phiếu.',
        })
      }
      seen.add(line.inventoryStockId)
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
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do.').max(500),
})

export type SupplierReturnReasonFormValues = z.infer<typeof supplierReturnReasonSchema>

export const confirmSupplierReturnDeliverySchema = z
  .object({
    items: z.array(
      z.object({
        itemId: z.string().min(1),
        approvedQuantity: z.number(),
        deliveredQuantity: z.number({ error: 'Vui lòng nhập số lượng giao.' }),
      })
    ),
  })
  .superRefine((value, context) => {
    value.items.forEach((item, index) => {
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
