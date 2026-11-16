import { cn } from '@/lib/utils'
import type { AiOutcomeSummary } from '../../../types/ai-outcome-report.types'
import { OUTCOME_TONE, getOutcomeStatusView } from '../../../utils/ai-outcome-tone'

interface OutcomeSummaryProps {
  readonly outcome: AiOutcomeSummary
  readonly partialData: boolean
  /** "Số liệu lúc ...", already formatted; null when the BE sent none. */
  readonly timestamp: string | null
}

/** The answer first: a status icon (tone only where it means something), the headline, then how fresh it is. */
export function OutcomeSummary({ outcome, partialData, timestamp }: OutcomeSummaryProps) {
  const status = getOutcomeStatusView(outcome.status)
  const StatusIcon = status.icon
  return (
    <header className="flex items-start gap-2.5 px-3 pt-3 pb-2.5">
      <StatusIcon
        className={cn('mt-0.5 size-5 shrink-0', OUTCOME_TONE[status.tone].text)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-pretty [overflow-wrap:anywhere]">
          <span className="sr-only">{status.label}: </span>
          {outcome.headline}
        </h3>
        {outcome.reason ? (
          <p className="text-muted-foreground text-sm text-pretty [overflow-wrap:anywhere]">
            {outcome.reason}
          </p>
        ) : null}
        {timestamp || partialData ? (
          <p className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
            {timestamp ? <span className="tabular-nums">{timestamp}</span> : null}
            {timestamp && partialData ? ' · ' : null}
            {partialData ? (
              <span className="text-warning font-medium">Dữ liệu chưa đầy đủ</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </header>
  )
}
