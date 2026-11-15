import type {
  AiConversation,
  AiConversationMessages,
  AiStreamFailure,
} from '../types/ai-assistant.types'

/** Clock difference tolerated between this browser and the server when matching a saved turn. */
const CLOCK_SKEW_MS = 2 * 60_000
/** New conversations checked when the broken turn started one (its id was never received). */
const MAX_NEW_CONVERSATIONS = 3

export function isAiStreamFailure(error: unknown): error is AiStreamFailure {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error
}

/**
 * The answer the BE saved for `question` although the stream broke before `message_complete`: the
 * question (a message not in the cache before sending) directly followed by the assistant's answer.
 * Null when nothing was saved — then the turn is reported as failed and never sent again by itself.
 */
export function findSavedAiAnswerId(
  conversation: AiConversationMessages,
  question: string,
  knownMessageIds: ReadonlySet<string>,
  sentAt: number
): string | null {
  const { messages } = conversation
  for (let index = messages.length - 2; index >= 0; index -= 1) {
    const asked = messages[index]
    const answer = messages[index + 1]
    if (asked?.role !== 'User' || answer?.role !== 'Assistant') continue
    if (knownMessageIds.has(asked.id) || asked.content.trim() !== question.trim()) continue
    if (Date.parse(asked.createdAt) < sentAt - CLOCK_SKEW_MS) continue
    return answer.id
  }
  return null
}

/** Conversations the broken turn may have created: active since it was sent, newest first. */
export function recentAiConversationIds(
  conversations: readonly AiConversation[],
  sentAt: number
): string[] {
  return conversations
    .filter((conversation) => Date.parse(conversation.lastMessageAt) >= sentAt - CLOCK_SKEW_MS)
    .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
    .slice(0, MAX_NEW_CONVERSATIONS)
    .map((conversation) => conversation.id)
}
