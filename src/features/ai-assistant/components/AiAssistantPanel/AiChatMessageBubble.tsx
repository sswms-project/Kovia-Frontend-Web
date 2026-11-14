import {
  AI_CARD_TYPES,
  AI_DRAFT_STATUSES,
  type AiDraftProcessing,
  type AiDraftStatusInfo,
  type AiMessage,
} from '../../types/ai-assistant.types'
import { memo, useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiActionConfirmationCard } from './AiActionConfirmationCard'
import { AiAssistantMascot } from './AiAssistantMascot'
import { AiCopyButton } from './AiCopyButton'
import { AiMarkdown } from './AiMarkdown'
import { AiNextSteps } from './AiNextSteps'
import { AiResultListCard } from './AiResultListCard'
import { AiThinkingSteps } from './AiThinkingSteps'
import { getAiEntityLinks } from '../../utils/ai-entity-links'
import type { AiThinkingSummary } from '../../utils/ai-thinking'
import { AiUserBubble } from './AiUserBubble'

export interface AiDraftCallbacks {
  readonly drafts: ReadonlyMap<string, AiDraftStatusInfo>
  readonly processing: AiDraftProcessing | null
  readonly onConfirmAction: (draftId: string) => void
  readonly onCancelAction: (draftId: string) => void
  readonly onNavigate: () => void
}

interface AiChatMessageBubbleProps extends AiDraftCallbacks {
  readonly message: AiMessage
  /** Chỉ truyền cho tin nhắn mới nhất: lựa chọn của các lượt cũ không còn đúng ngữ cảnh. */
  readonly onQuickReply?: (reply: string) => void
  /** Chỉ câu trả lời mới nhất: gửi lại câu hỏi ngay trước nó. */
  readonly onRetry?: () => void
  /** Steps of this answer, kept for the session (none after a reload). */
  readonly thinking?: AiThinkingSummary
}

/** Memoized: a saved message does not change while the next answer streams in below it. */
export const AiChatMessageBubble = memo(function AiChatMessageBubble({
  message,
  drafts,
  processing,
  onConfirmAction,
  onCancelAction,
  onNavigate,
  onQuickReply,
  onRetry,
  thinking,
}: AiChatMessageBubbleProps) {
  const entities = useMemo(() => getAiEntityLinks(message.cards), [message.cards])
  if (message.role === 'User') return <AiUserBubble content={message.content} />

  // No entrance animation: the latest answer replaces its own streamed text in place.
  return (
    <div className="group flex gap-2">
      <AiAssistantMascot size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
        {thinking ? <AiThinkingSteps summary={thinking} /> : null}
        <AiMarkdown content={message.content} entities={entities} onNavigate={onNavigate} />
        {message.cards.map((card, index) => {
          if (card.type === AI_CARD_TYPES.resultList) {
            return <AiResultListCard key={`list-${index}`} card={card} onNavigate={onNavigate} />
          }
          if (card.type === AI_CARD_TYPES.actionConfirmation && card.draftId) {
            const draft = drafts.get(card.draftId)
            return (
              <AiActionConfirmationCard
                key={card.draftId}
                card={card}
                status={draft?.status ?? AI_DRAFT_STATUSES.pending}
                resultEntityId={draft?.resultEntityId ?? null}
                processingAction={processing?.draftId === card.draftId ? processing.action : null}
                isLocked={processing !== null}
                onConfirm={onConfirmAction}
                onCancel={onCancelAction}
                onNavigate={onNavigate}
              />
            )
          }
          return null
        })}
        {/* Thẻ xác nhận thay đổi dữ liệu đứng trước; các bước tiếp theo gom thành một nhóm bên dưới. */}
        <AiNextSteps cards={message.cards} onNavigate={onNavigate} onSend={onQuickReply} />
        <div className="-mt-1 -ml-1 flex items-center gap-0.5 opacity-70 transition-opacity duration-(--ai-motion-hover) group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
          <AiCopyButton text={message.content} />
          {onRetry ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Hỏi lại câu này"
              title="Hỏi lại"
              className="text-muted-foreground"
              onClick={onRetry}
            >
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
})
