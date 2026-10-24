import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

export const warehouseStagingPointsSchema = z.object({
  items: z.array(z.object({ slotId: dotNetGuidSchema('Vị trí không hợp lệ.'), label: z.string() })),
  suggestedSlotId: dotNetGuidSchema('').nullable(),
  configuredDefaultSlotId: dotNetGuidSchema('').nullable(),
  invalidDefault: z.boolean(),
  boundPoint: z
    .object({ slotId: dotNetGuidSchema(''), label: z.string() })
    .nullable()
    .optional(),
})
export type WarehouseStagingPoints = z.infer<typeof warehouseStagingPointsSchema>
