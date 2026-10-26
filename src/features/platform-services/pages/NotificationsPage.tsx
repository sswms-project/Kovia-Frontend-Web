'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  NotificationDirectory,
  type NotificationFilterValues,
} from '../components/NotificationsPage'
import { useOpenNotification } from '../hooks/use-open-notification'
import {
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
} from '../hooks/use-platform-services'
import { notificationFiltersSchema } from '../schemas/platform-services.schema'
import { buildNotificationQuery } from '../utils/platform-services-query'

export default function NotificationsPage() {
  const searchParams = useSearchParams()
  const serializedParams = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(serializedParams), [serializedParams])
  const queryParams = useMemo(() => buildNotificationQuery(params), [params])
  const notificationsQuery = useNotificationsQuery(queryParams)
  const unreadQuery = useNotificationsQuery({ pageNumber: 1, pageSize: 1, isRead: false })
  const markAllMutation = useMarkAllNotificationsReadMutation()
  const { pendingNotificationId, markRead, open } = useOpenNotification()

  const filters: NotificationFilterValues = {
    search: params.get('search') ?? '',
    type: queryParams.type ?? '',
    readState:
      queryParams.isRead === true ? 'read' : queryParams.isRead === false ? 'unread' : 'all',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
  }
  const hasActiveFilters = ['search', 'type', 'readState', 'dateFrom', 'dateTo'].some((key) => {
    const value = params.get(key)
    return value !== null && value !== '' && value !== 'all'
  })

  function applyFilters(values: NotificationFilterValues) {
    const result = notificationFiltersSchema.safeParse(values)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Bộ lọc không hợp lệ.')
      return
    }

    const next = new URLSearchParams()
    next.set('pageSize', String(queryParams.pageSize))
    setIfPresent(next, 'search', result.data.search)
    setIfPresent(next, 'type', result.data.type === 'all' ? '' : result.data.type)
    setIfPresent(next, 'readState', result.data.readState === 'all' ? '' : result.data.readState)
    setIfPresent(next, 'dateFrom', result.data.dateFrom)
    setIfPresent(next, 'dateTo', result.data.dateTo)
    navigate(next)
  }

  function markAllRead() {
    markAllMutation.mutate(undefined, {
      onSuccess: (updatedCount) => {
        toast.success(
          updatedCount > 0
            ? `Đã đánh dấu ${updatedCount} thông báo đã đọc.`
            : 'Không còn thông báo chưa đọc.'
        )
      },
    })
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="shrink-0">
        <h1 className="text-foreground text-xl font-semibold">Thông báo</h1>
      </header>
      <NotificationDirectory
        items={notificationsQuery.data?.items ?? []}
        totalCount={notificationsQuery.data?.totalCount ?? 0}
        unreadCount={unreadQuery.data?.totalCount ?? null}
        page={queryParams.pageNumber}
        pageSize={queryParams.pageSize}
        filters={filters}
        isLoading={notificationsQuery.isLoading}
        isFetching={notificationsQuery.isFetching}
        isError={notificationsQuery.isError}
        hasActiveFilters={hasActiveFilters}
        pendingNotificationId={pendingNotificationId}
        isMarkingAll={markAllMutation.isPending}
        onApplyFilters={applyFilters}
        onClearFilters={() => {
          const next = new URLSearchParams()
          next.set('pageSize', String(queryParams.pageSize))
          navigate(next)
        }}
        onPageChange={(page) => {
          const next = new URLSearchParams(params)
          next.set('page', String(page))
          navigate(next)
        }}
        onPageSizeChange={(pageSize) => {
          const next = new URLSearchParams(params)
          next.set('page', '1')
          next.set('pageSize', String(pageSize))
          navigate(next)
        }}
        onMarkRead={markRead}
        onOpen={open}
        onMarkAllRead={markAllRead}
        onRetry={() => void notificationsQuery.refetch()}
      />
    </div>
  )
}

function setIfPresent(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value)
}

function navigate(params: URLSearchParams) {
  const query = params.toString()
  window.history.pushState(
    null,
    '',
    query ? `${APP_ROUTES.notifications}?${query}` : APP_ROUTES.notifications
  )
}
