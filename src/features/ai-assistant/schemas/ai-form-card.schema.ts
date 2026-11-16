import { z } from 'zod'
import {
  AI_FORM_COMPONENTS,
  AI_FORM_FIELD_KEYS,
  AI_FORM_FLOW_TYPES,
  AI_FORM_LOOKUPS,
  AI_FORM_STATUSES,
} from '../types/ai-form.types'

// Every object is strict: a card that carries anything outside the contract (a `url`, `html`, `href`...)
// is ignored as a whole instead of being partly drawn.

const fieldKeySchema = z.enum(AI_FORM_FIELD_KEYS)
const statusSchema = z.enum(AI_FORM_STATUSES)

export const aiFormEntityValueSchema = z
  .object({ id: z.guid(), label: z.string().min(1).max(300) })
  .strict()

const fieldBase = { label: z.string().min(1).max(100), required: z.boolean() }

const warehouseFieldSchema = z
  .object({
    ...fieldBase,
    key: z.literal('warehouse'),
    component: z.literal(AI_FORM_COMPONENTS.entitySelect),
    lookup: z.literal(AI_FORM_LOOKUPS.warehouses),
  })
  .strict()

const recipientFieldSchema = z
  .object({
    ...fieldBase,
    key: z.literal('recipient'),
    component: z.literal(AI_FORM_COMPONENTS.entitySelect),
    lookup: z.literal(AI_FORM_LOOKUPS.recipients),
  })
  .strict()

const linesFieldSchema = z
  .object({
    ...fieldBase,
    key: z.literal('lines'),
    component: z.literal(AI_FORM_COMPONENTS.lineItems),
    lookup: z.literal(AI_FORM_LOOKUPS.products),
    dependsOn: z.array(z.literal('warehouse')).max(1).optional(),
    constraints: z
      .object({
        minItems: z.int().min(0).max(100).optional(),
        maxItems: z.int().min(1).max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

const purposeFieldSchema = z
  .object({
    ...fieldBase,
    key: z.literal('purpose'),
    component: z.literal(AI_FORM_COMPONENTS.text),
    constraints: z
      .object({ maxLength: z.int().min(1).max(2000).optional() })
      .strict()
      .optional(),
  })
  .strict()

export const aiFormCardSchema = z
  .object({
    schemaVersion: z.literal(1),
    flowType: z.enum(AI_FORM_FLOW_TYPES),
    flowId: z.string().min(1).max(4096),
    stateVersion: z.int().min(1),
    status: statusSchema,
    expiresAt: z.iso.datetime({ offset: true }),
    requiredFieldKeys: z.array(fieldKeySchema).max(AI_FORM_FIELD_KEYS.length),
    // Not strict: a key the BE leaves out is unresolved, and a key this FE does not know is ignored.
    values: z.object({
      warehouse: aiFormEntityValueSchema.nullish(),
      recipient: aiFormEntityValueSchema.nullish(),
      // Read line by line (readAiFormPrefill), so one bad line never discards the whole card.
      lines: z.array(z.unknown()).max(100).nullish(),
      purpose: z.string().max(500).nullish(),
    }),
    // Required fields the BE could not resolve; absent on a BE that does not send it.
    missing: z.array(fieldKeySchema).max(AI_FORM_FIELD_KEYS.length).optional(),
    fields: z
      .array(
        z.discriminatedUnion('key', [
          warehouseFieldSchema,
          recipientFieldSchema,
          linesFieldSchema,
          purposeFieldSchema,
        ])
      )
      .refine((fields) => AI_FORM_FIELD_KEYS.every((key) => fields.some((f) => f.key === key)), {
        message: 'Missing field definition',
      }),
    actions: z.array(z.enum(['submit', 'cancel'])).max(2),
  })
  .strict()

export type AiFormCardData = z.infer<typeof aiFormCardSchema>
export type AiFormEntityValue = z.infer<typeof aiFormEntityValueSchema>

const productUnitSchema = z.object({
  unitId: z.guid(),
  unitName: z.string().max(100),
  conversionFactor: z.number().positive(),
  quantityPrecision: z.int().min(0).max(6),
})

/** What the line needs from the picked product, kept so a restored draft needs no lookup. */
const productSnapshotSchema = z.object({
  id: z.guid(),
  sku: z.string().max(100),
  name: z.string().max(300),
  baseUnitId: z.guid(),
  baseUnitName: z.string().max(100),
  availableQuantity: z.number(),
  units: z.array(productUnitSchema).min(1).max(30),
})

const lineSchema = z.object({
  key: z.string().min(1).max(40),
  product: productSnapshotSchema.nullable(),
  quantity: z.string().max(32),
  unitId: z.string().max(64),
})

/** Form values kept per flow in sessionStorage; parsed again on read so stale or edited data is dropped. */
export const aiFormDraftSchema = z.object({
  step: z.union([z.literal(1), z.literal(2)]),
  status: statusSchema,
  lineSequence: z.int().min(0).max(100_000),
  values: z.object({
    warehouse: aiFormEntityValueSchema.nullable(),
    recipient: aiFormEntityValueSchema.nullable(),
    lines: z.array(lineSchema).max(100),
    purpose: z.string().max(2000),
    // Draft editors only (inbound, transfer). Optional so values stored before these existed, and
    // every stock-issue value, still parse.
    supplier: aiFormEntityValueSchema.nullish(),
    expectedDate: z.string().max(10).nullish(),
    destinationWarehouse: aiFormEntityValueSchema.nullish(),
  }),
})

export type AiFormProductSnapshot = z.infer<typeof productSnapshotSchema>
export type AiFormLine = z.infer<typeof lineSchema>
export type AiFormDraft = z.infer<typeof aiFormDraftSchema>
export type AiFormValues = AiFormDraft['values']

/**
 * Error body of the submit endpoint (`code` plus `fieldErrors`). Read through this schema because the
 * shared axios error normalizer only keeps `statusCode`, `message` and `errors`.
 */
export const aiFormSubmitErrorSchema = z.looseObject({
  code: z.string().optional(),
  // `key` stays a plain string: the BE keeps a key that names no field, and one such entry must not
  // discard the messages of the others (readAiFormSubmitFailure keeps only the known keys).
  fieldErrors: z.array(z.object({ key: z.string(), message: z.string() })).optional(),
})
