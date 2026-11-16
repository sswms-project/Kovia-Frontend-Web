import { z } from 'zod'
import { AI_DRAFT_STATUSES } from '../types/ai-assistant.types'
import { aiDraftLineSchema, listSchema } from './ai-draft-line.schema'
import { aiFormDraftSchema } from './ai-form-card.schema'

// Mirrors `GET api/ai/actions/{id}/editor` and `PUT api/ai/actions/{id}` (inline editable draft spec).
// Parsing is lenient on purpose: unknown keys are kept off, and a non-editable draft type may omit
// every body field, so those default instead of failing the whole response.

const statusSchema = z.enum(AI_DRAFT_STATUSES)

const partySchema = z.object({
  id: z.string().min(1),
  code: z.string().nullish(),
  name: z.string(),
})

export const aiDraftWarningSchema = z.object({
  code: z.string(),
  field: z.string().nullish(),
  message: z.string(),
  availableBaseQuantity: z.number().nullish(),
  requestedBaseQuantity: z.number().nullish(),
})

export const aiDraftEditorResponseSchema = z.object({
  draftId: z.string().min(1),
  action: z.string().default(''),
  status: statusSchema,
  // A draft type that cannot be edited has no revision as well as no fields.
  revision: z
    .string()
    .nullish()
    .transform((revision) => revision ?? ''),
  expiresAt: z.string().default(''),
  editable: z.boolean(),
  editableFields: listSchema(z.string()),
  warehouse: partySchema.nullish(),
  recipient: partySchema.nullish(),
  purpose: z.string().nullish(),
  // Inbound request only; a stock issue omits both.
  supplier: partySchema.nullish(),
  expectedDate: z.string().nullish(),
  // Transfer only: `warehouse` repeats the source.
  sourceWarehouse: partySchema.nullish(),
  destinationWarehouse: partySchema.nullish(),
  // Supplier return only.
  reason: z.string().nullish(),
  lines: listSchema(aiDraftLineSchema),
  warnings: listSchema(aiDraftWarningSchema),
})

const updatedDraftSchema = z.object({
  draftId: z.string().min(1),
  action: z.string(),
  status: statusSchema,
  summary: z.string(),
  details: listSchema(z.object({ label: z.string(), value: z.string() })),
  expiresAt: z.string(),
  revision: z.string().min(1),
  editable: z.boolean().default(true),
})

export const aiDraftUpdateResponseSchema = z.object({
  draft: updatedDraftSchema,
  warnings: listSchema(aiDraftWarningSchema),
})

/**
 * Unsaved editor values kept in sessionStorage, with the revision they were edited from. Parsed again
 * on read so stale or edited data is dropped; it is never what Xác nhận sends.
 */
export const aiDraftEditStoredSchema = z.object({
  revision: z.string().min(1),
  lineSequence: aiFormDraftSchema.shape.lineSequence,
  values: aiFormDraftSchema.shape.values,
})

export type AiDraftEditStored = z.infer<typeof aiDraftEditStoredSchema>
export type AiDraftWarning = z.infer<typeof aiDraftWarningSchema>
export type AiDraftEditorResponse = z.infer<typeof aiDraftEditorResponseSchema>
export type AiDraftEditorLine = AiDraftEditorResponse['lines'][number]
export type AiDraftUpdateResponse = z.infer<typeof aiDraftUpdateResponseSchema>
export type AiDraftUpdatedDraft = AiDraftUpdateResponse['draft']
