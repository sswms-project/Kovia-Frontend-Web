import { CornerDownLeft, MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AI_CARD_TYPES, type AiCard } from '../../types/ai-assistant.types'
import { AI_NAVIGATION_ICONS } from '../../utils/ai-assistant-icons'
import { isAiAppPath } from '../../utils/ai-assistant-links'
import { AI_ACTION_TILE_CLASS, AiActionTileBody } from './AiActionTile'
import { AiNavigationCard } from './AiNavigationCard'

/** Quá ba lựa chọn thì người dùng phải đọc để chọn, mất ý nghĩa "bấm là xong". */
const MAX_NEXT_STEPS = 3
/** Các thẻ hiện lần lượt, cách nhau một nhịp ngắn, để mắt đi theo thứ tự ưu tiên. */
const STAGGER_MS = 50

interface NextStep {
  readonly key: string
  readonly card: AiCard
  /** Câu hỏi sẽ gửi thay người dùng; không có nghĩa là thẻ mở trang. */
  readonly message?: string
}

function toNextSteps(cards: readonly AiCard[]): NextStep[] {
  const steps: NextStep[] = []
  cards.forEach((card, index) => {
    if (card.type === AI_CARD_TYPES.navigation && isAiAppPath(card.actionUrl)) {
      steps.push({ key: `open-${card.actionUrl}`, card })
    } else if (card.type === AI_CARD_TYPES.suggestedAction && card.title && card.message) {
      steps.push({ key: `send-${card.message}`, card, message: card.message })
    } else if (card.type === AI_CARD_TYPES.quickReplies) {
      // Lựa chọn do mô hình viết chỉ có một dòng chữ: chính nó vừa là nhãn vừa là câu gửi đi.
      for (const option of card.options ?? []) {
        steps.push({
          key: `send-${index}-${option}`,
          card: { type: AI_CARD_TYPES.suggestedAction, title: option },
          message: option,
        })
      }
    }
  })
  return steps.slice(0, MAX_NEXT_STEPS)
}

interface AiNextStepsProps {
  readonly cards: readonly AiCard[]
  readonly onNavigate: () => void
  /** Chỉ có ở tin nhắn mới nhất: câu hỏi gợi ý của lượt cũ không còn đúng ngữ cảnh. */
  readonly onSend?: (message: string) => void
}

/**
 * Nhóm tối đa ba thẻ "bước tiếp theo" dưới câu trả lời: mở đúng trang, hoặc gửi sẵn câu hỏi kế tiếp,
 * để người dùng bấm thay vì gõ.
 */
export function AiNextSteps({ cards, onNavigate, onSend }: AiNextStepsProps) {
  const steps = toNextSteps(cards).filter((step) => !step.message || onSend)
  if (steps.length === 0) return null

  return (
    <section aria-label="Bước tiếp theo" className="flex flex-col gap-1.5">
      {steps.length > 1 ? (
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Bước tiếp theo
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {steps.map(({ key, card, message }, index) => (
          <li
            key={key}
            className="animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-250 fill-mode-backwards motion-reduce:animate-none"
            style={{ animationDelay: `${index * STAGGER_MS}ms` }}
          >
            {message && onSend ? (
              <Button
                type="button"
                variant="outline"
                // Thẻ cao nhiều dòng và căn trái, khác kích thước mặc định của Button.
                className={cn(
                  AI_ACTION_TILE_CLASS,
                  'h-auto justify-start font-normal whitespace-normal'
                )}
                onClick={() => onSend(message)}
              >
                <AiActionTileBody
                  icon={AI_NAVIGATION_ICONS[card.icon ?? ''] ?? MessageCircleQuestion}
                  title={card.title ?? ''}
                  description={card.description}
                  trailingIcon={CornerDownLeft}
                />
              </Button>
            ) : (
              <AiNavigationCard card={card} onNavigate={onNavigate} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
