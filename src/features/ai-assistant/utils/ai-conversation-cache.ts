import {
  AI_CARD_TYPES,
  type AiCard,
  type AiChatResponse,
  type AiConversationMessages,
  type AiDraftStatusInfo,
} from '../types/ai-assistant.types'

export function mergeAiDrafts(
  existing: readonly AiDraftStatusInfo[],
  incoming: readonly AiDraftStatusInfo[]
): AiDraftStatusInfo[] {
  const draftsById = new Map(existing.map((draft) => [draft.draftId, draft]))
  incoming.forEach((draft) => draftsById.set(draft.draftId, draft))
  return [...draftsById.values()]
}

/** Appends a completed chat turn to the cached conversation (or seeds it for a new one). */
export function appendAiChatTurn(
  current: AiConversationMessages | undefined,
  response: AiChatResponse
): AiConversationMessages {
  return {
    conversationId: response.conversationId,
    title: current?.title ?? response.userMessage.content,
    messages: [...(current?.messages ?? []), response.userMessage, response.assistantMessage],
    drafts: mergeAiDrafts(current?.drafts ?? [], response.drafts),
  }
}

export function updateAiDraftStatus(
  current: AiConversationMessages | undefined,
  update: Pick<AiDraftStatusInfo, 'draftId' | 'status' | 'resultEntityId'>
): AiConversationMessages | undefined {
  if (!current) return current

  return {
    ...current,
    drafts: current.drafts.map((draft) =>
      draft.draftId === update.draftId
        ? { ...draft, status: update.status, resultEntityId: update.resultEntityId }
        : draft
    ),
  }
}

/** Revision of a draft as the cached conversation knows it; confirm echoes it back as `expectedRevision`. */
export function findAiDraftRevision(
  current: AiConversationMessages | undefined,
  draftId: string
): string | null {
  return current?.drafts.find((draft) => draft.draftId === draftId)?.revision ?? null
}

/**
 * Applies a saved edit to the cached conversation: the draft entry (revision, expiry, status) and its
 * confirmation card (summary, details, expiry), so the card never shows the content it had before the
 * edit. Messages and drafts that are not this draft keep their identity, so memoized rows skip rendering.
 */
export function patchAiDraftEdit(
  current: AiConversationMessages | undefined,
  update: Pick<AiDraftStatusInfo, 'draftId' | 'status' | 'expiresAt' | 'revision' | 'editable'> & {
    readonly summary: string
    readonly details: AiCard['details']
  }
): AiConversationMessages | undefined {
  if (!current?.drafts.some((draft) => draft.draftId === update.draftId)) return current

  const isThisCard = (card: AiCard) =>
    card.type === AI_CARD_TYPES.actionConfirmation && card.draftId === update.draftId
  return {
    ...current,
    messages: current.messages.map((message) =>
      message.cards.some(isThisCard)
        ? {
            ...message,
            cards: message.cards.map((card) =>
              isThisCard(card)
                ? {
                    ...card,
                    summary: update.summary,
                    details: update.details,
                    expiresAt: update.expiresAt,
                  }
                : card
            ),
          }
        : message
    ),
    drafts: current.drafts.map((draft) =>
      draft.draftId === update.draftId
        ? {
            ...draft,
            status: update.status,
            expiresAt: update.expiresAt,
            revision: update.revision,
            editable: update.editable,
          }
        : draft
    ),
  }
}
