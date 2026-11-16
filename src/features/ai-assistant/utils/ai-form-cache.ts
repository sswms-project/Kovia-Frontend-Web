import {
  AI_ACTIONS,
  AI_DRAFT_STATUSES,
  type AiConversationMessages,
  type AiMessage,
} from '../types/ai-assistant.types'
import type { AiFormSubmitResponse } from '../types/ai-form.types'
import { mergeAiDrafts } from './ai-conversation-cache'

const RESULT_MESSAGE = 'Đã lập bản nháp phiếu xuất kho. Hãy kiểm tra rồi xác nhận để tạo phiếu.'

/**
 * Appends the confirmation card returned by a form submit to the cached conversation when it is not
 * there yet: a BE that did not save the turn, or a reload that has not landed. The message is made
 * here and lasts until the conversation reloads. A draft already shown is never added twice.
 */
export function appendAiFormResult(
  current: AiConversationMessages | undefined,
  { card, draftId }: AiFormSubmitResponse
): AiConversationMessages | undefined {
  const id = `form-draft-${draftId}`
  const isShown = current?.messages.some(
    (message) => message.id === id || message.cards.some((shown) => shown.draftId === draftId)
  )
  if (!current || isShown) return current

  const message: AiMessage = {
    id,
    role: 'Assistant',
    content: RESULT_MESSAGE,
    intent: null,
    cards: [{ ...card, draftId }],
    createdAt: new Date().toISOString(),
  }
  return {
    ...current,
    messages: [...current.messages, message],
    drafts: mergeAiDrafts(current.drafts, [
      {
        draftId,
        action: card.action ?? AI_ACTIONS.createStockIssueRequest,
        status: AI_DRAFT_STATUSES.pending,
        resultEntityId: null,
        expiresAt: card.expiresAt ?? '',
        revision: card.revision ?? null,
        editable: card.editable ?? false,
      },
    ]),
  }
}
