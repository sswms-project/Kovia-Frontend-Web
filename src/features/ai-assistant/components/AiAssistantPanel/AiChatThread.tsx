'use client'

import { useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { AiMessage } from '../../types/ai-assistant.types'
import {
  AiAssistantAvatar,
  AiChatMessageBubble,
  AiUserBubble,
  type AiDraftCallbacks,
} from './AiChatMessageBubble'
import { AiSuggestedPrompts } from './AiSuggestedPrompts'

interface AiChatThreadProps extends AiDraftCallbacks {
  readonly messages: readonly AiMessage[]
  readonly pendingMessage: string | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly onSuggestion: (prompt: string) => void
}

export function AiChatThread({
  messages,
  pendingMessage,
  isLoading,
  isError,
  onRetry,
  onSuggestion,
  ...draftCallbacks
}: AiChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const hasScrolledOnce = useRef(false)

  useEffect(() => {
    // Lần đầu mở thì nhảy thẳng xuống cuối; từ đó về sau trượt tới tin mới để mắt theo kịp.
    const glide =
      hasScrolledOnce.current && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: glide ? 'smooth' : 'auto' })
    hasScrolledOnce.current = messages.length > 0
  }, [messages.length, pendingMessage])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <Spinner />
        <span className="sr-only">Đang tải cuộc trò chuyện…</span>
      </div>
    )
  }

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
    <div
      role="log"
      aria-live="polite"
      aria-label="Cuộc trò chuyện với trợ lý AI"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3"
    >
      {messages.length === 0 && !pendingMessage ? (
        <AiSuggestedPrompts disabled={false} onSelect={onSuggestion} />
      ) : null}

      {messages.map((message, index) => (
        <AiChatMessageBubble
          key={message.id}
          message={message}
          onQuickReply={index === messages.length - 1 && !pendingMessage ? onSuggestion : undefined}
          animateEntrance={index === messages.length - 1}
          {...draftCallbacks}
        />
      ))}

      {pendingMessage ? (
        <>
          <AiUserBubble content={pendingMessage} animateEntrance />
          <div
            className="text-muted-foreground animate-in fade-in-0 animation-duration-200 flex items-center gap-2 text-xs motion-reduce:animate-none"
            role="status"
          >
            <AiAssistantAvatar />
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="bg-primary/70 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s] motion-reduce:animate-none" />
              <span className="bg-primary/70 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s] motion-reduce:animate-none" />
              <span className="bg-primary/70 size-1.5 animate-bounce rounded-full motion-reduce:animate-none" />
            </span>
            Trợ lý đang xử lý…
          </div>
        </>
      ) : null}

      <div ref={endRef} />
    </div>
  )
}
