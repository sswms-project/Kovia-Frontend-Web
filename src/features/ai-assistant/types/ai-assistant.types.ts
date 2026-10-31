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
  /** Trang đang mở, để trợ lý hiểu "kho này", "sản phẩm này". */
  readonly pagePath?: string
}
