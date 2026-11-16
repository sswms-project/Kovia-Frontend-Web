import { AI_CARD_TYPES, type AiMessage } from '../types/ai-assistant.types'

/**
 * A draft that was re-proposed or patched by chat has a confirmation card in several messages; only the
 * last one is live. Returns, by message id, the draft ids whose card in that message is an older copy
 * (messages without one are absent). It depends on the message list alone, so a reload and a live
 * conversation agree.
 */
export function getSupersededAiDraftCards(
  messages: readonly AiMessage[]
): ReadonlyMap<string, ReadonlySet<string>> {
  const lastIndexByDraft = new Map<string, number>()
  messages.forEach((message, index) => {
    message.cards.forEach((card) => {
      if (card.type === AI_CARD_TYPES.actionConfirmation && card.draftId) {
        lastIndexByDraft.set(card.draftId, index)
      }
    })
  })

  const superseded = new Map<string, Set<string>>()
  messages.forEach((message, index) => {
    message.cards.forEach((card) => {
      if (card.type !== AI_CARD_TYPES.actionConfirmation || !card.draftId) return
      if (lastIndexByDraft.get(card.draftId) === index) return
      const ids = superseded.get(message.id) ?? new Set<string>()
      ids.add(card.draftId)
      superseded.set(message.id, ids)
    })
  })
  return superseded
}
