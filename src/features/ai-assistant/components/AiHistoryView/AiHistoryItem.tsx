import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { AiConversation } from '../../types/ai-assistant.types'
import { formatAiDateTime } from '../../utils/ai-assistant-format'

interface AiHistoryItemProps {
  readonly conversation: AiConversation
  readonly isActive: boolean
  readonly onSelect: (conversationId: string) => void
}

export const AiHistoryItem = memo(function AiHistoryItem({
  conversation,
  isActive,
  onSelect,
}: AiHistoryItemProps) {
  return (
    <button
      type="button"
      data-history-item
      aria-current={isActive ? 'true' : undefined}
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'hover:bg-muted focus-visible:ring-ring flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 outline-none focus-visible:ring-2 motion-reduce:transition-none',
        isActive && 'bg-muted ring-border ring-1'
      )}
    >
      <span className="text-foreground line-clamp-2 text-sm leading-snug font-medium break-words">
        {conversation.title}
      </span>
      <span className="text-muted-foreground text-[11px] tabular-nums">
        {formatAiDateTime(conversation.lastMessageAt)}
      </span>
    </button>
  )
})
