import {
  CalendarRange,
  PackagePlus,
  RefreshCw,
  Search,
  UserCheck,
  UserRoundCog,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import type { DateRange } from 'react-day-picker'
import Link from 'next/link'
import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { dateToIsoDateString, formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import type { ReceivingTask } from '../../types/inbound.types'
import { TaskAssigneeCell } from '../TaskAssignment'
import {
  OperationalCellStack,
  OperationalQuantityProgress,
} from '@/components/operations/OperationalCells'
import { rowActivationProps } from '../../utils/row-activation-props'
import {
  formatOperationalDate,
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'

interface ReceivingTaskDirectoryProps {
  readonly canViewRequest?: boolean
  readonly items: readonly ReceivingTask[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly createdFrom: string
  readonly createdTo: string
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onCreatedFromChange: (value: string) => void
  readonly onCreatedToChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onReceive: (task: ReceivingTask) => void
  readonly onImportDocument: (task: ReceivingTask) => void
  readonly onRetry: () => void
  readonly currentUserId: string | null
  readonly canAssign: boolean
  readonly assignmentFilter: ReceivingAssignmentFilter
  readonly onAssignmentFilterChange: (filter: ReceivingAssignmentFilter) => void
  readonly onAssign: (task: ReceivingTask) => void
}

export type ReceivingAssignmentFilter = 'all' | 'unassigned'

function buildDateLabel(from: Date | undefined, to: Date | undefined) {
  const f = from ? formatDisplayDate(from) : null
  const t = to ? formatDisplayDate(to) : null
  if (f && t) return `${f} – ${t}`
  if (f) return `Từ ${f}`
  if (t) return `Đến ${t}`
  return 'Khoảng ngày'
}

export function ReceivingTaskDirectory({
  canViewRequest,
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  createdFrom,
  createdTo,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onCreatedFromChange,
  onCreatedToChange,
  onPageChange,
  onPageSizeChange,
  onReceive,
  onImportDocument,
  onRetry,
  currentUserId,
  canAssign,
  assignmentFilter,
  onAssignmentFilterChange,
  onAssign,
}: ReceivingTaskDirectoryProps) {
  const router = useRouter()
  function renderActions(item: ReceivingTask, layout: 'row' | 'stack') {
    const isMine = Boolean(currentUserId) && item.assignedTo === currentUserId
    const receiptPendingApproval = item.activeGoodsReceiptStatus === 'PendingApproval'
    const receiptNeedsCorrection = item.activeGoodsReceiptStatus === 'InspectionCorrectionRequired'
    return (
      <div className={layout === 'row' ? 'flex justify-end gap-2' : 'flex shrink-0 flex-col gap-1'}>
        {canAssign && (
          <Button
            type="button"
            size="sm"
            variant={item.assignedTo ? 'outline' : 'default'}
            onClick={() => onAssign(item)}
          >
            {item.assignedTo ? (
              <UserRoundCog aria-hidden="true" />
            ) : (
              <UserCheck aria-hidden="true" />
            )}
            {item.assignedTo ? 'Giao lại' : 'Giao việc'}
          </Button>
        )}
        {isMine && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onImportDocument(item)}
            >
              {item.activeDocumentImportId ? 'Tiếp tục chứng từ' : 'Nhập từ chứng từ'}
            </Button>
            {!receiptPendingApproval && (
              <Button type="button" size="sm" onClick={() => onReceive(item)}>
                <PackagePlus aria-hidden="true" />
                {receiptNeedsCorrection
                  ? 'Sửa kiểm hàng'
                  : item.activeGoodsReceiptId
                    ? 'Mở phiếu nhập'
                    : 'Nhập thủ công'}
              </Button>
            )}
            {receiptPendingApproval && (
              <span className="text-muted-foreground text-xs">Phiếu nhập đang chờ duyệt</span>
            )}
          </>
        )}
        {!canAssign && !isMine && (
          <span className="text-muted-foreground text-xs">Chờ quản lý giao việc</span>
        )}
      </div>
    )
  }

  return (
    <OperationalListPanel aria-label="Đơn chờ nhận hàng">
      <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Đơn chờ nhận hàng</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAssign && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={assignmentFilter}
              onValueChange={(value) =>
                value && onAssignmentFilterChange(value as ReceivingAssignmentFilter)
              }
              aria-label="Lọc theo phân công"
            >
              <ToggleGroupItem value="all">Tất cả</ToggleGroupItem>
              <ToggleGroupItem value="unassigned">Chưa giao</ToggleGroupItem>
            </ToggleGroup>
          )}
          {(() => {
            const hasDate = Boolean(createdFrom || createdTo)
            const dateRange: DateRange = {
              from: isoDateStringToDate(createdFrom),
              to: isoDateStringToDate(createdTo),
            }
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={hasDate ? 'default' : 'outline'}
                    size="sm"
                    className="h-8"
                    aria-label="Lọc theo khoảng ngày tạo"
                  >
                    <CalendarRange aria-hidden="true" />
                    {buildDateLabel(dateRange.from, dateRange.to)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="border-b p-3">
                    <PopoverTitle>Khoảng ngày tạo</PopoverTitle>
                  </div>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      onCreatedFromChange(range?.from ? dateToIsoDateString(range.from) : '')
                      onCreatedToChange(range?.to ? dateToIsoDateString(range.to) : '')
                    }}
                    numberOfMonths={1}
                  />
                  {hasDate ? (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onCreatedFromChange('')
                          onCreatedToChange('')
                        }}
                      >
                        <X aria-hidden="true" />
                        Xoá lọc ngày
                      </Button>
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
            )
          })()}
          <InputGroup className="min-w-0 flex-1 sm:w-72">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Tìm đơn chờ nhận"
              placeholder="Tìm mã yêu cầu, nhà cung cấp…"
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Tải lại"
                onClick={onRetry}
              >
                <RefreshCw
                  className={cn('text-primary', isFetching && 'animate-spin')}
                  aria-hidden="true"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tải lại</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {isLoading ? (
        <OperationalLoadingState />
      ) : isError ? (
        <OperationalErrorState title="Không thể tải danh sách chờ nhận" onRetry={onRetry} />
      ) : items.length === 0 ? (
        <OperationalEmptyState
          title="Không có đơn chờ nhận"
          description={
            canAssign
              ? assignmentFilter === 'unassigned'
                ? 'Mọi đơn chờ nhận đều đã được giao cho nhân viên.'
                : 'Các yêu cầu nhập kho đã duyệt và còn số lượng sẽ xuất hiện tại đây.'
              : 'Các đơn nhận hàng được quản lý giao cho bạn sẽ xuất hiện tại đây.'
          }
        />
      ) : (
        <>
          <ItemGroup data-slot="operational-list-body" className="gap-0 md:hidden">
            {items.map((item) => (
              <Item
                key={item.inboundRequestId}
                {...rowActivationProps(
                  () =>
                    router.push(APP_ROUTES.inboundRequestDetail(item.inboundRequestId) as Route),
                  'border-b last:border-b-0'
                )}
              >
                <ItemContent>
                  <ItemTitle className="font-mono" translate="no">
                    {canViewRequest ? (
                      <Link
                        href={APP_ROUTES.inboundRequestDetail(item.inboundRequestId) as Route}
                        className="text-primary font-semibold hover:underline"
                      >
                        {item.inboundRequestCode}
                      </Link>
                    ) : (
                      item.inboundRequestCode
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    {item.supplierName} · {item.warehouseName}
                  </ItemDescription>
                  <ItemDescription>
                    {item.lines.length} mặt hàng · Tạo lúc{' '}
                    {formatOperationalDateTime(item.createdAt)}
                  </ItemDescription>
                  <ItemDescription>
                    {formatQuantity(item.remainingQuantity)} còn nhận ·{' '}
                    {formatOperationalDate(item.expectedDate)}
                  </ItemDescription>
                  {item.activeGoodsReceiptStatus === 'PendingApproval' && (
                    <ItemDescription className="text-warning">Phiếu chờ duyệt</ItemDescription>
                  )}
                  {item.activeGoodsReceiptStatus === 'InspectionCorrectionRequired' && (
                    <ItemDescription className="text-destructive">
                      Cần sửa kiểm hàng
                    </ItemDescription>
                  )}
                  <div className="mt-1">
                    <TaskAssigneeCell
                      assigneeName={item.assignedToName}
                      executionStatus={item.executionStatus}
                      isCurrentUser={Boolean(currentUserId) && item.assignedTo === currentUserId}
                    />
                  </div>
                </ItemContent>
                {renderActions(item, 'stack')}
              </Item>
            ))}
          </ItemGroup>
          <div className="hidden min-h-0 flex-1 overflow-auto md:block">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="">Mã yêu cầu</TableHead>
                  <TableHead className="">Nhà cung cấp · Kho nhận</TableHead>
                  <TableHead className="w-44">Đã nhận / Yêu cầu</TableHead>
                  <TableHead className="w-40">Thời gian</TableHead>
                  <TableHead className="w-48">Người nhận việc</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <ClickableTableRow
                    key={item.inboundRequestId}
                    href={APP_ROUTES.inboundRequestDetail(item.inboundRequestId) as Route}
                  >
                    <TableCell className="font-mono font-semibold" translate="no">
                      {canViewRequest ? (
                        <Link
                          href={APP_ROUTES.inboundRequestDetail(item.inboundRequestId) as Route}
                          className="text-primary hover:underline"
                        >
                          {item.inboundRequestCode}
                        </Link>
                      ) : (
                        item.inboundRequestCode
                      )}
                      {item.activeGoodsReceiptStatus === 'PendingApproval' && (
                        <p className="text-warning mt-0.5 text-xs font-normal">Phiếu chờ duyệt</p>
                      )}
                      {item.activeGoodsReceiptStatus === 'Draft' && (
                        <p className="text-muted-foreground mt-0.5 text-xs font-normal">
                          Đang nhập phiếu
                        </p>
                      )}
                      {item.activeGoodsReceiptStatus === 'InspectionCorrectionRequired' && (
                        <p className="text-destructive mt-0.5 text-xs font-normal">
                          Cần sửa kiểm hàng
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-0">
                      <OperationalCellStack
                        primary={item.supplierName}
                        secondary={`${item.warehouseName} · ${item.lines.length} mặt hàng`}
                      />
                    </TableCell>
                    <TableCell>
                      <OperationalQuantityProgress
                        done={item.receivedQuantity}
                        total={item.orderedQuantity}
                        doneText={formatQuantity(item.receivedQuantity)}
                        totalText={formatQuantity(item.orderedQuantity)}
                      />
                    </TableCell>
                    <TableCell>
                      <OperationalCellStack
                        primary={formatOperationalDateTime(item.createdAt)}
                        secondary={`Dự kiến ${formatOperationalDate(item.expectedDate)}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-48">
                      <TaskAssigneeCell
                        assigneeName={item.assignedToName}
                        assignedAt={item.assignedAt}
                        executionStatus={item.executionStatus}
                        isCurrentUser={Boolean(currentUserId) && item.assignedTo === currentUserId}
                      />
                    </TableCell>
                    <TableCell className="text-right">{renderActions(item, 'row')}</TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
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
  )
}
