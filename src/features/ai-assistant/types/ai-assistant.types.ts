// Mirrors Kovia_BE Contract/Models/AiAssistant/AiAssistantResponses.cs.

export const AI_CARD_TYPES = {
  navigation: 'navigation_card',
  actionConfirmation: 'action_confirmation',
  quickReplies: 'quick_replies',
  suggestedAction: 'suggested_action',
} as const

export const AI_ACTIONS = {
  createInboundRequest: 'create_inbound_request',
  createTransfer: 'create_transfer',
  createStockAdjustment: 'create_stock_adjustment',
  createStockIssueRequest: 'create_stock_issue_request',
} as const

export type AiAction = (typeof AI_ACTIONS)[keyof typeof AI_ACTIONS]

export const AI_DRAFT_STATUSES = {
  pending: 'Pending',
  executed: 'Executed',
  cancelled: 'Cancelled',
  expired: 'Expired',
} as const

export type AiDraftStatus = (typeof AI_DRAFT_STATUSES)[keyof typeof AI_DRAFT_STATUSES]

export interface AiActionDetail {
  readonly label: string
  readonly value: string
  /** Có giá trị khi dòng này là một dòng hàng mà người dùng được chỉnh số lượng trước khi xác nhận. */
  readonly productId?: string | null
  readonly quantity?: number | null
  readonly unit?: string | null
  /** Ngày dự kiến hàng về (yyyy-MM-dd) khi dòng này là dòng ngày của bản nháp; sửa được trước khi xác nhận. */
  readonly dateValue?: string | null
}

/** Mirrors UpdateAiActionDraftQuantitiesRequest. */
export interface UpdateAiDraftQuantitiesRequest {
  readonly expectedDate?: string
  readonly lines: readonly { readonly productId: string; readonly quantity: number }[]
}

export interface AiCard {
  readonly type: string
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
}
