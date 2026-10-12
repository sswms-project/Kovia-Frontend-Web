import {
  AI_CARD_TYPES,
  AI_DRAFT_STATUSES,
  type AiDraftStatusInfo,
  type AiMessage,
} from '../../types/ai-assistant.types'
import { AiActionConfirmationCard } from './AiActionConfirmationCard'
import type { AiDraftQuantityEdit } from './AiDraftQuantityEditor'
import { cn } from '@/lib/utils'
import { AiMarkdown } from './AiMarkdown'
import { AiNextSteps } from './AiNextSteps'

export interface AiDraftCallbacks {
  readonly drafts: ReadonlyMap<string, AiDraftStatusInfo>
  readonly processingDraftId: string | null
  readonly onConfirmAction: (draftId: string) => void
  readonly onCancelAction: (draftId: string) => void
  readonly onNavigate: () => void
  readonly quantityEdit: AiDraftQuantityEdit
}

interface AiChatMessageBubbleProps extends AiDraftCallbacks {
  readonly message: AiMessage
  /** Chỉ truyền cho tin nhắn mới nhất: lựa chọn của các lượt cũ không còn đúng ngữ cảnh. */
  readonly onQuickReply?: (reply: string) => void
  /** Chỉ câu trả lời mới nhất chạy hiệu ứng; lịch sử cũ hiện ngay. */
  readonly animateEntrance?: boolean
}

const MESSAGE_ENTRANCE =
  'animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-250 motion-reduce:animate-none'

interface AiUserBubbleProps {
  readonly content: string
  /** Chỉ bong bóng vừa gửi mới chạy hiệu ứng; bản đã lưu thay thế nó thì đứng yên để không nháy. */
  readonly animateEntrance?: boolean
}

export function AiUserBubble({ content, animateEntrance = false }: AiUserBubbleProps) {
  return (
    <div className={cn('flex justify-end', animateEntrance && MESSAGE_ENTRANCE)}>
      <p className="bg-primary text-primary-foreground max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-sm break-words whitespace-pre-wrap">
        {content}
      </p>
    </div>
  )
}

export function AiAssistantAvatar() {
  return <AiAssistantMascot size="sm" />
}

export function AiAssistantMascot({ size = 'md' }: { readonly size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = { sm: 'size-7', md: 'size-9', lg: 'size-15' }[size]
  const face = { sm: 'h-3.5 w-4.5 gap-1', md: 'h-4.5 w-5.5 gap-1', lg: 'h-7.5 w-10 gap-2' }[size]
  const eye = { sm: 'size-0.5', md: 'size-1', lg: 'size-1.5' }[size]
  const sensor = size === 'lg' ? 'size-2' : 'size-1'
  const antenna = size === 'lg' ? '-top-2 h-2.5' : '-top-1 h-1.5'
  const antennaLight = size === 'lg' ? '-top-3 size-2' : '-top-1.5 size-1'
  const cornerLight = size === 'lg' ? 'bottom-1.5 left-1.5 size-1' : 'bottom-0.5 left-1 h-1 w-1'
  const rightCornerLight =
    size === 'lg' ? 'right-1.5 bottom-1.5 size-1' : 'right-1 bottom-0.5 h-1 w-1'

  return (
    <span
      className={`${dimensions} border-primary/35 bg-primary-container relative flex shrink-0 items-center justify-center rounded-[0.75rem] border shadow-[inset_-5px_-5px_0_color-mix(in_oklab,var(--primary)_32%,transparent),0_10px_18px_color-mix(in_oklab,var(--primary)_24%,transparent)]`}
      style={{ transform: 'perspective(140px) rotateX(7deg) rotateY(-9deg)' }}
      aria-hidden="true"
    >
      <span className="bg-primary/65 absolute top-2 -right-1 bottom-2 w-1 rounded-r-sm" />
      <span className="bg-primary/45 absolute right-2 -bottom-1 left-2 h-1 rounded-b-sm" />
      <span className={`absolute ${antenna} bg-primary w-px`} />
      <span
        className={`absolute ${antennaLight} bg-tertiary rounded-full shadow-[0_0_8px_var(--tertiary)]`}
      />
      <span
        className={`${face} border-tertiary-foreground/15 bg-tertiary text-tertiary-foreground relative flex items-center justify-center rounded-[0.35rem] border shadow-[inset_-3px_-3px_0_color-mix(in_oklab,var(--on-tertiary-container)_32%,transparent)]`}
      >
        <span className={`${eye} rounded-full bg-current`} />
        <span className={`${eye} rounded-full bg-current`} />
        <span className="bg-tertiary-foreground/80 absolute bottom-1 h-px w-1/3 rounded-full" />
      </span>
      <span className={`absolute ${cornerLight} bg-primary/70 rounded-[2px]`} />
      <span className={`absolute ${rightCornerLight} bg-primary/70 rounded-[2px]`} />
      {size === 'lg' ? (
        <>
          <span className={`bg-primary absolute top-2 left-1.5 rounded-full ${sensor}`} />
          <span className={`bg-primary absolute right-1.5 bottom-3 rounded-full ${sensor}`} />
        </>
      ) : null}
    </span>
  )
}

export function AiChatMessageBubble({
  message,
  drafts,
  processingDraftId,
  onConfirmAction,
  onCancelAction,
  onNavigate,
  quantityEdit,
  onQuickReply,
  animateEntrance = false,
}: AiChatMessageBubbleProps) {
  if (message.role === 'User') return <AiUserBubble content={message.content} />

  return (
    <div className={cn('flex gap-2', animateEntrance && MESSAGE_ENTRANCE)}>
      <AiAssistantAvatar />
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
                isProcessing={processingDraftId === card.draftId}
                isLocked={processingDraftId !== null}
                onConfirm={onConfirmAction}
                onCancel={onCancelAction}
                onNavigate={onNavigate}
                quantityEdit={quantityEdit}
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
