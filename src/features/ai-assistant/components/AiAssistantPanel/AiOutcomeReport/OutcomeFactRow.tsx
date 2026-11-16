import { cn } from '@/lib/utils'
import type { AiOutcomeFact, AiOutcomeTone } from '../../../types/ai-outcome-report.types'
import { formatAiOutcomeValue, getAiBarPercent } from '../../../utils/ai-outcome-report'
import { getAiBarText } from '../../../utils/ai-outcome-view'
import { OutcomeProgress } from './OutcomeProgress'

interface OutcomeFactRowProps {
  /** A plain `{ label, value }` (evidence parameter) is valid: without `bar` no bar is drawn. */
  readonly fact: Pick<AiOutcomeFact, 'label' | 'value'> & Partial<AiOutcomeFact>
  readonly tone?: AiOutcomeTone
}

/**
 * A label and its value (always dt + dd). With a bar the value is the bar's own "43 / 80 Lon" (said once)
 * and the track sits under the row; with no honest bar (limit <= 0) the text stays and the track is hidden.
 */
export function OutcomeFactRow({ fact, tone = 'neutral' }: OutcomeFactRowProps) {
  const bar = fact.bar ? getAiBarText(fact.bar, fact.unit) : null
  const percent = fact.bar ? getAiBarPercent(fact.bar) : null
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_fit-content(60%)] items-baseline gap-x-3',
        percent !== null && 'relative pb-2.5'
      )}
    >
      <dt className="text-muted-foreground [overflow-wrap:anywhere]">{fact.label}</dt>
      <dd className="text-right [overflow-wrap:anywhere] tabular-nums">
        {bar ? bar.visible : formatAiOutcomeValue(fact.value, fact.unit)}
        {bar && percent !== null ? (
          // Inside the dd because a <dl> may only hold dt/dd; absolutely placed, so it spans the whole row.
          <OutcomeProgress percent={percent} label={fact.label} spoken={bar.spoken} tone={tone} />
        ) : null}
      </dd>
    </div>
  )
}
