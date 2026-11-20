import type { AiCard } from './ai-assistant.types'
import type { AiDraftUpdateRequest } from './ai-draft-edit.types'

// Mirrors the `collect_input` card and `POST ai/forms/{flowId}/submit` of Kovia_BE (contract v1).

export const AI_FORM_FLOW_TYPES = {
  stockIssueCreate: 'stock_issue_create',
  inboundRequestCreate: 'inbound_request_create',
} as const
export type AiFormFlowType = (typeof AI_FORM_FLOW_TYPES)[keyof typeof AI_FORM_FLOW_TYPES]

export const AI_FORM_COMPONENTS = {
  entitySelect: 'entity_select',
  lineItems: 'line_items',
  text: 'text',
  date: 'date',
} as const

/** Allowlisted lookup keys. The BE sends a key, never a URL; each key maps to one existing query hook. */
export const AI_FORM_LOOKUPS = {
  warehouses: 'warehouses.stock_issue_create',
  recipients: 'stock_recipients',
  products: 'products.stock_issue',
  suppliers: 'suppliers',
  /** Keys of the inbound request card. The pickers reuse the queries above (any active warehouse, the whole catalog). */
  inboundWarehouses: 'warehouses.inbound_request_create',
  inboundProducts: 'products.inbound',
} as const

export type AiFormEntityLookupKey =
  | typeof AI_FORM_LOOKUPS.warehouses
  | typeof AI_FORM_LOOKUPS.recipients
  | typeof AI_FORM_LOOKUPS.suppliers

export const AI_FORM_FIELD_KEYS = [
  'warehouse',
  'recipient',
  'lines',
  'purpose',
  'supplier',
  'expectedDate',
] as const
export type AiFormFieldKey = (typeof AI_FORM_FIELD_KEYS)[number]

/** Fields of the draft editors beyond the stock-issue ones. The `collect_input` contract does not know them. */
export const AI_DRAFT_EXTRA_FIELD_KEYS = [
  'supplier',
  'expectedDate',
  'destinationWarehouse',
] as const
export type AiDraftExtraFieldKey = (typeof AI_DRAFT_EXTRA_FIELD_KEYS)[number]

export const AI_FORM_STATUSES = ['open', 'submitted', 'cancelled', 'expired'] as const
export type AiFormStatus = (typeof AI_FORM_STATUSES)[number]

/** Step 1: warehouse and recipient. Step 2: products and purpose. */
export type AiFormStep = 1 | 2

export type AiFormFieldErrors = Partial<Record<AiFormFieldKey | AiDraftExtraFieldKey, string>>

/**
 * Submit failures after which this form can never be sent: the flow ran out, was tampered with, or
 * the form is older than the BE state. All of them lock the card and offer to start again.
 */
export const AI_FORM_RESTART_CODES: readonly string[] = [
  'FLOW_EXPIRED',
  'FLOW_INVALID',
  'STATE_VERSION_MISMATCH',
]

export interface AiFormSubmitLine {
  readonly productId: string
  readonly quantity: number
  readonly unitId: string
}

type WithoutRevision<T> = T extends unknown ? Omit<T, 'revision'> : never

/**
 * The fields of the draft type the form prepares, named like the inline draft editor's update (stock issue:
 * recipient and purpose; inbound request: supplier and expected date), plus the form's state version.
 */
export type AiFormSubmitRequest = {
  readonly stateVersion: number
} & WithoutRevision<AiDraftUpdateRequest>

/**
 * The `action_confirmation` card plus ids. The BE saves the user and assistant messages and names the
 * saved assistant message; an older BE does not, so the card is then added to the chat locally. The
 * real document is still created only by confirming the draft.
 */
export interface AiFormSubmitResponse {
  readonly card: AiCard
  readonly draftId: string
  readonly conversationId: string
  /** Absent on a BE that did not save the turn. */
  readonly messageId?: string | null
}
