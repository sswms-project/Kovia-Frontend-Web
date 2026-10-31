import type {
  AiChatResponse,
  AiConversationMessages,
  AiDraftStatusInfo,
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
