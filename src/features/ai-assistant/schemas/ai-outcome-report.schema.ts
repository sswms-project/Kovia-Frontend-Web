import { z } from 'zod'
import { AI_OUTCOME_TONES } from '../types/ai-outcome-report.types'

// Lenient on purpose: the BE already allowlisted and clipped everything, so the FE never rejects a card for
// an unknown enum or a bad row. Unknown tones draw neutral, unusable rows are dropped; only a card without
// `outcome.headline` is not drawn (the BE then falls back to Markdown).

const text = z.string()
const optionalText = z.string().nullish()
const value = z.union([z.string(), z.number()])
const tone = z.enum(AI_OUTCOME_TONES).catch('neutral')

/** An array whose invalid rows are skipped instead of failing the whole card. */
function lenientList<T extends z.ZodType>(row: T) {
  return z
    .array(z.unknown())
    .nullish()
    .transform((rows) =>
      (rows ?? []).flatMap((item) => {
        const parsed = row.safeParse(item)
        return parsed.success ? [parsed.data as z.output<T>] : []
      })
    )
}

const textList = lenientList(text)

const metricSchema = z.object({
  key: optionalText,
  label: text,
  value,
  unit: optionalText,
  tone,
})

const factSchema = z.object({
  label: text,
  value,
  unit: optionalText,
  bar: z.object({ current: z.number(), limit: z.number() }).nullish().catch(null),
})

const entitySchema = z.object({
  type: optionalText,
  id: optionalText,
  label: text,
  url: optionalText,
})

const findingSchema = z.object({
  key: text,
  kind: optionalText,
  businessStatus: optionalText,
  tone,
  title: text,
  summary: optionalText,
  facts: lenientList(factSchema),
  entity: entitySchema.nullish().catch(null),
  relatedGroupKeys: textList,
  actionKeys: textList,
})

const relatedItemSchema = z.object({
  entityType: optionalText,
  id: optionalText,
  label: text,
  status: optionalText,
  quantity: value.nullish().catch(null),
  unit: optionalText,
  warehouse: optionalText,
  date: optionalText,
  url: optionalText,
})

const relatedGroupSchema = z.object({
  key: text,
  title: text,
  count: z.number().nullish().catch(null),
  viewAllUrl: optionalText,
  items: lenientList(relatedItemSchema),
})

const evidenceSchema = z.object({
  key: optionalText,
  title: text,
  formula: optionalText,
  parameters: lenientList(z.object({ label: text, value })),
  sources: textList,
  assumptions: textList,
  limits: textList,
})

const actionSchema = z.object({
  key: text,
  label: text,
  kind: text,
  url: optionalText,
  entityKind: optionalText,
  draftAction: optionalText,
  prompt: optionalText,
  requiresConfirmation: z.boolean().nullish().catch(null),
  findingKey: optionalText,
})

export const aiOutcomeReportSchema = z.object({
  responseVersion: z.number().nullish().catch(null),
  outcome: z.object({
    status: text.catch(''),
    headline: text.trim().min(1),
    reason: optionalText,
  }),
  metrics: lenientList(metricSchema),
  findings: lenientList(findingSchema),
  related: lenientList(relatedGroupSchema),
  evidence: lenientList(evidenceSchema),
  recommendedActions: lenientList(actionSchema),
  dataTimestamp: optionalText,
  partialData: z.boolean().catch(false),
})
