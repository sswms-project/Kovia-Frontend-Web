import type { AiOutcomeFindingView } from '../../../utils/ai-outcome-report'
import { FindingCard } from './FindingCard'
import type { OutcomeActionHandlers } from './OutcomeActionButton'
import { RelatedDocuments } from './RelatedDocuments'

interface OutcomeFindingListProps {
  readonly views: readonly AiOutcomeFindingView[]
  readonly handlers: OutcomeActionHandlers
  readonly className?: string
}

/** Findings with their related documents, separated by space rather than rules. */
export function OutcomeFindingList({ views, handlers, className }: OutcomeFindingListProps) {
  return (
    <ul className={className}>
      {views.map(({ finding, actions, related }) => (
        <li key={finding.key}>
          <FindingCard finding={finding} actions={actions} handlers={handlers}>
            {related.map((group) => (
              <RelatedDocuments key={group.key} group={group} onNavigate={handlers.onNavigate} />
            ))}
          </FindingCard>
        </li>
      ))}
    </ul>
  )
}
