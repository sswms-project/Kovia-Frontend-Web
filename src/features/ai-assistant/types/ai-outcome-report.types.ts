// `outcome_report` card (Response Design System V3). The BE rebuilds numbers, entities and urls; the FE only draws.
// See docs/features/2026-11-15-ai-response-design-system-v3.md.

export const AI_OUTCOME_TONES = ['neutral', 'ok', 'warning', 'danger'] as const

/** Unknown tones from the wire degrade to `neutral` (see the schema). */
export type AiOutcomeTone = (typeof AI_OUTCOME_TONES)[number]

export type AiOutcomeValue = string | number

export const AI_OUTCOME_ACTION_KINDS = {
  navigate: 'navigate',
  /** Reserved for Wave 4: the BE drops it and the FE never draws it, so there is no dead button. */
  selectEntity: 'select_entity',
  draft: 'draft',
  retry: 'retry',
  reply: 'reply',
} as const

export interface AiOutcomeSummary {
  /** completed | partial | action_required | no_action_needed | failed | insufficient_data; others draw neutral. */
  readonly status: string
  readonly headline: string
  readonly reason?: string | null
}

export interface AiOutcomeMetric {
  readonly key?: string | null
  readonly label: string
  readonly value: AiOutcomeValue
  readonly unit?: string | null
  readonly tone: AiOutcomeTone
}

export interface AiOutcomeFactBar {
  readonly current: number
  readonly limit: number
}

export interface AiOutcomeFact {
  readonly label: string
  readonly value: AiOutcomeValue
  readonly unit?: string | null
  readonly bar?: AiOutcomeFactBar | null
}

export interface AiOutcomeEntity {
  readonly type?: string | null
  readonly id?: string | null
  readonly label: string
  readonly url?: string | null
}

export interface AiOutcomeFinding {
  readonly key: string
  readonly kind?: string | null
  readonly businessStatus?: string | null
  readonly tone: AiOutcomeTone
  readonly title: string
  readonly summary?: string | null
  readonly facts: readonly AiOutcomeFact[]
  readonly entity?: AiOutcomeEntity | null
  readonly relatedGroupKeys: readonly string[]
  readonly actionKeys: readonly string[]
}

export interface AiOutcomeRelatedItem {
  readonly entityType?: string | null
  readonly id?: string | null
  readonly label: string
  readonly status?: string | null
  readonly quantity?: AiOutcomeValue | null
  readonly unit?: string | null
  readonly warehouse?: string | null
  readonly date?: string | null
  readonly url?: string | null
}

export interface AiOutcomeRelatedGroup {
  readonly key: string
  readonly title: string
  /** May exceed `items.length`: the BE caps the rows it sends. */
  readonly count?: number | null
  readonly viewAllUrl?: string | null
  readonly items: readonly AiOutcomeRelatedItem[]
}

export interface AiOutcomeEvidenceParameter {
  readonly label: string
  readonly value: AiOutcomeValue
}

export interface AiOutcomeEvidence {
  readonly key?: string | null
  readonly title: string
  readonly formula?: string | null
  readonly parameters: readonly AiOutcomeEvidenceParameter[]
  readonly sources: readonly string[]
  readonly assumptions: readonly string[]
  readonly limits: readonly string[]
}

export interface AiOutcomeAction {
  readonly key: string
  readonly label: string
  /** navigate | select_entity | draft | retry | reply; anything else is not drawn. */
  readonly kind: string
  readonly url?: string | null
  readonly entityKind?: string | null
  readonly draftAction?: string | null
  readonly prompt?: string | null
  readonly requiresConfirmation?: boolean | null
  readonly findingKey?: string | null
}

export interface AiOutcomeReport {
  readonly responseVersion?: number | null
  readonly outcome: AiOutcomeSummary
  readonly metrics: readonly AiOutcomeMetric[]
  readonly findings: readonly AiOutcomeFinding[]
  readonly related: readonly AiOutcomeRelatedGroup[]
  readonly evidence: readonly AiOutcomeEvidence[]
  readonly recommendedActions: readonly AiOutcomeAction[]
  readonly dataTimestamp?: string | null
  readonly partialData: boolean
}
