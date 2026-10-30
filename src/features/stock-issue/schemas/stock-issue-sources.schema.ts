import { z } from 'zod'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'

export const stockIssueSourceOptionsSchema = z.array(
  z.object({
    inventoryStockId: z.string().min(1),
    path: z.string(),
    lotId: z.string().nullable(),
    lotNumber: z.string().nullable(),
    expiryDate: z.string().nullable(),
    freeQuantity: z.number().finite().nonnegative(),
    ownUnpickedQuantity: z.number().finite().nonnegative(),
    documentVersion: z.string().nullable(),
  })
)
export type StockIssueSourceOption = z.infer<typeof stockIssueSourceOptionsSchema>[number]
export const sourceFactor = (factor: number) => (factor > 0 ? factor : 1)
export const baseSourceQuantity = (quantity: number, factor: number) =>
  Number((quantity * sourceFactor(factor)).toFixed(6))

export function stockIssueSourcesSchema(order: StockIssueRequestSummary) {
  return z
    .object({
      reason: z.string().trim().min(1, 'Nhập lý do chọn nguồn khác.').max(500),
      allocations: z
        .array(
          z.object({
            itemId: z.string().min(1),
            inventoryStockId: z.string().min(1, 'Chọn vị trí/lô lấy hàng.'),
            quantity: z
              .number()
              .finite()
              .positive('Nhập số lượng lớn hơn 0.')
              .int('Lấy theo nguyên đơn vị yêu cầu.'),
            path: z.string(),
          })
        )
        .min(1)
        .max(500),
    })
    .superRefine((values, ctx) => {
      const seen = new Set<string>()
      values.allocations.forEach((row, index) => {
        const key = `${row.itemId}:${row.inventoryStockId}`
        if (seen.has(key))
          ctx.addIssue({
            code: 'custom',
            path: ['allocations', index, 'inventoryStockId'],
            message: 'Vị trí/lô này đã có trong dòng hàng.',
          })
        seen.add(key)
        if (!order.items.some((item) => item.id === row.itemId))
          ctx.addIssue({
            code: 'custom',
            path: ['allocations', index],
            message: 'Dòng hàng không thuộc phiếu.',
          })
      })
      for (const item of order.items) {
        const total = values.allocations
          .filter((row) => row.itemId === item.id)
          .reduce((sum, row) => sum + baseSourceQuantity(row.quantity, item.conversionFactor), 0)
        if (Math.abs(total - (item.quantity - item.pickedQuantity)) > 0.000001)
          ctx.addIssue({
            code: 'custom',
            path: ['allocations'],
            message: `${item.sku}: phân bổ phải khớp lượng chưa lấy.`,
          })
      }
    })
}
export type StockIssueSourcesValues = z.infer<ReturnType<typeof stockIssueSourcesSchema>>
