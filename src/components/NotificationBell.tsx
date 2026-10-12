'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NotificationItem } from '@/features/platform-services/types/platform-services.types'
import { formatPlatformDateTime } from '@/features/platform-services/utils/platform-services-format'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'

interface NotificationBellProps {
  readonly notifications: NotificationItem[]
  readonly unreadCount: number
  readonly isLoading: boolean
  readonly isError: boolean
  readonly pendingNotificationId: string | null
  readonly isMarkingAll: boolean
  readonly onMarkRead: (notification: NotificationItem) => void
  readonly onMarkAllRead: () => void
  readonly onRetry: () => void
  readonly hasMore?: boolean
  readonly isLoadingMore?: boolean
  readonly onLoadMore?: () => void
}

export function NotificationBell(props: NotificationBellProps) {
  const { hasMore, isLoadingMore, onLoadMore } = props
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
  const [previousUnread, setPreviousUnread] = useState<number | null>(null)
  const [ringKey, setRingKey] = useState(0)

  // Chuông chỉ rung khi số chưa đọc tăng sau lần tải đầu, không rung lúc mới vào trang.
  if (!props.isLoading && previousUnread !== props.unreadCount) {
    if (previousUnread !== null && props.unreadCount > previousUnread) setRingKey((key) => key + 1)
    setPreviousUnread(props.unreadCount)
  }

  useEffect(() => {
    if (!scrollRoot || !sentinel || !hasMore || isLoadingMore || !onLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { root: scrollRoot, rootMargin: '0px 0px 48px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollRoot, sentinel, hasMore, isLoadingMore, onLoadMore])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground relative"
          aria-label={`Thông báo${props.unreadCount > 0 ? `, ${props.unreadCount} chưa đọc` : ''}`}
        >
          <Bell
            key={ringKey}
            aria-hidden="true"
            data-notification-bell-ring={ringKey > 0 ? '' : undefined}
          />
          {props.unreadCount > 0 ? (
            <span
              key={props.unreadCount}
              data-notification-badge
              className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            >
              {props.unreadCount > 99 ? '99+' : props.unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-[min(22rem,calc(100vw-1rem))]">
        <div className="flex items-center justify-between gap-2 px-2">
          <DropdownMenuLabel className="px-0">Thông báo</DropdownMenuLabel>
          {props.unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={props.isMarkingAll}
              onClick={props.onMarkAllRead}
            >
              <CheckCheck data-icon="inline-start" aria-hidden="true" />
              Đọc tất cả
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {props.isLoading ? (
          <p role="status" className="text-muted-foreground px-2 py-4 text-center text-sm">
            Đang tải thông báo…
          </p>
        ) : null}
        {props.isError ? (
          <div role="alert" className="flex flex-col items-center gap-2 px-2 py-4 text-sm">
            <p>Không thể tải thông báo.</p>
            <Button type="button" variant="outline" size="sm" onClick={props.onRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : null}
        {!props.isLoading && !props.isError && props.notifications.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-sm">Không có thông báo</p>
        ) : null}
        {!props.isLoading && !props.isError ? (
          <div ref={setScrollRoot} className="max-h-80 overflow-y-auto overscroll-contain">
            {props.notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                disabled={props.pendingNotificationId === notification.id}
                onSelect={() => props.onMarkRead(notification)}
                data-notification-item
                className="flex flex-col items-start gap-1 py-2 transition-colors"
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm transition-colors',
                      notification.isRead
                        ? 'text-muted-foreground'
                        : 'text-foreground font-semibold'
                    )}
                  >
                    {notification.title}
                  </span>
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full transition-colors duration-300',
                      notification.isRead ? 'bg-muted-foreground/30' : 'bg-primary'
                    )}
                    aria-label={notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                  />
                </div>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {notification.message}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {formatPlatformDateTime(notification.createdAt)}
                </span>
              </DropdownMenuItem>
            ))}
            {hasMore ? (
              <div
                ref={setSentinel}
                role="status"
                className="text-muted-foreground py-2 text-center text-xs"
              >
                {isLoadingMore ? 'Đang tải thêm…' : ' '}
              </div>
            ) : null}
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
          <Link href={APP_ROUTES.notifications}>Xem tất cả thông báo</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
