'use client'

import { useDeferredValue, useRef, useState } from 'react'
import { ArrowLeft, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AiConversation } from '../../types/ai-assistant.types'
import { filterAiConversations } from '../../utils/ai-history-groups'
import { AiHistoryList } from './AiHistoryList'
import { AiHistorySearch } from './AiHistorySearch'
import {
  AiHistoryEmpty,
  AiHistoryError,
  AiHistorySearchEmpty,
  AiHistorySkeleton,
} from './AiHistoryStates'

/** Mirrors the BE contract: GET conversations returns only the latest 30, with no paging. */
const AI_CONVERSATION_LIST_LIMIT = 30

interface AiHistoryViewProps {
  readonly conversations: readonly AiConversation[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly activeConversationId: string | null
  readonly onSelect: (conversationId: string) => void
  readonly onNewConversation: () => void
  readonly onRetry: () => void
  /** Absent in the split workspace, where the chat is always visible next to the history. */
  readonly onBack?: () => void
}

export function AiHistoryView({
  conversations,
  isLoading,
  isError,
  activeConversationId,
  onSelect,
  onNewConversation,
  onRetry,
  onBack,
}: AiHistoryViewProps) {
  const [query, setQuery] = useState('')
  // The input stays instant; the grouped list re-filters at low priority while typing.
  const deferredQuery = useDeferredValue(query)
  const filtered = filterAiConversations(conversations, deferredQuery)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const renderBody = () => {
    if (isLoading) return <AiHistorySkeleton />
    if (isError) return <AiHistoryError onRetry={onRetry} />
    if (conversations.length === 0) return <AiHistoryEmpty onNewConversation={onNewConversation} />
    if (filtered.length === 0) return <AiHistorySearchEmpty query={deferredQuery} />
    return (
      <AiHistoryList
        conversations={filtered}
        activeConversationId={activeConversationId}
        onSelect={onSelect}
        onLeaveTop={() => searchRef.current?.focus()}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-1">
          {onBack ? (
            <Button type="button" variant="ghost" size="sm" className="-ml-1.5" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              Quay lại chat
            </Button>
          ) : (
            <h2 className="text-sm font-semibold">Lịch sử trò chuyện</h2>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onNewConversation}
          >
            <MessageSquarePlus aria-hidden="true" />
            Cuộc mới
          </Button>
        </div>
        {onBack ? <h2 className="px-0.5 text-sm font-semibold">Lịch sử trò chuyện</h2> : null}
        <AiHistorySearch
          value={query}
          inputRef={searchRef}
          onChange={setQuery}
          onArrowDown={() =>
            listRef.current?.querySelector<HTMLButtonElement>('[data-history-item]')?.focus()
          }
        />
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-2">
        {renderBody()}
        {!isLoading && !isError && conversations.length >= AI_CONVERSATION_LIST_LIMIT ? (
          <p className="text-muted-foreground px-2.5 pt-3 pb-1 text-[11px]">
            Hiển thị {AI_CONVERSATION_LIST_LIMIT} cuộc trò chuyện gần nhất.
          </p>
        ) : null}
      </div>
    </div>
  )
}
