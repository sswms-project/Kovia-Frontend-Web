import { Bell, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '../../types/platform-services.types'
import {
  formatNotificationTime,
  getNotificationDateGroup,
  getNotificationReferenceRoute,
} from '../../utils/platform-services-format'
import { TYPE_LABELS } from './NotificationFilters'

const DATE_GROUP_ORDER = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Cũ hơn'] as const

function groupByDate(items: NotificationItem[]): { label: string; items: NotificationItem[] }[] {
  const map = new Map<string, NotificationItem[]>()
  for (const item of items) {
    const label = getNotificationDateGroup(item.createdAt)
    const group = map.get(label) ?? []
    group.push(item)
    map.set(label, group)
  }
  return DATE_GROUP_ORDER.flatMap((label) => {
    const grouped = map.get(label)
    return grouped ? [{ label, items: grouped }] : []
  })
}

interface NotificationListProps {
  readonly items: NotificationItem[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly hasActiveFilters: boolean
  readonly pendingNotificationId: string | null
  readonly onMarkRead: (notification: NotificationItem) => void
  readonly onOpen: (notification: NotificationItem) => void
  readonly onRetry: () => void
}

export function NotificationList(props: NotificationListProps) {
  if (props.isLoading) return <NotificationLoadingState />
  if (props.isError) return <NotificationErrorState onRetry={props.onRetry} />
  if (props.items.length === 0)
    return <NotificationEmptyState hasActiveFilters={props.hasActiveFilters} />
  const groups = groupByDate(props.items)
  return (
    <div aria-busy={props.isFetching}>
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`group-${group.label}`}>
          <div className="bg-muted/40 border-b px-4 py-2">
            <h4 id={`group-${group.label}`} className="text-muted-foreground text-xs font-medium">
              {group.label}
            </h4>
          </div>
          <ul className="divide-y">
            {group.items.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                isPending={props.pendingNotificationId === notification.id}
                onMarkRead={props.onMarkRead}
                onOpen={props.onOpen}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

interface NotificationRowProps {
  readonly notification: NotificationItem
  readonly isPending: boolean
  readonly onMarkRead: (notification: NotificationItem) => void
  readonly onOpen: (notification: NotificationItem) => void
}

function NotificationRow({ notification, isPending, onMarkRead, onOpen }: NotificationRowProps) {
  const hasReference = Boolean(getNotificationReferenceRoute(notification))
  const content = <NotificationRowContent notification={notification} />
  return (
    <li className={cn('flex items-start gap-2 px-4 py-3', !notification.isRead && 'bg-muted/60')}>
      {hasReference ? (
        <button
          type="button"
          className="hover:bg-muted focus-visible:ring-ring/50 -m-2 flex min-w-0 flex-1 cursor-pointer gap-3 p-2 text-left outline-none focus-visible:ring-[3px]"
          onClick={() => onOpen(notification)}
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 gap-3">{content}</div>
      )}
      {!notification.isRead ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={isPending}
          onClick={() => onMarkRead(notification)}
        >
          {isPending ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
        </Button>
      ) : null}
    </li>
  )
}

function NotificationRowContent({ notification }: { readonly notification: NotificationItem }) {
  return (
    <>
      <span
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          notification.isRead ? 'bg-muted-foreground/30' : 'bg-primary'
        )}
        aria-label={notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm', !notification.isRead && 'font-semibold')}>
            {notification.title}
          </span>
          <Badge variant="outline">{TYPE_LABELS[notification.type]}</Badge>
        </span>
        <span className="text-muted-foreground text-sm break-words whitespace-pre-line">
          {notification.message}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </span>
    </>
  )
}

function NotificationLoadingState() {
  return (
    <div className="space-y-3 p-4" role="status">
      <span className="sr-only">Đang tải thông báo</span>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  )
}

function NotificationErrorState({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
      role="alert"
    >
      <p>Không thể tải thông báo.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        Thử lại
      </Button>
    </div>
  )
}

function NotificationEmptyState({ hasActiveFilters }: { readonly hasActiveFilters: boolean }) {
  return (
    <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
      <Bell className="size-8" aria-hidden="true" />
      <p className="text-sm">
        {hasActiveFilters ? 'Không có thông báo phù hợp bộ lọc.' : 'Bạn chưa có thông báo nào.'}
      </p>
    </div>
  )
}
