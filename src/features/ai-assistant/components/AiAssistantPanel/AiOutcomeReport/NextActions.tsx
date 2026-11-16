import type { AiOutcomeAction } from '../../../types/ai-outcome-report.types'
import { planOutcomeActions } from '../../../utils/ai-outcome-view'
import { OutcomeActionButton, type OutcomeActionHandlers } from './OutcomeActionButton'

interface NextActionsProps {
  /** Actions no finding owns, already filtered to the ones that can be drawn. */
  readonly actions: readonly AiOutcomeAction[]
  readonly handlers: OutcomeActionHandlers
}

/** One solid primary (a navigate/draft action, else a reply); a retry is always the quiet ghost. */
export function NextActions({ actions, handlers }: NextActionsProps) {
  if (actions.length === 0) return null
  return (
    <section aria-label="Bước tiếp theo" className="flex flex-wrap gap-2 border-t px-3 py-3">
      {planOutcomeActions(actions, { preferIntent: true }).map(({ action, variant }) => (
        <OutcomeActionButton
          key={action.key}
          action={action}
          handlers={handlers}
          variant={variant}
        />
      ))}
    </section>
  )
}
