import {
  AI_CARD_TYPES,
  AI_DRAFT_STATUSES,
  type AiDraftProcessing,
  type AiDraftStatusInfo,
  type AiMessage,
} from '../../types/ai-assistant.types'
import { AiActionConfirmationCard } from './AiActionConfirmationCard'
import { cn } from '@/lib/utils'
import { AiAssistantMascot } from './AiAssistantMascot'
import { AiMarkdown } from './AiMarkdown'
import { AiNextSteps } from './AiNextSteps'
import { AiUserBubble, MESSAGE_ENTRANCE } from './AiUserBubble'

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
  /** Chỉ câu trả lời mới nhất chạy hiệu ứng; lịch sử cũ hiện ngay. */
  readonly animateEntrance?: boolean
}

export function AiChatMessageBubble({
  message,
  drafts,
  processing,
  onConfirmAction,
  onCancelAction,
  onNavigate,
  onQuickReply,
  animateEntrance = false,
}: AiChatMessageBubbleProps) {
  if (message.role === 'User') return <AiUserBubble content={message.content} />

  return (
    <div className={cn('flex gap-2', animateEntrance && MESSAGE_ENTRANCE)}>
      <AiAssistantMascot size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="bg-muted/60 rounded-lg rounded-tl-sm px-3 py-2">
          <AiMarkdown content={message.content} />
        </div>
        {message.cards.map((card) => {
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
      </div>
    </div>
  )
}
