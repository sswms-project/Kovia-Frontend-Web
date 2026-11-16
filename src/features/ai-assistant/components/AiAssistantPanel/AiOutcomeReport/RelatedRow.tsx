import { useId } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AiOutcomeRelatedItem } from '../../../types/ai-outcome-report.types'
import { isAiAppPath } from '../../../utils/ai-assistant-links'
import { AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'
import { formatAiOutcomeDate, formatAiOutcomeValue } from '../../../utils/ai-outcome-report'

const rowClass = cn(
  'flex min-h-9 flex-col justify-center rounded-sm px-2 py-1 text-xs',
  AI_TOUCH_MIN_HEIGHT
)
const linkClass = cn(
  rowClass,
  'hover:bg-muted focus-visible:ring-ring outline-none focus-visible:ring-2'
)

/**
 * One related document. The whole row is the link (one tap target). Line 1: the code, wrapping, with its
 * status as plain muted text; line 2: quantity, warehouse and date.
 */
export function RelatedRow({
  item,
  onNavigate,
}: {
  readonly item: AiOutcomeRelatedItem
  readonly onNavigate: () => void
}) {
  const detailsId = useId()
  const meta = [
    item.quantity != null ? formatAiOutcomeValue(item.quantity, item.unit) : null,
    item.warehouse,
    item.date ? formatAiOutcomeDate(item.date) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const content = (
    <>
      <span className="[overflow-wrap:anywhere]">
        <span className="font-medium tabular-nums">{item.label}</span>
        {item.status ? <span className="text-muted-foreground"> · {item.status}</span> : null}
      </span>
      {meta ? (
        <span className="text-muted-foreground [overflow-wrap:anywhere] tabular-nums">{meta}</span>
      ) : null}
    </>
  )

  if (!isAiAppPath(item.url)) return <div className={rowClass}>{content}</div>
  return (
    <Link
      // In-app path rebuilt and permission-checked by the BE, validated by isAiAppPath.
      href={item.url as Route}
      onNavigate={onNavigate}
      aria-label={`Mở ${item.label}`}
      aria-describedby={item.status || meta ? detailsId : undefined}
      className={linkClass}
    >
      {content}
      {/* The accessible name is "Mở <code>"; the status and the numbers are read as its description. */}
      <span id={detailsId} className="sr-only">
        {[item.status, meta].filter(Boolean).join(', ')}
      </span>
    </Link>
  )
}
