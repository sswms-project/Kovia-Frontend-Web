import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { AiOutcomeTone } from '../../../types/ai-outcome-report.types'
import { OUTCOME_TONE } from '../../../utils/ai-outcome-tone'

interface OutcomeProgressProps {
  readonly percent: number
  readonly label: string
  /** "43 trên 80 Lon": the numbers, never a percent. */
  readonly spoken: string
  readonly tone: AiOutcomeTone
}

/**
 * The 6px track under a fact row. It is anchored to the row (the nearest positioned ancestor), so every bar
 * in the card spans the same width, and the fill never animates (the report may already be a finished message).
 */
export function OutcomeProgress({ percent, label, spoken, tone }: OutcomeProgressProps) {
  return (
    <Progress
      value={percent}
      aria-label={`${label}: ${spoken}`}
      getValueLabel={() => spoken}
      className={cn(
        'bg-foreground/10 absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-full',
        '[&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:transition-none',
        OUTCOME_TONE[tone].bar
      )}
    />
  )
}
