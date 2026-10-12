import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { NotificationFilters } from './NotificationFilters'
import { NotificationList } from './NotificationList'
import type { NotificationDirectoryProps } from './types'

export function NotificationDirectory(props: NotificationDirectoryProps) {
  return (
    <OperationalListPanel aria-label="Danh sách thông báo">
      <div className="flex shrink-0 flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-sm font-semibold">Danh sách thông báo</h2>
        <NotificationFilters
          key={props.filters.search}
          filters={props.filters}
          isFetching={props.isFetching}
          unreadCount={props.unreadCount}
          isMarkingAll={props.isMarkingAll}
          onApply={props.onApplyFilters}
          onClear={props.onClearFilters}
          onRetry={props.onRetry}
          onMarkAllRead={props.onMarkAllRead}
        />
      </div>
      <NotificationList
        items={props.items}
        isLoading={props.isLoading}
        isError={props.isError}
        hasActiveFilters={props.hasActiveFilters}
        pendingNotificationId={props.pendingNotificationId}
        onMarkRead={props.onMarkRead}
        onOpen={props.onOpen}
        onRetry={props.onRetry}
      />
      {!props.isLoading && !props.isError && props.totalCount > 0 ? (
        <OperationalPagination
          page={props.page}
          pageSize={props.pageSize}
          totalCount={props.totalCount}
          isPending={props.isFetching}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
        />
      ) : null}
    </OperationalListPanel>
  )
}
