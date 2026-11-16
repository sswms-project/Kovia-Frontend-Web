import { aiDraftLineSchema } from '../schemas/ai-draft-line.schema'
import type { AiFormCardData, AiFormLine, AiFormValues } from '../schemas/ai-form-card.schema'
import { AI_FORM_FIELD_KEYS, type AiFormFieldKey, type AiFormStep } from '../types/ai-form.types'
import { AI_FORM_FLOWS } from './ai-form-flows'
import { createAiFormLine, toAiFormLine } from './ai-form-lines'

export interface AiFormPrefill {
  readonly values: AiFormValues
  readonly lineSequence: number
  /** First step that still asks for something; the last step when nothing is missing. */
  readonly step: AiFormStep
  /** Resolved fields to show as a chip with "Đổi" on the first step instead of an empty picker. */
  readonly compactKeys: readonly AiFormFieldKey[]
}

/**
 * Lines of the card that the form can draw. A line is dropped when it is malformed or its unit is not
 * one of the product's units: the quantity would mean something else in the unit the form falls back to.
 */
function readPrefilledLines(raw: readonly unknown[] | null | undefined): AiFormLine[] {
  const lines: AiFormLine[] = []
  for (const candidate of raw ?? []) {
    const parsed = aiDraftLineSchema.safeParse(candidate)
    if (!parsed.success) continue
    const { unitId, baseUnitId, units } = parsed.data
    const isKnownUnit =
      units.length > 0 ? units.some((unit) => unit.unitId === unitId) : unitId === baseUnitId
    if (isKnownUnit) lines.push(toAiFormLine(parsed.data, lines.length))
  }
  return lines
}

/**
 * Initial values, step and chips of a `collect_input` card. A field counts as unresolved when the BE
 * lists it in `missing` or when its value is not usable here (a dropped line, an empty purpose), so a
 * card never opens past something the user still has to fill. Without `missing` (an older BE) the
 * values alone decide and every picker stays a picker.
 */
export function readAiFormPrefill(form: AiFormCardData): AiFormPrefill {
  const { warehouse, recipient, purpose } = form.values
  const lines = readPrefilledLines(form.values.lines)
  const values: AiFormValues = {
    warehouse: warehouse ?? null,
    recipient: recipient ?? null,
    lines: lines.length > 0 ? lines : [createAiFormLine(1)],
    purpose: purpose ?? '',
  }

  const isFilled: Record<AiFormFieldKey, boolean> = {
    warehouse: Boolean(values.warehouse),
    recipient: Boolean(values.recipient),
    lines: lines.length > 0,
    purpose: values.purpose.trim() !== '',
  }
  const missing = new Set(form.missing)
  const unresolved = new Set(AI_FORM_FIELD_KEYS.filter((key) => missing.has(key) || !isFilled[key]))

  const { steps } = AI_FORM_FLOWS[form.flowType]
  const index = steps.findIndex(({ fields }) => fields.some((key) => unresolved.has(key)))
  const step = (index === -1 ? steps.length : index + 1) as AiFormStep

  return {
    values,
    lineSequence: Math.max(lines.length, 1),
    step,
    compactKeys:
      step === 1 && form.missing ? AI_FORM_FIELD_KEYS.filter((key) => !unresolved.has(key)) : [],
  }
}
