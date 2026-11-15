import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight, ChevronDown, CornerDownLeft, MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { AI_CARD_TYPES, type AiCard } from '../../types/ai-assistant.types'
import { AI_NAVIGATION_ICONS } from '../../utils/ai-assistant-icons'
import { isAiAppPath } from '../../utils/ai-assistant-links'
import { getAiNavigationView } from '../../utils/ai-navigation-card'
import { AI_ACTION_TILE_CLASS, AiActionTileBody } from './AiActionTile'
import { AiNavigationCard } from './AiNavigationCard'

/** Hai thẻ chính giữ ý nghĩa "bấm là xong"; nhiều hơn thì người dùng phải đọc để chọn. */
const MAX_PRIMARY_STEPS = 2
/** Tổng số bước, kể cả phần ẩn sau "Thêm". */
const MAX_NEXT_STEPS = 5
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
      steps.push({ key: `send-${index}-${card.message}`, card, message: card.message })
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
  // Thẻ mở đúng dữ liệu / màn hình là hành động chính; câu hỏi gợi ý xếp sau (giữ thứ tự trong từng nhóm).
  const opens = steps.filter((step) => !step.message)
  const sends = steps.filter((step) => step.message)
  return [...opens, ...sends].slice(0, MAX_NEXT_STEPS)
}

interface AiNextStepsProps {
  readonly cards: readonly AiCard[]
  readonly onNavigate: () => void
  /** Chỉ có ở tin nhắn mới nhất: câu hỏi gợi ý của lượt cũ không còn đúng ngữ cảnh. */
  readonly onSend?: (message: string) => void
}

interface StepProps {
  readonly step: NextStep
  readonly onNavigate: () => void
  readonly onSend?: (message: string) => void
}

function PrimaryStep({ step: { card, message }, onNavigate, onSend }: StepProps) {
  if (message && onSend) {
    return (
      <Button
        type="button"
        variant="outline"
        // Thẻ cao nhiều dòng và căn trái, khác kích thước mặc định của Button.
        className={cn(AI_ACTION_TILE_CLASS, 'h-auto justify-start font-normal whitespace-normal')}
        onClick={() => onSend(message)}
      >
        <AiActionTileBody
          icon={AI_NAVIGATION_ICONS[card.icon ?? ''] ?? MessageCircleQuestion}
          title={card.title ?? ''}
          description={card.description}
          trailingIcon={CornerDownLeft}
        />
      </Button>
    )
  }
  return <AiNavigationCard card={card} onNavigate={onNavigate} />
}

/** Lựa chọn phụ: một dòng chữ nhẹ, không viền, để hai thẻ chính vẫn nổi bật. */
function SecondaryStep({ step: { card, message }, onNavigate, onSend }: StepProps) {
  const className =
    'h-auto w-full justify-start px-2 py-1.5 font-normal whitespace-normal text-left'
  if (message && onSend) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => onSend(message)}
      >
        <CornerDownLeft className="text-muted-foreground" aria-hidden="true" />
        {card.title}
      </Button>
    )
  }
  if (!isAiAppPath(card.actionUrl)) return null
  return (
    <Button asChild variant="ghost" size="sm" className={className}>
      <Link href={card.actionUrl as Route} onNavigate={onNavigate}>
        <ArrowRight className="text-muted-foreground" aria-hidden="true" />
        {getAiNavigationView(card).label}
      </Link>
    </Button>
  )
}

/**
 * Các "bước tiếp theo" dưới câu trả lời: mở đúng trang, hoặc gửi sẵn câu hỏi kế tiếp, để người dùng
 * bấm thay vì gõ. Chỉ hai bước đầu hiện thành thẻ; phần còn lại nằm sau nút "Thêm".
 */
export function AiNextSteps({ cards, onNavigate, onSend }: AiNextStepsProps) {
  const steps = toNextSteps(cards).filter((step) => !step.message || onSend)
  if (steps.length === 0) return null
  const primary = steps.slice(0, MAX_PRIMARY_STEPS)
  const secondary = steps.slice(MAX_PRIMARY_STEPS)

  return (
    <section aria-label="Bước tiếp theo" className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5">
        {primary.map((step, index) => (
          <li
            key={step.key}
            data-ai-motion="card"
            style={{ animationDelay: `${index * STAGGER_MS}ms` }}
          >
            <PrimaryStep step={step} onNavigate={onNavigate} onSend={onSend} />
          </li>
        ))}
      </ul>
      {secondary.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground group w-fit px-1.5"
            >
              <ChevronDown
                className="transition-transform duration-(--ai-motion-hover) group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
              Thêm {secondary.length} gợi ý
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent data-ai-motion="expand">
            <ul className="flex flex-col">
              {secondary.map((step) => (
                <li key={step.key}>
                  <SecondaryStep step={step} onNavigate={onNavigate} onSend={onSend} />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </section>
  )
}
