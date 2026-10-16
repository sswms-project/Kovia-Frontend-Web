import type { TaskAssignmentScoringWeights } from '../../../types/organization.types'

export type ScoringWeightKey = keyof TaskAssignmentScoringWeights

export type ScoringFieldErrors = Partial<Record<ScoringWeightKey, string>>

export interface ScoringFieldDefinition {
  readonly key: ScoringWeightKey
  readonly label: string
  readonly hint: string
  readonly min: number
  readonly max: number
}
