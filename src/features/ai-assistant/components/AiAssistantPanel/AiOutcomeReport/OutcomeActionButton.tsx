import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight, CornerDownLeft, FilePenLine, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AI_OUTCOME_ACTION_KINDS,
  type AiOutcomeAction,
} from '../../../types/ai-outcome-report.types'
import { AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'
import { getOutcomeActionMessage } from '../../../utils/ai-outcome-report'

export interface OutcomeActionHandlers {
  readonly onNavigate: () => void
  /** Latest message only: sends a chat message (kind reply and draft). */
  readonly onSend?: (message: string) => void
  /** Latest message only: asks the previous question again (kind retry). */
  readonly onRetry?: () => void
}

interface OutcomeActionButtonProps {
  readonly action: AiOutcomeAction
  readonly handlers: OutcomeActionHandlers
  readonly variant?: 'default' | 'outline' | 'ghost'
}

const className = cn(
  'h-auto min-h-7 max-w-full justify-start py-1.5 text-left font-normal whitespace-normal [overflow-wrap:anywhere]',
  // The shared Button animates `all`; only the properties that change are listed here.
  'transition-[background-color,border-color,color,box-shadow,translate] motion-reduce:transition-none',
  AI_TOUCH_MIN_HEIGHT
)

/**
 * One recommended action. It only navigates or sends a chat message; a draft is then made and confirmed by
 * the existing action_confirmation flow, so nothing is written from here. Callers pass only actions that
 * passed isRenderableOutcomeAction.
 */
export function OutcomeActionButton({
  action,
  handlers,
  variant = 'outline',
}: OutcomeActionButtonProps) {
  if (action.kind === AI_OUTCOME_ACTION_KINDS.navigate) {
    return (
      <Button asChild variant={variant} size="sm" className={className}>
        {/* In-app path rebuilt and permission-checked by the BE, validated by isAiAppPath. */}
        <Link href={(action.url ?? '/') as Route} onNavigate={handlers.onNavigate}>
          <ArrowRight aria-hidden="true" />
          {action.label}
        </Link>
      </Button>
    )
  }
  const isRetry = action.kind === AI_OUTCOME_ACTION_KINDS.retry
  const message = getOutcomeActionMessage(action)
  // Only when the prompt differs from the visible label: the name starts with the label (label in name).
  const sendsOtherText = !isRetry && message !== action.label
  const Icon = isRetry
    ? RotateCcw
    : action.kind === AI_OUTCOME_ACTION_KINDS.draft
      ? FilePenLine
      : CornerDownLeft
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      // The button shows `label` but sends the prompt as the user's message: let the user see it first.
      title={sendsOtherText ? message : undefined}
      aria-label={sendsOtherText ? `${action.label} (gửi: ${message})` : undefined}
      onClick={() => (isRetry ? handlers.onRetry?.() : handlers.onSend?.(message))}
    >
      <Icon aria-hidden="true" />
      {action.label}
    </Button>
  )
}
