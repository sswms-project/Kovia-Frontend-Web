import { History, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { AiConversation } from '../../types/ai-assistant.types'
import { formatAiDateTime } from '../../utils/ai-assistant-format'

interface AiConversationMenuProps {
  readonly conversations: readonly AiConversation[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly activeConversationId: string | null
  readonly disabled: boolean
  readonly onSelect: (conversationId: string) => void
  readonly onNewConversation: () => void
}

export function AiConversationMenu({
  conversations,
  isLoading,
  isError,
  activeConversationId,
  disabled,
  onSelect,
  onNewConversation,
}: AiConversationMenuProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || activeConversationId === null}
        onClick={onNewConversation}
      >
        <Plus aria-hidden="true" />
        Cuộc trò chuyện mới
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}>
            <History aria-hidden="true" />
            Lịch sử
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="w-72">
          <DropdownMenuLabel>Cuộc trò chuyện gần đây</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? <DropdownMenuItem disabled>Đang tải…</DropdownMenuItem> : null}
          {isError ? <DropdownMenuItem disabled>Không tải được lịch sử.</DropdownMenuItem> : null}
          {!isLoading && !isError && conversations.length === 0 ? (
            <DropdownMenuItem disabled>Chưa có cuộc trò chuyện nào.</DropdownMenuItem>
          ) : null}
          {conversations.map((conversation) => (
            <DropdownMenuItem
              key={conversation.id}
              aria-current={conversation.id === activeConversationId ? 'true' : undefined}
              onSelect={() => onSelect(conversation.id)}
              className={cn(
                'flex flex-col items-start gap-0.5',
                conversation.id === activeConversationId && 'bg-muted'
              )}
            >
              <span className="w-full truncate text-sm">{conversation.title}</span>
              <span className="text-muted-foreground text-[11px]">
                {formatAiDateTime(conversation.lastMessageAt)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
