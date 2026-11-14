import type { ApiErrorResponse } from '@/types/api'

// Mirrors Kovia_BE Contract/Models/AiAssistant/AiAssistantResponses.cs.

export const AI_CARD_TYPES = {
  navigation: 'navigation_card',
  actionConfirmation: 'action_confirmation',
  quickReplies: 'quick_replies',
  suggestedAction: 'suggested_action',
  resultList: 'result_list',
  /** Not drawn: records named in the reply that may be opened (see utils/ai-entity-links). */
  entityLinks: 'entity_links',
} as const

export const AI_ACTIONS = {
  createInboundRequest: 'create_inbound_request',
  createTransfer: 'create_transfer',
  createStockAdjustment: 'create_stock_adjustment',
  createStockIssueRequest: 'create_stock_issue_request',
  createSupplierReturn: 'create_supplier_return',
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
