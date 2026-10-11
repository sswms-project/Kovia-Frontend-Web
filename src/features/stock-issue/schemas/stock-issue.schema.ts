import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'
import { GOODS_RETURN_REQUEST_ITEM_CONDITIONS } from '../types/stock-issue.types'

export const stockIssueRequestLineSchema = z.object({
  productId: dotNetGuidSchema('Vui lòng chọn sản phẩm.'),
  quantity: z.number().positive('Số lượng phải lớn hơn 0.'),
  note: z.string().trim().max(500, 'Ghi chú dòng không được vượt quá 500 ký tự.'),
})

export const createStockIssueRequestSchema = z
  .object({
    stockRecipientId: dotNetGuidSchema('Vui lòng chọn đơn vị nhận hàng.'),
    warehouseId: dotNetGuidSchema('Vui lòng chọn kho xuất hàng.'),
    purpose: z.string().trim().max(500, 'Diễn giải không được vượt quá 500 ký tự.'),
    referenceCode: z.string().trim().max(100, 'Tham chiếu không được vượt quá 100 ký tự.'),
    issueDate: z.string(),
    note: z.string().trim().max(1000, 'Ghi chú không được vượt quá 1000 ký tự.'),
    lines: z
      .array(stockIssueRequestLineSchema)
      .min(1, 'Yêu cầu xuất kho phải có ít nhất một sản phẩm.'),
  })
  .superRefine((values, context) => {
    const productIds = new Set<string>()
    values.lines.forEach((line, index) => {
      if (line.productId && productIds.has(line.productId)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'productId'],
          message: 'Sản phẩm này đã có trong yêu cầu xuất kho.',
        })
      }
      productIds.add(line.productId)
    })
  })

export const recordStockPickingLineSchema = z.object({
  stockIssueRequestItemId: z.string(),
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  barcode: z.string().nullable().optional(),
  remainingQuantity: z.number(),
  inventoryStockId: z.string(),
  availableQuantity: z.number().min(0),
  pickedQuantity: z.number().min(0, 'Số lượng lấy hàng không được âm.'),
  scannedBarcode: z.string().optional(),
  scannedSlotCode: z.string().optional(),
})

export const recordStockPickingSchema = z
  .object({
    lines: z
      .array(recordStockPickingLineSchema)
      .min(1, 'Yêu cầu xuất kho chưa có dòng hàng nào để lấy.'),
  })
  .superRefine((values, context) => {
    const hasPickedLine = values.lines.some((line) => line.pickedQuantity > 0)
    if (!hasPickedLine) {
      context.addIssue({
        code: 'custom',
        path: ['lines'],
        message: 'Vui lòng nhập số lượng lấy hàng cho ít nhất một sản phẩm.',
      })
    }

    values.lines.forEach((line, index) => {
      if (line.pickedQuantity > 0 && !line.inventoryStockId) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'inventoryStockId'],
          message: 'Vui lòng chọn đúng dòng tồn kho để lấy hàng.',
        })
      }

      if (line.pickedQuantity > line.remainingQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'pickedQuantity'],
          message: 'Số lượng lấy hàng không được vượt quá số lượng đặt.',
        })
      }
      if (line.pickedQuantity > line.availableQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'pickedQuantity'],
          message: 'Số lượng lấy không được vượt quá tồn khả dụng của dòng đã chọn.',
        })
      }
    })
    const totals = new Map<string, number>()
    const allocations = new Set<string>()
    values.lines.forEach((line) => {
      totals.set(
        line.stockIssueRequestItemId,
        (totals.get(line.stockIssueRequestItemId) ?? 0) + line.pickedQuantity
      )
    })
    values.lines.forEach((line, index) => {
      const key = `${line.stockIssueRequestItemId}:${line.inventoryStockId}`
      if (line.inventoryStockId && allocations.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'inventoryStockId'],
          message: 'Dòng tồn kho này đã được phân bổ cho sản phẩm.',
        })
      }
      allocations.add(key)
      if ((totals.get(line.stockIssueRequestItemId) ?? 0) > line.remainingQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'pickedQuantity'],
          message: 'Tổng phân bổ vượt quá số lượng còn phải lấy của sản phẩm.',
        })
      }
    })
  })

export const returnLineSchema = z.object({
  stockIssuePickDetailId: dotNetGuidSchema('Dòng lấy hàng không hợp lệ.'),
  productName: z.string(),
  lotNumber: z.string().nullable(),
  returnableQuantity: z.number().min(0),
  quantity: z.number().min(0, 'Số lượng không được âm.'),
  condition: z.enum(GOODS_RETURN_REQUEST_ITEM_CONDITIONS),
  restockSlotId: z.string(),
})

export const createGoodsReturnRequestSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập lý do trả hàng.')
      .max(500, 'Lý do không được vượt quá 500 ký tự.'),
    lines: z.array(returnLineSchema).min(1, 'Phiếu trả hàng phải có ít nhất một sản phẩm.'),
  })
  .superRefine((values, context) => {
    if (!values.lines.some((line) => line.quantity > 0)) {
      context.addIssue({
        code: 'custom',
        path: ['lines'],
        message: 'Vui lòng chọn ít nhất một sản phẩm trả.',
      })
    }
    const pickDetailIds = new Set<string>()
    values.lines.forEach((line, index) => {
      if (pickDetailIds.has(line.stockIssuePickDetailId)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'stockIssuePickDetailId'],
          message: 'Dòng lấy hàng này đã có trong phiếu trả hàng.',
        })
      }
      pickDetailIds.add(line.stockIssuePickDetailId)

      if (line.quantity > line.returnableQuantity) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'quantity'],
          message: 'Số lượng trả vượt quá số lượng còn có thể trả.',
        })
      }

      if (line.quantity > 0 && line.condition !== 'Scrap' && !line.restockSlotId) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'restockSlotId'],
          message: 'Hàng không hủy bỏ cần chọn vị trí nhập lại kho.',
        })
      }
    })
  })

export type CreateStockIssueRequestFormValues = z.infer<typeof createStockIssueRequestSchema>
export type RecordStockPickingFormValues = z.infer<typeof recordStockPickingSchema>
export type CreateGoodsReturnRequestFormValues = z.infer<typeof createGoodsReturnRequestSchema>
