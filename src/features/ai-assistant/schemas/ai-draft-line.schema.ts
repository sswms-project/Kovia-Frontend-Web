import { z } from 'zod'

// Line shape shared by the draft editor DTO and the `collect_input` prefill. Lenient on purpose:
// unknown keys are kept off. Kept apart from the form card schema so neither schema imports the other.

// The BE does not omit nulls: a list it has nothing for arrives as null, which parses to [].
export const listSchema = <TItem extends z.ZodType>(item: TItem) =>
  z
    .array(item)
    .nullish()
    .transform((list) => list ?? [])

const unitSchema = z.object({
  unitId: z.string().min(1),
  name: z.string(),
  factor: z.number().positive(),
  quantityPrecision: z.int().min(0).max(6),
})

export const aiDraftLineSchema = z.object({
  productId: z.string().min(1),
  sku: z.string(),
  productName: z.string(),
  unitId: z.string().min(1),
  quantity: z.number(),
  baseUnitId: z.string().min(1),
  baseUnitName: z.string(),
  units: listSchema(unitSchema),
  availableBaseQuantity: z
    .number()
    .nullish()
    .transform((quantity) => quantity ?? 0),
})

export type AiDraftLine = z.infer<typeof aiDraftLineSchema>
