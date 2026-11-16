import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { AiOutcomeAction, AiOutcomeFinding } from '../../../types/ai-outcome-report.types'
import { OUTCOME_TONE } from '../../../utils/ai-outcome-tone'
import { planOutcomeActions } from '../../../utils/ai-outcome-view'
import { FindingHeading } from './FindingHeading'
import { OutcomeActionButton, type OutcomeActionHandlers } from './OutcomeActionButton'
import { OutcomeFactRow } from './OutcomeFactRow'

/** One solid primary and one quiet follow-up per finding; any more are not drawn. */
const MAX_FINDING_ACTIONS = 2

interface FindingCardProps {
  readonly finding: AiOutcomeFinding
  /** This finding's own actions, already filtered to the ones that can be drawn. */
  readonly actions: readonly AiOutcomeAction[]
  readonly handlers: OutcomeActionHandlers
  /** Related documents of this finding. */
  readonly children?: ReactNode
}

/** One verified finding: what it is, its numbers, its documents and what to do about it. */
export function FindingCard({ finding, actions, handlers, children }: FindingCardProps) {
  const tone = OUTCOME_TONE[finding.tone]
  const ToneIcon = tone.icon
  const planned = planOutcomeActions(actions, { max: MAX_FINDING_ACTIONS })

  return (
    <article aria-label={finding.title} className="flex items-start gap-2.5 px-3 py-3">
      <ToneIcon className={cn('mt-0.5 size-4 shrink-0', tone.text)} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <FindingHeading finding={finding} onNavigate={handlers.onNavigate} />
        {finding.facts.length > 0 ? (
          <dl className="space-y-1.5 text-xs">
            {finding.facts.map((fact, index) => (
              <OutcomeFactRow key={`${index}-${fact.label}`} fact={fact} tone={finding.tone} />
            ))}
          </dl>
        ) : null}
        {children}
        {planned.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {planned.map(({ action, variant }) => (
              <OutcomeActionButton
                key={action.key}
                action={action}
                handlers={handlers}
                variant={variant}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
