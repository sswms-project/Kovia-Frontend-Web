import { aiFormCardSchema, type AiFormCardData } from '../schemas/ai-form-card.schema'
import { AI_CARD_TYPES, type AiCard } from '../types/ai-assistant.types'

export interface AiFormCardReading {
  /** `null` when the card is another type or fails validation. */
  readonly form: AiFormCardData | null
  /** Where a `collect_input` card broke the contract (paths and codes only, never the payload). */
  readonly issues: string | null
}

/**
 * Reads a `collect_input` card. `form` is `null` when the card is another type, has an unknown flow,
 * component or lookup key, or carries anything outside the contract. A `null` form is not drawn, so a
 * bad payload never reaches the UI.
 */
export function readAiFormCard(card: AiCard): AiFormCardReading {
  if (card.type !== AI_CARD_TYPES.collectInput) return { form: null, issues: null }
  const result = aiFormCardSchema.safeParse(card.form)
  if (result.success) return { form: result.data, issues: null }
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.code}`)
    .join('; ')
  return { form: null, issues }
}
