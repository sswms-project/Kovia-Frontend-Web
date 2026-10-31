import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

const guid = dotNetGuidSchema('Mã không hợp lệ.')
export const transferDestinationPreviewSchema = z.object({
  warehouseId: guid,
  items: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        productId: guid,
        unitId: guid.nullable(),
        quantity: z.number().positive(),
        destinationSlotId: guid.nullable(),
      })
    )
    .min(1)
    .max(200)
    .refine(
      (items) =>
        new Set(items.map((item) => item.key)).size === items.length &&
        new Set(items.map((item) => item.productId)).size === items.length
    ),
})

export type TransferDestinationPreviewRequest = z.infer<typeof transferDestinationPreviewSchema>

export interface TransferDestinationSuggestion {
  readonly capacitySummary?:
    | import('../utils/transfer-location-capacity').TransferLocationCapacity
    | null
  readonly key: string
  readonly slotId: string | null
  readonly path: string | null
  readonly reason: string
}
