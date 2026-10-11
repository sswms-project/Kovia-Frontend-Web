import { z } from 'zod'
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const createForecastRunSchema = z.object({
  warehouseId: nonEmptyDotNetGuidSchema('Chọn kho hợp lệ.'),
  historicalPeriodDays: z.number().int().min(1).max(366),
  horizonDays: z.number().int().min(1).max(90),
})

export const reviewReplenishmentSchema = z.object({
  supplierId: nonEmptyDotNetGuidSchema('Chọn nhà cung cấp đang hoạt động.'),
  adjustedQuantity: z.number().positive('Số lượng phải lớn hơn 0.'),
  adjustmentReason: z.string().max(1000, 'Lý do tối đa 1000 ký tự.'),
})

export type CreateForecastRunFormValues = z.infer<typeof createForecastRunSchema>
export type ReviewReplenishmentFormValues = z.infer<typeof reviewReplenishmentSchema>
