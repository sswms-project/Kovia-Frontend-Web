import { cn } from '@/lib/utils'
import type { AiOutcomeMetric } from '../../../types/ai-outcome-report.types'
import { formatAiOutcomeValue } from '../../../utils/ai-outcome-report'
import { OUTCOME_TONE } from '../../../utils/ai-outcome-tone'

/** "Dưới ngưỡng" reads as the end of a sentence after its number: "3 sản phẩm dưới ngưỡng". Acronyms stay. */
const lowerFirst = (text: string) =>
  /^\p{Lu}\p{Lu}/u.test(text) ? text : text.charAt(0).toLocaleLowerCase('vi') + text.slice(1)

/**
 * Key numbers as one inline strip that wraps with the card (the panel is resizable): the number carries the
 * tone, the label stays muted. Tone is also spoken, never colour alone.
 */
export function MetricStrip({ metrics }: { readonly metrics: readonly AiOutcomeMetric[] }) {
  if (metrics.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-0.5 px-3 pb-3 text-xs @md:gap-x-6">
      {metrics.map((metric, index) => {
        const tone = OUTCOME_TONE[metric.tone]
        return (
          <li
            key={metric.key ?? `${index}-${metric.label}`}
            className="text-muted-foreground max-w-full min-w-0 [overflow-wrap:anywhere]"
          >
            <strong
              className={cn(
                'text-sm font-semibold tabular-nums',
                metric.tone === 'neutral' ? 'text-foreground' : tone.text
              )}
            >
              {formatAiOutcomeValue(metric.value)}
            </strong>{' '}
            {metric.unit ? `${metric.unit} ` : null}
            {lowerFirst(metric.label)}
            {tone.label ? <span className="sr-only"> ({tone.label})</span> : null}
          </li>
        )
      })}
    </ul>
  )
}
