import {
  ArrowRight,
  CalendarRange,
  Eye,
  PackageCheck,
  RefreshCw,
  Search,
  UserCheck,
  UserRoundCog,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import type { Route } from 'next'
import Link from 'next/link'
import type { DateRange } from 'react-day-picker'
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
import { APP_ROUTES } from '@/routes/app-routes'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptSummary } from '../../types/inbound.types'
import { TaskAssigneeCell } from '../TaskAssignment'
import {
  OperationalCellStack,
  OperationalQuantityProgress,
} from '@/components/operations/OperationalCells'
import { rowActivationProps } from '../../utils/row-activation-props'

export type PutawayAssignmentFilter = 'all' | 'unassigned'

interface PutawayDirectoryProps {
  readonly items: readonly GoodsReceiptSummary[]
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
  readonly onRetry: () => void
  readonly currentUserId: string | null
  readonly canAssign: boolean
  readonly assignmentFilter: PutawayAssignmentFilter
  readonly onAssignmentFilterChange: (filter: PutawayAssignmentFilter) => void
  readonly onAssign: (receipt: GoodsReceiptSummary) => void
}

function remainingQuantity(item: GoodsReceiptSummary) {
  return Math.max(0, item.receivedQuantity - item.damagedQuantity - item.putAwayQuantity)
}

export function PutawayDirectory({
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
  onRetry,
  currentUserId,
  canAssign,
  assignmentFilter,
  onAssignmentFilterChange,
  onAssign,
}: PutawayDirectoryProps) {
  const router = useRouter()
  function renderActions(item: GoodsReceiptSummary, compact: boolean) {
    const isMine = Boolean(currentUserId) && item.putAwayAssignedTo === currentUserId
    return (
      <div className={compact ? 'flex shrink-0 flex-col gap-1' : 'flex justify-end gap-2'}>
        {canAssign && (
          <Button
            type="button"
            size="sm"
            variant={item.putAwayAssignedTo ? 'outline' : 'default'}
            onClick={() => onAssign(item)}
          >
            {item.putAwayAssignedTo ? (
              <UserRoundCog aria-hidden="true" />
            ) : (
              <UserCheck aria-hidden="true" />
            )}
            {item.putAwayAssignedTo ? 'Giao lại' : 'Giao việc'}
          </Button>
        )}
        {isMine ? (
          <Button asChild size="sm">
            <Link
              href={APP_ROUTES.inboundPutawayDetail(item.id) as Route}
              aria-label={`Cất hàng ${item.receiptCode}`}
            >
              Cất hàng
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : canAssign ? (
          <Button asChild size="sm" variant="ghost">
            <Link
              href={APP_ROUTES.inboundPutawayDetail(item.id) as Route}
              aria-label={`Xem tiến độ cất hàng ${item.receiptCode}`}
            >
              <Eye aria-hidden="true" />
              Xem
            </Link>
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">Chờ quản lý giao việc</span>
        )}
      </div>
    )
  }

  return (
    <OperationalListPanel aria-label="Danh sách chờ cất hàng">
      <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Phiếu chờ cất hàng</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAssign && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={assignmentFilter}
              onValueChange={(value) =>
                value && onAssignmentFilterChange(value as PutawayAssignmentFilter)
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
            const f = dateRange.from ? formatDisplayDate(dateRange.from) : null
            const t = dateRange.to ? formatDisplayDate(dateRange.to) : null
            const label = f && t ? `${f} – ${t}` : f ? `Từ ${f}` : t ? `Đến ${t}` : 'Khoảng ngày'
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={hasDate ? 'default' : 'outline'}
                    size="sm"
                    aria-label="Lọc theo khoảng ngày tạo"
                  >
                    <CalendarRange aria-hidden="true" />
                    {label}
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
              aria-label="Tìm phiếu chờ cất"
              placeholder="Tìm mã phiếu, mã yêu cầu…"
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
        <OperationalErrorState title="Không thể tải danh sách chờ cất" onRetry={onRetry} />
      ) : items.length === 0 ? (
        <OperationalEmptyState
          title="Không có hàng chờ cất"
          description={
            canAssign
              ? assignmentFilter === 'unassigned'
                ? 'Mọi phiếu chờ cất đều đã được giao cho nhân viên.'
                : 'Phiếu đã duyệt và còn hàng khả dụng sẽ xuất hiện tại đây.'
              : 'Các phiếu cất hàng được quản lý giao cho bạn sẽ xuất hiện tại đây.'
          }
        />
      ) : (
        <>
          <ItemGroup data-slot="operational-list-body" className="gap-0 md:hidden">
            {items.map((item) => (
              <Item
                key={item.id}
                {...rowActivationProps(
                  () => router.push(APP_ROUTES.inboundPutawayDetail(item.id) as Route),
                  'border-b last:border-b-0'
                )}
              >
                <PackageCheck aria-hidden="true" />
                <ItemContent>
                  <ItemTitle className="font-mono">
                    <Link
                      href={APP_ROUTES.inboundPutawayDetail(item.id) as Route}
                      className="text-primary font-semibold hover:underline"
                    >
                      {item.receiptCode}
                    </Link>
                  </ItemTitle>
                  <ItemDescription>
                    {item.inboundRequestCode} · {item.warehouseName}
                  </ItemDescription>
                  <ItemDescription>
                    {item.lineCount} mặt hàng · Tạo lúc {formatOperationalDateTime(item.createdAt)}
                  </ItemDescription>
                  <ItemDescription>
                    {formatQuantity(remainingQuantity(item))} còn cất
                  </ItemDescription>
                  <div className="mt-1">
                    <TaskAssigneeCell
                      assigneeName={item.putAwayAssignedToName}
                      assignedAt={item.putAwayAssignedAt}
                      executionStatus={item.putAwayExecutionStatus}
                      isCurrentUser={
                        Boolean(currentUserId) && item.putAwayAssignedTo === currentUserId
                      }
                    />
                  </div>
                </ItemContent>
                {renderActions(item, true)}
              </Item>
            ))}
          </ItemGroup>
          <div className="hidden min-h-0 flex-1 overflow-auto md:block">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="">Mã phiếu</TableHead>
                  <TableHead className="">Yêu cầu · Kho</TableHead>
                  <TableHead className="w-48">Đã cất / Cần cất</TableHead>
                  <TableHead className="w-40">Ngày tạo</TableHead>
                  <TableHead className="w-48">Người cất hàng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={APP_ROUTES.inboundPutawayDetail(item.id) as Route}
                  >
                    <TableCell className="font-mono font-semibold">
                      <Link
                        href={APP_ROUTES.inboundPutawayDetail(item.id) as Route}
                        className="text-primary hover:underline"
                      >
                        {item.receiptCode}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 font-sans text-xs font-normal">
                        {item.lineCount} mặt hàng
                      </p>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <OperationalCellStack
                        primary={<span className="font-mono">{item.inboundRequestCode}</span>}
                        secondary={item.warehouseName}
                      />
                    </TableCell>
                    <TableCell>
                      <OperationalQuantityProgress
                        done={item.putAwayQuantity}
                        total={Math.max(0, item.receivedQuantity - item.damagedQuantity)}
                        doneText={formatQuantity(item.putAwayQuantity)}
                        totalText={formatQuantity(
                          Math.max(0, item.receivedQuantity - item.damagedQuantity)
                        )}
                        suffix={`· còn ${formatQuantity(remainingQuantity(item))}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatOperationalDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-48">
                      <TaskAssigneeCell
                        assigneeName={item.putAwayAssignedToName}
                        assignedAt={item.putAwayAssignedAt}
                        executionStatus={item.putAwayExecutionStatus}
                        isCurrentUser={
                          Boolean(currentUserId) && item.putAwayAssignedTo === currentUserId
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">{renderActions(item, false)}</TableCell>
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
