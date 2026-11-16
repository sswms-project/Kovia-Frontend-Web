import { cn } from '@/lib/utils'
import type { AiOutcomeFinding } from '../../../types/ai-outcome-report.types'
import { isAiAppPath } from '../../../utils/ai-assistant-links'
import { AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'
import { OUTCOME_TONE, getBusinessStatusLabel } from '../../../utils/ai-outcome-tone'
import { isOutcomeTextCovered } from '../../../utils/ai-outcome-view'
import { AiCardLink } from '../AiCardParts'

const linkClass = cn(
  'text-primary focus-visible:ring-ring inline-flex max-w-full items-center rounded-sm underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2',
  AI_TOUCH_MIN_HEIGHT
)

/**
 * Who the finding is about, said once: the title is the link when the entity has a verified url, a status
 * only shows when it adds something, and the entity gets its own line only when its label adds to the title.
 */
export function FindingHeading({
  finding,
  onNavigate,
}: {
  readonly finding: AiOutcomeFinding
  readonly onNavigate: () => void
}) {
  const tone = OUTCOME_TONE[finding.tone]
  const entity = finding.entity
  const entityUrl = entity && isAiAppPath(entity.url) ? entity.url : null
  const status = getBusinessStatusLabel(finding.businessStatus)
  const showStatus = status && !isOutcomeTextCovered(status, [finding.title, finding.summary])
  const showEntity = entity && entityUrl && !isOutcomeTextCovered(entity.label, [finding.title])

  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h4 className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
          {tone.label ? <span className="sr-only">{tone.label}: </span> : null}
          <AiCardLink url={entityUrl} onNavigate={onNavigate} className={linkClass}>
            {finding.title}
          </AiCardLink>
        </h4>
        {showStatus ? <span className={cn('text-xs font-medium', tone.text)}>{status}</span> : null}
      </div>
      {finding.summary ? (
        <p className="text-foreground/85 text-sm text-pretty [overflow-wrap:anywhere]">
          {finding.summary}
        </p>
      ) : null}
      {showEntity ? (
        <p className="text-xs [overflow-wrap:anywhere]">
          <AiCardLink url={entityUrl} onNavigate={onNavigate} className={linkClass}>
            {entity.label}
          </AiCardLink>
        </p>
      ) : null}
    </div>
  )
}
