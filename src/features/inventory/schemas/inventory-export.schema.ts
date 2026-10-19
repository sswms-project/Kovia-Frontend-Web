import { z } from 'zod'

const filterId = z
  .guid('Mã bộ lọc không hợp lệ.')
  .refine((value) => value !== '00000000-0000-0000-0000-000000000000', 'Mã bộ lọc không hợp lệ.')
  .optional()
  .nullable()

export const inventoryExportSchema = z.object({
  warehouseId: filterId,
  zoneId: filterId,
  rackId: filterId,
  slotId: filterId,
  productId: filterId,
  categoryId: filterId,
  searchTerm: z.string().max(500, 'Từ khóa tối đa 500 ký tự khi xuất Excel.').optional().nullable(),
  inStockOnly: z.boolean().optional(),
})

export type InventoryExportQuery = z.infer<typeof inventoryExportSchema>
