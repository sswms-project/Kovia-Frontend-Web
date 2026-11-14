import { memo, useMemo, type KeyboardEvent } from 'react'
import type { AiConversation } from '../../types/ai-assistant.types'
import { groupAiConversations } from '../../utils/ai-history-groups'
import { AiHistoryItem } from './AiHistoryItem'

interface AiHistoryListProps {
  readonly conversations: readonly AiConversation[]
  readonly activeConversationId: string | null
  readonly onSelect: (conversationId: string) => void
  /** Called when ArrowUp is pressed on the first item, to hand focus back to the search box. */
  readonly onLeaveTop: () => void
}

/** Grouped conversations with roving arrow-key navigation; one scroll container (the parent's). */
export const AiHistoryList = memo(function AiHistoryList({
  conversations,
  activeConversationId,
  onSelect,
  onLeaveTop,
}: AiHistoryListProps) {
  const groups = useMemo(() => groupAiConversations(conversations, new Date()), [conversations])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-history-item]')
    )
    const current = items.findIndex((item) => item === document.activeElement)
    if (current === -1) return
    event.preventDefault()
    if (event.key === 'ArrowUp' && current === 0) return onLeaveTop()
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : Math.min(Math.max(current + (event.key === 'ArrowDown' ? 1 : -1), 0), items.length - 1)
    items[next]?.focus()
  }

  return (
    // The arrow keys act on the focused item buttons; the wrapper itself is not interactive.
    <div onKeyDown={handleKeyDown} className="flex flex-col gap-3">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`ai-history-${group.key}`}>
          <h3
            id={`ai-history-${group.key}`}
            className="text-muted-foreground px-2.5 pb-1 text-[11px] font-semibold"
          >
            {group.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.conversations.map((conversation) => (
              <li key={conversation.id}>
                <AiHistoryItem
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
})
