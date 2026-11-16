import { useEffect, useMemo } from 'react'
import { logger } from '@/lib/logger'
import type { AiFormCardData } from '../schemas/ai-form-card.schema'
import type { AiCard } from '../types/ai-assistant.types'
import { readAiFormCard } from '../utils/ai-form-card'

// A thread can mount the same message again (history, scroll): remembering what was reported keeps
// one warning per card for the whole session.
const reportedCards = new Set<string>()

/**
 * The validated form of each card of a message, in card order (`null` for other cards and for a
 * `collect_input` card that fails the contract). A rejected form card is reported once, in an effect.
 */
export function useAiFormCards(
  messageId: string,
  cards: readonly AiCard[]
): readonly (AiFormCardData | null)[] {
  const readings = useMemo(() => cards.map(readAiFormCard), [cards])

  useEffect(() => {
    readings.forEach(({ issues }, index) => {
      const cardId = `${messageId}:${index}`
      if (issues === null || reportedCards.has(cardId)) return
      reportedCards.add(cardId)
      logger.warn(`Thẻ biểu mẫu ${cardId} không hợp lệ nên không được hiển thị: ${issues}`)
    })
  }, [messageId, readings])

  return useMemo(() => readings.map(({ form }) => form), [readings])
}
