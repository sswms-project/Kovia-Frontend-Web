import type { Route } from 'next'
import Link from 'next/link'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { AiOutcomeRelatedGroup } from '../../../types/ai-outcome-report.types'
import { isAiAppPath } from '../../../utils/ai-assistant-links'
import { AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'
import { getOutcomeRelatedSummary } from '../../../utils/ai-outcome-report'
import { OutcomeToggleTrigger } from './OutcomeToggleTrigger'
import { RelatedRow } from './RelatedRow'

/** Rows shown when the group is opened; the rest wait behind "Xem thêm N" (all of them stay available). */
const VISIBLE_ROWS = 3

const viewAllClass = cn(
  'text-primary focus-visible:ring-ring inline-flex min-h-7 items-center rounded-sm px-2 text-xs underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2',
  AI_TOUCH_MIN_HEIGHT
)

interface RelatedDocumentsProps {
  readonly group: AiOutcomeRelatedGroup
  readonly onNavigate: () => void
}

/** Collapsed: one line that says what exists. Expanded: three rows, "Xem thêm N" for the rest, "Xem tất cả". */
export function RelatedDocuments({ group, onNavigate }: RelatedDocumentsProps) {
  const summary = getOutcomeRelatedSummary(group)
  const viewAll = isAiAppPath(group.viewAllUrl) ? (
    <Link href={group.viewAllUrl as Route} onNavigate={onNavigate} className={viewAllClass}>
      Xem tất cả
    </Link>
  ) : null
  const rows = (items: AiOutcomeRelatedGroup['items'], offset: number) =>
    items.map((item, index) => (
      <li key={`${offset + index}-${item.id ?? item.label}`}>
        <RelatedRow item={item} onNavigate={onNavigate} />
      </li>
    ))

  if (group.items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
        <p className="min-w-0 [overflow-wrap:anywhere]">{summary}</p>
        {viewAll}
      </div>
    )
  }
  const rest = group.items.slice(VISIBLE_ROWS)
  return (
    <Collapsible className="text-xs">
      <OutcomeToggleTrigger>{summary}</OutcomeToggleTrigger>
      <CollapsibleContent data-ai-motion="expand" className="pt-1">
        <ul className="-mx-2">{rows(group.items.slice(0, VISIBLE_ROWS), 0)}</ul>
        {rest.length > 0 ? (
          <Collapsible>
            <CollapsibleContent asChild data-ai-motion="expand">
              <ul className="-mx-2">{rows(rest, VISIBLE_ROWS)}</ul>
            </CollapsibleContent>
            <OutcomeToggleTrigger>Xem thêm {rest.length}</OutcomeToggleTrigger>
          </Collapsible>
        ) : null}
        {viewAll ? <div className="-mx-2">{viewAll}</div> : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
