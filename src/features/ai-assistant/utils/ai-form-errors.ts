import { getApiErrorCode, isApiErrorResponse } from '@/lib/api-error'
import { aiFormSubmitErrorSchema } from '../schemas/ai-form-card.schema'
import {
  AI_FORM_FIELD_KEYS,
  AI_FORM_RESTART_CODES,
  type AiFormFieldErrors,
  type AiFormFieldKey,
} from '../types/ai-form.types'

export interface AiFormSubmitFailure {
  /** The flow ran out, is invalid or outdated: this form cannot be sent any more, only started again. */
  readonly mustRestart: boolean
  readonly fieldErrors: AiFormFieldErrors
}

// The BE may also name a field by its id parameter.
const FIELD_ALIASES: Readonly<Record<string, AiFormFieldKey>> = {
  warehouseId: 'warehouse',
  recipientId: 'recipient',
}

/**
 * Reads a failed submit. Field messages come from `fieldErrors` (contract body) or, when the shared
 * error normalizer dropped it, from the `errors` map keyed by field.
 */
export function readAiFormSubmitFailure(error: unknown): AiFormSubmitFailure {
  const body = aiFormSubmitErrorSchema.safeParse(error)
  const fieldErrors: AiFormFieldErrors = {}

  if (isApiErrorResponse(error) && error.errors) {
    for (const [name, messages] of Object.entries(error.errors)) {
      const key = FIELD_ALIASES[name] ?? AI_FORM_FIELD_KEYS.find((fieldKey) => fieldKey === name)
      if (key && messages[0]) fieldErrors[key] = messages[0]
    }
  }
  for (const { key, message } of body.success ? (body.data.fieldErrors ?? []) : []) {
    const fieldKey = AI_FORM_FIELD_KEYS.find((knownKey) => knownKey === key)
    if (fieldKey) fieldErrors[fieldKey] ??= message
  }

  const code = (body.success ? body.data.code : undefined) ?? getApiErrorCode(error)
  const mustRestart =
    (code !== undefined && AI_FORM_RESTART_CODES.includes(code)) ||
    // Until the shared error normalizer passes `code` through, a bare 409 is read as a flow that is gone.
    (isApiErrorResponse(error) && error.statusCode === 409 && !code)
  return { mustRestart, fieldErrors }
}
