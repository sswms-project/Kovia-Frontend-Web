'use client'

import { useState } from 'react'
import { ArrowDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiThreadScroll } from '../../hooks/use-ai-thread-scroll'
import type { AiMessage } from '../../types/ai-assistant.types'
import type { AiChatStream } from '../../utils/ai-chat-stream-state'
import type { AiThinkingSummary } from '../../utils/ai-thinking'
import { AiChatMessageBubble, type AiDraftCallbacks } from './AiChatMessageBubble'
import { AiStreamingMessage } from './AiStreamingMessage'
import { AiSuggestedPrompts } from './AiSuggestedPrompts'

interface AiChatThreadProps extends AiDraftCallbacks {
  readonly conversationId: string | null
  readonly messages: readonly AiMessage[]
  /** Phase of the turn sent from this conversation (running, stopped or failed), if any. */
  readonly streamPhase: AiChatStream['phase'] | null
  /** Thinking rows of turns finished in this session, by assistant message id. */
  readonly thinkingByMessageId: Readonly<Record<string, AiThinkingSummary>>
  /** A turn is running somewhere (maybe another conversation): no new sends until it ends. */
  readonly isSending: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  /** Sends a message (suggestion, quick reply, retry). */
  readonly onSend: (message: string) => void
}

function AiThreadSkeleton() {
  return (
    <div role="status" className="flex flex-1 flex-col gap-4 px-4 py-4">
      <span className="sr-only">Đang tải cuộc trò chuyện…</span>
      <Skeleton className="ml-auto h-8 w-2/3" />
      <Skeleton className="h-20 w-5/6" />
      <Skeleton className="ml-auto h-8 w-1/2" />
    </div>
  )
}

export function AiChatThread({
  conversationId,
  messages,
  streamPhase,
  thinkingByMessageId,
  isSending,
  isLoading,
  isError,
  onRetry,
  onSend,
  ...draftCallbacks
}: AiChatThreadProps) {
  const { scrollRef, contentRef, isAwayFromBottom, handleScroll, jumpToLatest } = useAiThreadScroll(
    {
      conversationId,
      isSendingTurn: streamPhase === 'sending',
    }
  )
  const isLatestTurnSettled = !streamPhase && !isSending
  // Screen readers hear one line when an answer lands, not the answer re-read token by token.
  const [wasStreaming, setWasStreaming] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const isStreaming = streamPhase === 'sending' || streamPhase === 'streaming'
  if (isStreaming !== wasStreaming) {
    setWasStreaming(isStreaming)
    if (isStreaming) setAnnouncement('')
    else if (streamPhase === null) setAnnouncement('Kovia đã trả lời xong.')
  }
  const lastQuestion = messages.at(-2)?.role === 'User' ? messages.at(-2)?.content : undefined

  if (isLoading) return <AiThreadSkeleton />

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-sm"
      >
        <p>Không tải được cuộc trò chuyện.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Thử lại
        </Button>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        // The log role is polite by default; streamed text must not be announced per token.
        aria-live="off"
        aria-label="Cuộc trò chuyện với trợ lý AI"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        <div ref={contentRef} className="flex flex-col gap-5 px-4 pt-4 pb-6">
          {messages.length === 0 && !streamPhase ? <AiSuggestedPrompts onSelect={onSend} /> : null}

          {messages.map((message, index) => {
            const isLatest = index === messages.length - 1 && isLatestTurnSettled
            return (
              <AiChatMessageBubble
                key={message.id}
                message={message}
                thinking={thinkingByMessageId[message.id]}
                onQuickReply={isLatest ? onSend : undefined}
                onRetry={isLatest && lastQuestion ? () => onSend(lastQuestion) : undefined}
                {...draftCallbacks}
              />
            )
          })}

          {streamPhase ? (
            <AiStreamingMessage conversationId={conversationId} onRetry={onSend} />
          ) : null}
        </div>
      </div>
      <span role="status" className="sr-only">
        {announcement}
      </span>

      {isAwayFromBottom ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-background animate-in fade-in-0 animation-duration-150 absolute bottom-3 left-1/2 -translate-x-1/2 motion-reduce:animate-none"
          onClick={jumpToLatest}
        >
          <ArrowDown aria-hidden="true" />
          Tin mới nhất
        </Button>
      ) : null}
    </div>
  )
}
