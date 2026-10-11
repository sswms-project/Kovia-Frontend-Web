import { CheckCircle2 } from 'lucide-react'
import type { LifecycleEvent } from '@/features/inbound-request/types/inbound-request.types'
import { formatOperationalDateTime } from '@/features/inbound-request/utils/inbound-request-format'

export function LifecycleTimeline({
  events,
  actionLabels,
  reasonLabels,
}: {
  readonly events: readonly LifecycleEvent[]
  readonly actionLabels?: Readonly<Record<string, string>>
  readonly reasonLabels?: Readonly<Record<string, string>>
}) {
  if (events.length === 0) {
    return <p className="text-muted-foreground py-4 text-sm">Chưa có lịch sử xử lý.</p>
  }

  return (
    <ol className="flex flex-col">
      {events.map((event, index) => (
        <li
          key={`${event.createdAt}-${event.action}-${index}`}
          className="relative flex gap-3 pb-5 last:pb-0"
        >
          {index < events.length - 1 ? (
            <span
              className="bg-border absolute top-5 bottom-0 left-[7px] w-px"
              aria-hidden="true"
            />
          ) : null}
          <CheckCircle2
            className="text-primary relative mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm leading-5 font-medium">
                {actionLabels?.[event.action] ?? event.action}
              </p>
              {event.actorName ? (
                <p className="text-muted-foreground text-xs">{event.actorName}</p>
              ) : null}
              {event.reason ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {reasonLabels?.[event.action] ?? 'Lý do'}: {event.reason}
                </p>
              ) : null}
            </div>
            <time
              className="text-muted-foreground shrink-0 text-xs tabular-nums"
              dateTime={event.createdAt}
            >
              {formatOperationalDateTime(event.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
