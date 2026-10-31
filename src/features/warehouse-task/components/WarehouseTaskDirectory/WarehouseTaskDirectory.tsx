'use client'

import {
  Activity,
  AlarmClock,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  ClipboardList,
  PackageOpen,
  PackageSearch,
  PackagePlus,
  PackageX,
  PauseCircle,
  Play,
  Truck,
  RefreshCw,
  Undo2,
  UserRoundX,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { MyWarehouseTask, WarehouseTaskStats } from '../../types/warehouse-task.types'
import { TaskDeadlineBadge } from './TaskDeadlineBadge'

interface WarehouseTaskDirectoryProps {
  readonly title: string
  readonly description: string
  readonly items: readonly MyWarehouseTask[]
  readonly totalCount: number
  readonly stats: WarehouseTaskStats
  readonly statsMode: 'managed' | 'mine'
  readonly showStats?: boolean
  readonly page: number
  readonly pageSize: number
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly canManage?: boolean
  readonly isActionPending?: boolean
  readonly currentUserId?: string
  readonly headerAction?: ReactNode
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onPageChange: (page: number) => void
  readonly exportAction?: ReactNode
  readonly onRetry: () => void
  readonly onAction?: (task: MyWarehouseTask, action: 'Start' | 'Pause' | 'Return') => void
  readonly onOpenRelocation?: (task: MyWarehouseTask) => void
  readonly onEditSchedule?: (task: MyWarehouseTask) => void
}

const executionLabel: Record<MyWarehouseTask['executionStatus'], string> = {
  Queued: 'Chờ bắt đầu',
  InProgress: 'Đang làm',
  Paused: 'Tạm dừng',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
}

export const taskTypeLabel: Record<MyWarehouseTask['taskType'], string> = {
  Receiving: 'Nhận hàng',
  PutAway: 'Cất hàng',
  CycleCount: 'Kiểm kê',
  DamagedStock: 'Hàng hỏng',
  Relocation: 'Điều chuyển vị trí',
  TransferPick: 'Lấy hàng điều chuyển',
  TransferReceive: 'Nhận hàng điều chuyển',
  TransferPutAway: 'Cất hàng điều chuyển',
  Picking: 'Lấy hàng xuất kho',
  CustomerReturnReceive: 'Nhận hàng khách trả',
  SupplierReturnDispatch: 'Giao trả nhà cung cấp',
}

export const taskTypeIcon: Record<MyWarehouseTask['taskType'], LucideIcon> = {
  Receiving: PackageOpen,
  PutAway: PackagePlus,
  CycleCount: ClipboardCheck,
  DamagedStock: PackageX,
  Relocation: ArrowLeftRight,
  TransferPick: Truck,
  TransferReceive: PackageOpen,
  TransferPutAway: PackagePlus,
  Picking: PackageSearch,
  CustomerReturnReceive: PackageSearch,
  SupplierReturnDispatch: PackageSearch,
}

const HEAD = 'bg-card'
// Mỗi dòng hiện trễ hơn dòng trước một nhịp; dừng tăng sau 12 dòng để trang dài không phải chờ.
const rowDelay = (index: number) => ({ animationDelay: `${Math.min(index, 12) * 35}ms` })
const ROW_ENTER =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 fill-mode-backwards animation-duration-300'

const updatedFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function WarehouseTaskDirectory({
  title,
  description,
  items,
  totalCount,
  stats,
  statsMode,
  showStats = true,
  page,
  pageSize,
  isLoading,
  isFetching,
  isError,
  canManage = false,
  isActionPending = false,
  currentUserId,
  headerAction,
  onPageChange,
  onPageSizeChange,
  onRetry,
  exportAction,
  onAction,
  onOpenRelocation,
  onEditSchedule,
}: WarehouseTaskDirectoryProps) {
  const router = useRouter()
  // Danh sách của chính mình thì người phụ trách luôn là mình; chỉ quản lý mới cần cột này.
  const showAssignee = statsMode === 'managed'

  function openTask(item: MyWarehouseTask) {
    if (
      showAssignee &&
      item.sourceDocumentId &&
      (item.taskType === 'CustomerReturnReceive' || item.taskType === 'SupplierReturnDispatch')
    ) {
      router.push(
        (item.taskType === 'SupplierReturnDispatch'
          ? APP_ROUTES.supplierReturnDetail(item.sourceDocumentId)
          : APP_ROUTES.goodsReturnRequestDetail(item.sourceDocumentId)) as Route
      )
      return
    }
    if (item.taskType === 'Relocation') {
      onOpenRelocation?.(item)
      return
    }
    router.push(getTaskRoute(item))
  }

  function renderActions(item: MyWarehouseTask) {
    if (
      !canManage ||
      !onAction ||
      item.taskType === 'DamagedStock' ||
      item.assignedTo !== currentUserId
    )
      return null
    const returnTask =
      item.taskType === 'CustomerReturnReceive' || item.taskType === 'SupplierReturnDispatch'
    if (item.taskType === 'Picking' || returnTask) {
      return (
        <Button asChild size="sm" variant="outline">
          <Link href={getTaskRoute(item)}>
            {returnTask
              ? 'Mở nhiệm vụ'
              : item.executionStatus === 'InProgress'
                ? 'Tiếp tục lấy hàng'
                : 'Lấy hàng'}
          </Link>
        </Button>
      )
    }
    const isInProgress = item.executionStatus === 'InProgress'
    return (
      <>
        {!isInProgress && (
          <Button
            size="sm"
            disabled={isActionPending}
            onClick={(event) => {
              event.stopPropagation()
              onAction(item, 'Start')
            }}
          >
            <Play aria-hidden="true" data-icon="inline-start" />
            {item.executionStatus === 'Paused' ? 'Tiếp tục' : 'Bắt đầu'}
          </Button>
        )}
        {isInProgress && (
          <Button
            size="sm"
            variant="outline"
            disabled={isActionPending}
            onClick={(event) => {
              event.stopPropagation()
              onAction(item, 'Pause')
            }}
          >
            <PauseCircle aria-hidden="true" data-icon="inline-start" />
            Tạm dừng
          </Button>
        )}
        {!isInProgress && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isActionPending}
            className="text-muted-foreground"
            onClick={(event) => {
              event.stopPropagation()
              onAction(item, 'Return')
            }}
          >
            <Undo2 aria-hidden="true" data-icon="inline-start" />
            Trả lại
          </Button>
        )}
      </>
    )
  }

  function renderScheduleButton(item: MyWarehouseTask) {
    if (!onEditSchedule) return null
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={(event) => {
          event.stopPropagation()
          onEditSchedule(item)
        }}
        aria-label={`Điều chỉnh hạn ${item.referenceCode}`}
      >
        <CalendarClock aria-hidden="true" />
      </Button>
    )
  }

  return (
    <div className="flex h-full min-h-72 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="flex w-full items-start justify-end gap-2 sm:w-auto sm:items-center">
          {headerAction}
          <div className="flex shrink-0 items-center gap-2">
            {exportAction}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Tải lại"
              onClick={onRetry}
            >
              <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      {showStats ? (
        <dl className="bg-border grid shrink-0 grid-cols-2 gap-px border sm:grid-cols-3 lg:grid-cols-5 sm:max-lg:[&>:last-child:nth-child(3n+2)]:col-span-2 max-sm:[&>:last-child:nth-child(odd)]:col-span-2">
          <TaskMetric
            index={0}
            icon={statsMode === 'managed' ? UserRoundX : ClipboardList}
            label={statsMode === 'managed' ? 'Chưa giao' : 'Chờ bắt đầu'}
            value={statsMode === 'managed' ? stats.unassignedCount : stats.queuedCount}
          />
          <TaskMetric
            index={1}
            icon={Activity}
            label="Đang làm"
            value={stats.inProgressCount}
            tone="active"
          />
          <TaskMetric index={2} icon={PauseCircle} label="Tạm dừng" value={stats.pausedCount} />
          <TaskMetric
            index={3}
            icon={AlarmClock}
            label="Sắp đến hạn"
            value={stats.dueSoonCount}
            tone="warning"
          />
          <TaskMetric
            index={4}
            icon={AlarmClock}
            label="Quá hạn"
            value={stats.overdueCount}
            tone="danger"
          />
        </dl>
      ) : null}
      <OperationalListPanel
        aria-label={title}
        className="max-md:[&>[data-slot=table-container]]:hidden"
      >
        {isLoading ? (
          <OperationalLoadingState />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải công việc" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có công việc"
            description="Các nhiệm vụ được giao cho bạn sẽ xuất hiện tại đây."
          />
        ) : (
          <>
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Công việc</TableHead>
                  {showAssignee ? <TableHead className={HEAD}>Người phụ trách</TableHead> : null}
                  <TableHead className={HEAD}>Trạng thái</TableHead>
                  <TableHead className={cn(HEAD, 'w-44')}>Tiến độ</TableHead>
                  <TableHead className={HEAD}>Hạn hoàn thành</TableHead>
                  <TableHead className={cn(HEAD, 'text-right')}>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow
                    key={`${item.taskType}-${item.id}`}
                    role="link"
                    tabIndex={0}
                    aria-label={`Mở công việc ${item.referenceCode}`}
                    style={rowDelay(index)}
                    className={cn(
                      'group hover:bg-muted/60 cursor-pointer align-top transition-colors motion-reduce:transition-none',
                      ROW_ENTER
                    )}
                    onClick={() => openTask(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') openTask(item)
                    }}
                  >
                    <TableCell>
                      <TaskIdentity task={item} />
                    </TableCell>
                    {showAssignee ? (
                      <TableCell className="text-sm">
                        {item.assignedToName ?? (
                          <span className="text-muted-foreground">Chưa giao</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <TaskStatus task={item} />
                    </TableCell>
                    <TableCell>
                      <TaskProgress task={item} />
                    </TableCell>
                    <TableCell>
                      <TaskDeadlineBadge task={item} />
                      <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                        Cập nhật {updatedFormat.format(new Date(item.updatedAt))}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        {renderActions(item)}
                        {renderScheduleButton(item)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div
              data-slot="operational-list-body"
              className="min-h-0 flex-1 divide-y overflow-auto md:hidden"
            >
              {items.map((item, index) => (
                <div
                  key={`${item.taskType}-${item.id}`}
                  role="link"
                  tabIndex={0}
                  aria-label={`Mở công việc ${item.referenceCode}`}
                  style={rowDelay(index)}
                  className={cn(
                    'hover:bg-muted/60 flex cursor-pointer flex-col gap-3 p-3 transition-colors motion-reduce:transition-none',
                    ROW_ENTER
                  )}
                  onClick={() => openTask(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openTask(item)
                  }}
                >
                  <TaskIdentity task={item} />
                  <TaskStatus task={item} />
                  <TaskProgress task={item} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TaskDeadlineBadge task={item} />
                    <div className="flex items-center gap-1">
                      {renderActions(item)}
                      {renderScheduleButton(item)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              isPending={isFetching}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </OperationalListPanel>
    </div>
  )
}

/** Loại việc, tóm tắt, mã tham chiếu và kho gộp vào một ô để bảng không phải cuộn ngang. */
function TaskIdentity({ task }: { readonly task: MyWarehouseTask }) {
  const Icon = taskTypeIcon[task.taskType] ?? ClipboardList
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center transition-transform motion-safe:group-hover:scale-105">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {task.isCombinedTransferReceipt
            ? 'Nhận và cất hàng điều chuyển'
            : (taskTypeLabel[task.taskType] ?? task.taskType)}
          <span className="text-muted-foreground font-normal"> · {task.workSummary}</span>
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          <span className="text-foreground font-mono">{task.referenceCode}</span> ·{' '}
          {task.warehouseName}
        </p>
      </div>
    </div>
  )
}

function TaskStatus({ task }: { readonly task: MyWarehouseTask }) {
  const status = task.executionStatus
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <Badge
          variant={
            status === 'InProgress' ? 'default' : status === 'Completed' ? 'secondary' : 'outline'
          }
          className={cn(
            'gap-1.5',
            status === 'Paused' && 'border-warning text-warning',
            status === 'Cancelled' && 'text-muted-foreground'
          )}
        >
          {status === 'InProgress' ? (
            <span className="bg-primary-foreground size-1.5 rounded-full motion-safe:animate-pulse" />
          ) : status === 'Paused' ? (
            <PauseCircle aria-hidden="true" className="size-3" />
          ) : status === 'Completed' ? (
            <CheckCircle2 aria-hidden="true" className="size-3" />
          ) : status === 'Cancelled' ? (
            <XCircle aria-hidden="true" className="size-3" />
          ) : (
            <CircleDashed aria-hidden="true" className="size-3" />
          )}
          {executionLabel[status] ?? status}
        </Badge>
        {task.priority === 'Urgent' ? <Badge variant="destructive">Khẩn</Badge> : null}
      </div>
      {task.pauseReason && status === 'Paused' ? (
        // Ghi chú do người dùng tự nhập: giới hạn hai dòng, phần còn lại xem ở tooltip.
        <p
          className="border-warning/60 text-muted-foreground max-w-56 border-l-2 pl-2 text-xs"
          title={task.pauseReason}
        >
          <span className="sr-only">Lý do tạm dừng: </span>
          <span className="line-clamp-2 break-words italic">{task.pauseReason}</span>
        </p>
      ) : null}
    </div>
  )
}

function TaskProgress({ task }: { readonly task: MyWarehouseTask }) {
  return (
    <div className="flex min-w-32 flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs tabular-nums">
        <span className="text-muted-foreground">
          {task.completedItemCount}/{task.itemCount} dòng
        </span>
        <span className="font-medium">{task.progressPercentage}%</span>
      </div>
      <Progress
        value={task.progressPercentage}
        className="h-1.5 transition-all motion-reduce:transition-none"
      />
    </div>
  )
}

function TaskMetric({
  index,
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  readonly index: number
  readonly icon: LucideIcon
  readonly label: string
  readonly value: number
  readonly tone?: 'default' | 'active' | 'warning' | 'danger'
}) {
  // Màu cảnh báo chỉ bật khi thực sự có việc cần chú ý, để số 0 không gây báo động giả.
  const highlighted = value > 0
  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className="bg-card motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 fill-mode-backwards animation-duration-300 flex items-center gap-3 px-4 py-3"
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center',
          tone === 'danger' && highlighted
            ? 'bg-destructive/10 text-destructive'
            : tone === 'warning' && highlighted
              ? 'bg-warning-container text-on-warning-container'
              : tone === 'active' && highlighted
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-muted-foreground truncate text-xs">{label}</dt>
        <dd
          className={cn(
            'text-xl leading-tight font-semibold tabular-nums',
            tone === 'danger' && highlighted && 'text-destructive'
          )}
        >
          {value.toLocaleString('vi-VN')}
        </dd>
      </div>
    </div>
  )
}

export function getTaskRoute(task: MyWarehouseTask): Route {
  if (task.taskType === 'CustomerReturnReceive')
    return APP_ROUTES.customerReturnTask(task.id) as Route
  if (task.taskType === 'SupplierReturnDispatch')
    return APP_ROUTES.supplierReturnTask(task.id) as Route
  if (task.taskType === 'PutAway') return APP_ROUTES.inboundPutawayDetail(task.id) as Route
  if (task.taskType === 'CycleCount') return APP_ROUTES.cycleCountDetail(task.id)
  if (task.taskType === 'DamagedStock') return APP_ROUTES.stockAdjustmentDetail(task.id)
  if (
    task.taskType === 'TransferPick' ||
    task.taskType === 'TransferReceive' ||
    task.taskType === 'TransferPutAway'
  ) {
    if (!task.transferId) return APP_ROUTES.transfers as Route
    if (!task.transferShipmentId) return APP_ROUTES.transferDetail(task.transferId)
    if (task.taskType === 'TransferPutAway')
      return APP_ROUTES.transferPutAwayTask(task.transferId, task.transferShipmentId)
    return task.taskType === 'TransferPick'
      ? APP_ROUTES.transferPickTask(task.transferId, task.transferShipmentId)
      : APP_ROUTES.transferReceiveTask(task.transferId, task.transferShipmentId)
  }
  if (task.taskType === 'Picking') return APP_ROUTES.stockIssueRequestDetail(task.id) as Route
  // Mở màn nhận hàng đã lọc sẵn theo mã yêu cầu nhập kho được giao.
  return `${APP_ROUTES.inbound}?search=${encodeURIComponent(task.referenceCode)}` as Route
}
