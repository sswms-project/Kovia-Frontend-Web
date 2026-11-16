import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import type { AiOutcomeFindingView } from '../../../utils/ai-outcome-report'
import type { OutcomeActionHandlers } from './OutcomeActionButton'
import { OutcomeFindingList } from './OutcomeFindingList'
import { OutcomeToggleTrigger } from './OutcomeToggleTrigger'

/** Titles named on the collapsed line; the rest are one tap away. */
const PREVIEW_TITLES = 2

interface OutcomeOkGroupProps {
  readonly views: readonly AiOutcomeFindingView[]
  readonly handlers: OutcomeActionHandlers
}

/** Findings that need nothing, folded into one line after the ones that do. Nothing is dropped. */
export function OutcomeOkGroup({ views, handlers }: OutcomeOkGroupProps) {
  if (views.length === 0) return null
  const titles = views.slice(0, PREVIEW_TITLES).map(({ finding }) => finding.title)
  return (
    <Collapsible className="border-t">
      <div className="px-3 py-1">
        <OutcomeToggleTrigger>
          <span className="text-foreground font-medium">
            {views.length} sản phẩm không cần xử lý
          </span>
          {` · ${titles.join(', ')}${views.length > PREVIEW_TITLES ? ', …' : ''}`}
        </OutcomeToggleTrigger>
      </div>
      <CollapsibleContent data-ai-motion="expand">
        <OutcomeFindingList views={views} handlers={handlers} />
      </CollapsibleContent>
    </Collapsible>
  )
}
