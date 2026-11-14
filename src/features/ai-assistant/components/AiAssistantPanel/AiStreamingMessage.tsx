'use client'

import { RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAiChatStreamTurn } from '../../hooks/use-ai-chat-stream'
import { useAiStreamReveal } from '../../hooks/use-ai-stream-reveal'
import { toAiThinkingSummary } from '../../utils/ai-chat-stream-state'
import { AiAssistantMascot } from './AiAssistantMascot'
import { AiMarkdown } from './AiMarkdown'
import { AiThinkingSteps } from './AiThinkingSteps'
import { AiUserBubble } from './AiUserBubble'

function StreamingText({
  text,
  isStreaming,
}: {
  readonly text: string
  readonly isStreaming: boolean
}) {
  const revealed = useAiStreamReveal(text)
  return <AiMarkdown content={revealed} isStreaming={isStreaming} />
}

function RetryButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="xs" className="h-6 px-1.5" onClick={onClick}>
      <RotateCcw aria-hidden="true" />
      Thử lại
    </Button>
  )
}

interface AiStreamingMessageProps {
  readonly conversationId: string | null
  readonly onRetry: (message: string) => void
}

/**
 * The turn in flight (or stopped / failed): the question, the real steps, then the answer as it
 * streams in. The only row subscribed to the streamed text, so the saved messages above it do not
 * re-render per token.
 */
export function AiStreamingMessage({ conversationId, onRetry }: AiStreamingMessageProps) {
  const stream = useAiChatStreamTurn(conversationId)
  if (!stream) return null
  const isRunning = stream.phase === 'sending' || stream.phase === 'streaming'
  // Running turns show no time, so the start time stands in for "now" (render stays pure).
  const summary = toAiThinkingSummary(stream, stream.startedAt)
  const retry = () => onRetry(stream.message)

  return (
    <>
      <AiUserBubble content={stream.message} animateEntrance />
      <div className="flex gap-2" aria-busy={isRunning}>
        <span data-slot={isRunning ? 'ai-mascot-thinking' : undefined} className="h-fit shrink-0">
          <AiAssistantMascot size="sm" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
          <AiThinkingSteps summary={summary} />
          {stream.text ? <StreamingText text={stream.text} isStreaming={isRunning} /> : null}
          {stream.phase === 'stopped' ? (
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
              Câu trả lời này không được lưu.
              <RetryButton onClick={retry} />
            </p>
          ) : null}
          {stream.phase === 'error' ? (
            <div role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {stream.text ? <Badge variant="outline">Chưa hoàn tất</Badge> : null}
              <span className="text-destructive min-w-0 [overflow-wrap:anywhere]">
                {stream.errorMessage}
              </span>
              <RetryButton onClick={retry} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
