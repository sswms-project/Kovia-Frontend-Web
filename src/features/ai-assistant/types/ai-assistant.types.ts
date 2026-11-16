import type { ApiErrorResponse } from '@/types/api'

// Mirrors Kovia_BE Contract/Models/AiAssistant/AiAssistantResponses.cs.

export const AI_CARD_TYPES = {
  navigation: 'navigation_card',
  actionConfirmation: 'action_confirmation',
  quickReplies: 'quick_replies',
  suggestedAction: 'suggested_action',
  resultList: 'result_list',
  /** Operational findings with severity, verified evidence, a recommendation and the record to open. */
  insightList: 'insight_list',
  /** Not drawn: records named in the reply that may be opened (see utils/ai-entity-links). */
  entityLinks: 'entity_links',
  /** Interactive in-chat form; `form` is validated by utils/ai-form-card before anything is drawn. */
  collectInput: 'collect_input',
  /** Read-only what-if result: every row says where its number comes from. */
  simulation: 'simulation',
  /** Option comparison; `recommendedOption` is set only when a backend rule chose one. */
  decision: 'decision',
  /** Response Design System V3: outcome first, findings, related documents, actions (types/ai-outcome-report.types). */
  outcomeReport: 'outcome_report',
} as const

export const AI_ACTIONS = {
  createInboundRequest: 'create_inbound_request',
  createTransfer: 'create_transfer',
  createStockAdjustment: 'create_stock_adjustment',
  createStockIssueRequest: 'create_stock_issue_request',
  createSupplierReturn: 'create_supplier_return',
  createStockDiscrepancyReport: 'create_stock_discrepancy_report',
  createWatchRule: 'create_watch_rule',
  changeWatchRule: 'change_watch_rule',
} as const

export type AiAction = (typeof AI_ACTIONS)[keyof typeof AI_ACTIONS]

export const AI_DRAFT_STATUSES = {
  pending: 'Pending',
  executed: 'Executed',
  cancelled: 'Cancelled',
  expired: 'Expired',
} as const

export type AiDraftStatus = (typeof AI_DRAFT_STATUSES)[keyof typeof AI_DRAFT_STATUSES]

export type AiDraftProcessingAction = 'confirm' | 'cancel'

/** Bản nháp đang được xử lý và thao tác nào đang chạy, để chỉ nút đó hiện spinner. */
export interface AiDraftProcessing {
  readonly draftId: string
  readonly action: AiDraftProcessingAction
}

export interface AiActionDetail {
  readonly label: string
  readonly value: string
}

/** Bản nháp chờ xác nhận; `payload` là JSON camelCase của lệnh tạo phiếu tương ứng ở BE. */
export interface AiActionDraft<TPayload = unknown> {
  readonly draftId: string
  readonly action: string
  readonly status: AiDraftStatus
  readonly expiresAt: string
  readonly payload: TPayload
  /** Base64 rowversion; only editable draft types carry it. Confirm echoes it as `expectedRevision`. */
  readonly revision?: string | null
  readonly editable?: boolean
}

/** Đánh dấu bản nháp đã thực hiện sau khi người dùng tự tạo phiếu bằng form. */
export interface CompleteAiActionRequest {
  readonly resultEntityId: string
}

/** One row of a `result_list` card; `url` is present only when the user may open the detail. */
export interface AiResultListItem {
  readonly title: string
  readonly subtitle?: string | null
  readonly status?: string | null
  readonly meta?: string | null
  readonly url?: string | null
}

export type AiInsightSeverity = 'critical' | 'warning' | 'info'

/** One finding of an `insight_list` card, built by Kovia AI from backend data only; `entity` is BE-verified. */
export interface AiInsightItem {
  readonly title: string
  readonly severity: AiInsightSeverity
  readonly summary?: string | null
  readonly evidence?: readonly string[] | null
  readonly recommendation?: string | null
  readonly entity?: AiEntityLink | null
  readonly status?: string | null
}

/** Where a simulation number comes from: verified now, scheduled, user assumption, estimate or the result. */
export type AiSimulationRowKind = 'verified' | 'scheduled' | 'assumption' | 'estimate' | 'result'

export interface AiSimulationRow {
  readonly label: string
  readonly value: string
  readonly kind: AiSimulationRowKind
}

export interface AiSimulationSection {
  readonly title: string
  readonly url?: string | null
  readonly rows: readonly AiSimulationRow[]
}

export interface AiSimulationAffected {
  readonly title: string
  readonly url?: string | null
  readonly detail?: string | null
}

export type AiDecisionFeasibility = 'yes' | 'partial' | 'no' | 'unknown'

export interface AiDecisionOption {
  readonly key: string
  readonly title: string
  readonly feasible: AiDecisionFeasibility
  /** Aligned with the card's `criteria`. */
  readonly values: readonly string[]
  readonly url?: string | null
}

export interface AiDecisionEvidence {
  readonly label: string
  readonly url?: string | null
}

/** navigation_card level (contract v2): a screen, one verified record, or a pre-filtered list. */
export const AI_NAVIGATION_TARGETS = {
  module: 'module',
  record: 'record',
  filteredList: 'filtered_list',
} as const

export type AiNavigationTarget = (typeof AI_NAVIGATION_TARGETS)[keyof typeof AI_NAVIGATION_TARGETS]

export interface AiCard {
  readonly type: string
  readonly target?: AiNavigationTarget | null
  readonly routeKey?: string | null
  readonly title?: string | null
  readonly description?: string | null
  readonly actionUrl?: string | null
  readonly icon?: string | null
  readonly draftId?: string | null
  readonly action?: string | null
  readonly summary?: string | null
  readonly details?: readonly AiActionDetail[] | null
  readonly expiresAt?: string | null
  /** Confirmation card: base64 rowversion and whether the draft can be edited in place. */
  readonly revision?: string | null
  readonly editable?: boolean | null
  readonly options?: readonly string[] | null
  readonly message?: string | null
  // result_list: a long list kept out of the markdown; `total` may exceed `items.length`.
  readonly total?: number | null
  readonly sortNote?: string | null
  readonly asOf?: string | null
  readonly moreUrl?: string | null
  readonly moreLabel?: string | null
  readonly items?: readonly AiResultListItem[] | null
  readonly entities?: readonly AiEntityLink[] | null
  // insight_list
  readonly insights?: readonly AiInsightItem[] | null
  /** "partial" when a source could not be read or the period is still running. */
  readonly completeness?: 'complete' | 'partial' | null
  // collect_input: untrusted until parsed by utils/ai-form-card.
  readonly form?: unknown
  // simulation + decision
  readonly snapshotAt?: string | null
  readonly assumptions?: readonly string[] | null
  readonly unknowns?: readonly string[] | null
  readonly badge?: string | null
  readonly verdictSeverity?: 'critical' | 'warning' | 'info' | 'ok' | null
  readonly verdict?: string | null
  readonly sections?: readonly AiSimulationSection[] | null
  readonly affected?: readonly AiSimulationAffected[] | null
  readonly conclusion?: string | null
  readonly recommendedOption?: string | null
  readonly recommendationBasis?: string | null
  readonly criteria?: readonly string[] | null
  readonly decisionOptions?: readonly AiDecisionOption[] | null
  readonly evidence?: readonly AiDecisionEvidence[] | null
  readonly risks?: readonly string[] | null
  // outcome_report: the BE nests the report here; untrusted until parsed by utils/ai-outcome-report.
  readonly outcomeReport?: unknown
}

/** A record named in the answer: its label links to `url`, which the BE rebuilt from `type` and `id`. */
export interface AiEntityLink {
  readonly type: string
  readonly id: string
  readonly label: string
  readonly url: string
}

export interface AiMessage {
  readonly id: string
  readonly role: 'User' | 'Assistant'
  readonly content: string
  readonly intent: string | null
  readonly cards: readonly AiCard[]
  readonly createdAt: string
}

export interface AiDraftStatusInfo {
  readonly draftId: string
  readonly action: string
  readonly status: AiDraftStatus
  readonly resultEntityId: string | null
  readonly expiresAt: string
  /** Absent on a BE that predates inline editing, or for a draft type that cannot be edited. */
  readonly revision?: string | null
  readonly editable?: boolean
}

export interface AiChatResponse {
  readonly conversationId: string
  readonly userMessage: AiMessage
  readonly assistantMessage: AiMessage
  readonly drafts: readonly AiDraftStatusInfo[]
}

export interface AiConversation {
  readonly id: string
  readonly title: string
  readonly lastMessageAt: string
}

export interface AiConversationMessages {
  readonly conversationId: string
  readonly title: string
  readonly messages: readonly AiMessage[]
  readonly drafts: readonly AiDraftStatusInfo[]
}

export interface AiActionExecution {
  readonly draftId: string
  readonly action: string
  readonly status: AiDraftStatus
  readonly resultEntityId: string | null
}

export interface SendAiChatMessageRequest {
  readonly conversationId: string | null
  readonly message: string
  /** Trang đang mở, để trợ lý hiểu "kho này", "sản phẩm này". */
  readonly pagePath?: string
}

export type AiStreamStepKind = 'understand' | 'lookup' | 'draft' | 'combine' | 'verify'
export type AiStreamStepState = 'running' | 'done' | 'empty' | 'failed'

/** A real processing step (`step` event, contract v2); the same `id` starts and finishes it. */
export interface AiStreamStep {
  readonly id: number
  readonly kind: AiStreamStepKind
  readonly label: string
  readonly state: AiStreamStepState
  readonly durationMs: number | null
}

/** Progress events of `POST ai/chat/stream` before its `message_complete`. */
export type AiChatStreamEvent =
  | {
      readonly type: 'message_start'
      readonly conversationId: string | null
      readonly requestId: string | null
    }
  | { readonly type: 'step'; readonly step: AiStreamStep }
  | { readonly type: 'text_delta'; readonly text: string }
  /** The answer was revised after some text was streamed: drop this turn's text, the final one follows. */
  | { readonly type: 'reset' }

/**
 * Why a streamed turn ended without an answer. `server`: the BE or the AI reported an error.
 * `disconnected`: the network went away. `timeout`: nothing arrived for too long, not even a ping.
 * `interrupted`: the connection closed before the final event. A user Stop is not a failure.
 */
export type AiStreamFailureKind = 'server' | 'disconnected' | 'timeout' | 'interrupted'

export interface AiStreamFailure extends ApiErrorResponse {
  readonly kind: AiStreamFailureKind
}
