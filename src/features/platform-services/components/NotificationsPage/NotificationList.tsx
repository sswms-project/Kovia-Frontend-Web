import { Check } from 'lucide-react'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import type { NotificationItem } from '../../types/platform-services.types'
import {
  formatPlatformDateTime,
  getNotificationReferenceRoute,
} from '../../utils/platform-services-format'
import { TYPE_LABELS } from './NotificationFilters'

interface NotificationListProps {
  readonly items: NotificationItem[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly hasActiveFilters: boolean
  readonly pendingNotificationId: string | null
  readonly onMarkRead: (notification: NotificationItem) => void
  readonly onOpen: (notification: NotificationItem) => void
  readonly onRetry: () => void
}

export function NotificationList(props: NotificationListProps) {
  if (props.isLoading) return <OperationalLoadingState />
  if (props.isError) {
    return <OperationalErrorState title="Không thể tải thông báo" onRetry={props.onRetry} />
  }
  if (props.items.length === 0) {
    return (
      <OperationalEmptyState
        title={
          props.hasActiveFilters ? 'Không có thông báo phù hợp bộ lọc' : 'Bạn chưa có thông báo nào'
        }
        description="Thông báo mới sẽ xuất hiện tại đây."
      />
    )
  }
  return (
    <>
      <ItemGroup data-slot="operational-list-body" className="gap-0 md:hidden">
        {props.items.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} {...props} />
        ))}
      </ItemGroup>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nội dung</TableHead>
              <TableHead className="w-48">Loại</TableHead>
              <TableHead className="w-44">Thời gian</TableHead>
              <TableHead className="w-16">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.items.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} {...props} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

interface NotificationRowProps {
  readonly notification: NotificationItem
  readonly pendingNotificationId: string | null
  readonly onMarkRead: (notification: NotificationItem) => void
  readonly onOpen: (notification: NotificationItem) => void
}

function NotificationRow({
  notification,
  pendingNotificationId,
  onMarkRead,
  onOpen,
}: NotificationRowProps) {
  const hasReference = Boolean(getNotificationReferenceRoute(notification))
  const cells = (
    <>
      <TableCell className="whitespace-normal">
        <div className="flex items-start gap-3">
          <ReadDot isRead={notification.isRead} />
          <div className="min-w-0">
            <NotificationTitle
              notification={notification}
              hasReference={hasReference}
              onOpen={onOpen}
            />
            <p className="text-muted-foreground mt-0.5 text-xs break-words whitespace-pre-line">
              {notification.message}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{TYPE_LABELS[notification.type]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatPlatformDateTime(notification.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          {!notification.isRead ? (
            <MarkReadButton
              notification={notification}
              isPending={pendingNotificationId === notification.id}
              onMarkRead={onMarkRead}
            />
          ) : null}
        </div>
      </TableCell>
    </>
  )
  return hasReference ? (
    <ClickableTableRow onActivate={() => onOpen(notification)}>{cells}</ClickableTableRow>
  ) : (
    <TableRow>{cells}</TableRow>
  )
}

function NotificationCard({
  notification,
  pendingNotificationId,
  onMarkRead,
  onOpen,
}: NotificationRowProps) {
  const hasReference = Boolean(getNotificationReferenceRoute(notification))
  return (
    <Item
      data-notification-item
      {...(hasReference
        ? rowActivationProps(() => onOpen(notification), 'border-b last:border-b-0')
        : { className: 'border-b last:border-b-0' })}
    >
      <ReadDot isRead={notification.isRead} />
      <ItemContent>
        <ItemTitle className="flex flex-wrap items-center gap-2">
          <span className={cn(!notification.isRead && 'font-semibold')}>{notification.title}</span>
          <Badge variant="outline">{TYPE_LABELS[notification.type]}</Badge>
        </ItemTitle>
        <ItemDescription className="whitespace-pre-line">{notification.message}</ItemDescription>
        <ItemDescription>{formatPlatformDateTime(notification.createdAt)}</ItemDescription>
      </ItemContent>
      {!notification.isRead ? (
        <MarkReadButton
          notification={notification}
          isPending={pendingNotificationId === notification.id}
          onMarkRead={onMarkRead}
        />
      ) : null}
    </Item>
  )
}

function NotificationTitle({
  notification,
  hasReference,
  onOpen,
}: {
  readonly notification: NotificationItem
  readonly hasReference: boolean
  readonly onOpen: (notification: NotificationItem) => void
}) {
  const className = cn('text-sm', !notification.isRead && 'font-semibold')
  if (!hasReference) return <span className={className}>{notification.title}</span>
  return (
    <button
      type="button"
      className={cn(className, 'cursor-pointer text-left hover:underline')}
      onClick={() => onOpen(notification)}
    >
      {notification.title}
    </button>
  )
}

function ReadDot({ isRead }: { readonly isRead: boolean }) {
  return (
    <span
      className={cn(
        'mt-1.5 size-2 shrink-0 rounded-full transition-colors duration-300',
        isRead ? 'bg-muted-foreground/30' : 'bg-primary'
      )}
      aria-label={isRead ? 'Đã đọc' : 'Chưa đọc'}
    />
  )
}

function MarkReadButton({
  notification,
  isPending,
  onMarkRead,
}: {
  readonly notification: NotificationItem
  readonly isPending: boolean
  readonly onMarkRead: (notification: NotificationItem) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Đánh dấu đã đọc: ${notification.title}`}
          disabled={isPending}
          onClick={() => onMarkRead(notification)}
        >
          <Check className="text-primary" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isPending ? 'Đang lưu…' : 'Đánh dấu đã đọc'}</TooltipContent>
    </Tooltip>
  )
}
