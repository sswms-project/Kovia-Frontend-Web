import { cn } from '@/lib/utils'
import type { AiOutcomeEvidence } from '../../../types/ai-outcome-report.types'
import { AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'
import { AiCardDetailList, AiCardDisclosure } from '../AiCardParts'
import { OutcomeFactRow } from './OutcomeFactRow'

const TRIGGER_CLASS = cn(
  'max-w-full text-left [overflow-wrap:anywhere] [&>svg]:shrink-0',
  AI_TOUCH_MIN_HEIGHT
)

function EvidenceBlock({ item }: { readonly item: AiOutcomeEvidence }) {
  return (
    <section className="space-y-1.5">
      <h4 className="font-semibold [overflow-wrap:anywhere]">{item.title}</h4>
      {item.formula ? (
        // The formula lives here, never in the main prose: a wrapped monospace block.
        <pre className="bg-muted/60 rounded-md p-2 font-mono text-xs [overflow-wrap:anywhere] whitespace-pre-wrap">
          {item.formula}
        </pre>
      ) : null}
      {item.parameters.length > 0 ? (
        <dl className="space-y-1">
          {item.parameters.map((parameter, index) => (
            <OutcomeFactRow key={`${index}-${parameter.label}`} fact={parameter} />
          ))}
        </dl>
      ) : null}
      <AiCardDetailList title="Nguồn dữ liệu" items={item.sources} />
      <AiCardDetailList title="Giả định" items={item.assumptions} />
      <AiCardDetailList title="Giới hạn" items={item.limits} />
    </section>
  )
}

/** Formulas, parameters, sources, assumptions and limits: closed until asked for. */
export function EvidenceDetails({ evidence }: { readonly evidence: readonly AiOutcomeEvidence[] }) {
  if (evidence.length === 0) return null
  return (
    <AiCardDisclosure label="Xem căn cứ và cách tính" triggerClassName={TRIGGER_CLASS}>
      <div className="space-y-3">
        {evidence.map((item, index) => (
          <EvidenceBlock key={item.key ?? `${index}-${item.title}`} item={item} />
        ))}
      </div>
    </AiCardDisclosure>
  )
}
