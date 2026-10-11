import { CalendarRange, Check, Eye, RefreshCw, Search, X } from 'lucide-react'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { dateToIsoDateString, formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import type { GoodsReceiptStatus, GoodsReceiptSummary } from '../../types/inbound.types'
import { INBOUND_STATUS_LABELS } from '../../utils/inbound-format'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import { InboundStatusBadge } from '../InboundWorkspace'
import {
  OperationalCellStack,
  OperationalQuantityProgress,
} from '@/components/operations/OperationalCells'
import { rowActivationProps } from '../../utils/row-activation-props'
import { TaskAssigneeCell } from '../TaskAssignment'

interface ReceiptDirectoryProps {
  readonly items: readonly GoodsReceiptSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: GoodsReceiptStatus | ''
  readonly createdFrom: string
  readonly createdTo: string
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly canApprove: boolean
  readonly isApproving: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: GoodsReceiptStatus | '') => void
  readonly onCreatedFromChange: (value: string) => void
  readonly onCreatedToChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onApprove: (item: GoodsReceiptSummary) => void
}

export function ReceiptDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  createdFrom,
  createdTo,
  isLoading,
  isFetching,
  isError,
  canApprove,
  isApproving,
  onSearchChange,
  onStatusChange,
  onCreatedFromChange,
  onCreatedToChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onApprove,
}: ReceiptDirectoryProps) {
  const router = useRouter()
  return (
    <OperationalListPanel aria-label="Danh sách phiếu nhận hàng">
      <div className="flex shrink-0 flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Danh sách phiếu nhận hàng</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-0 flex-1 sm:w-64">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Tìm phiếu nhận hàng"
              placeholder="Tìm mã phiếu, mã yêu cầu…"
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputGroup>
          <NativeSelect
            aria-label="Lọc trạng thái phiếu nhận hàng"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as GoodsReceiptStatus | '')}
          >
            <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
            {Object.entries(INBOUND_STATUS_LABELS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
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
        <OperationalErrorState title="Không thể tải phiếu nhận hàng" onRetry={onRetry} />
      ) : items.length === 0 ? (
        <OperationalEmptyState
          title="Chưa có phiếu nhận hàng phù hợp"
          description="Phiếu nhận hàng được lưu sẽ xuất hiện tại đây."
        />
      ) : (
        <>
          <ItemGroup data-slot="operational-list-body" className="gap-0 md:hidden">
            {items.map((item) => (
              <Item
                key={item.id}
                {...rowActivationProps(
                  () => router.push(APP_ROUTES.goodsReceiptDetail(item.id) as Route),
                  'border-b last:border-b-0'
                )}
              >
                <ItemContent>
                  <ItemTitle className="flex flex-wrap items-center gap-2">
                    <Link
                      href={APP_ROUTES.goodsReceiptDetail(item.id) as Route}
                      className="font-mono font-semibold hover:underline"
                    >
                      {item.receiptCode}
                    </Link>
                    <InboundStatusBadge status={item.status} />
                  </ItemTitle>
                  <ItemDescription>
                    {item.inboundRequestCode} · {item.warehouseName}
                  </ItemDescription>
                  <ItemDescription>
                    {item.lineCount} mặt hàng · Tạo lúc {formatOperationalDateTime(item.createdAt)}
                  </ItemDescription>
                  <ItemDescription>
                    Nhận {formatQuantity(item.receivedQuantity)} · Hỏng{' '}
                    {formatQuantity(item.damagedQuantity)} · Đã cất{' '}
                    {formatQuantity(item.putAwayQuantity)}
                  </ItemDescription>
                  {item.putAwayAssignedToName && (
                    <div className="mt-1">
                      <TaskAssigneeCell
                        assigneeName={item.putAwayAssignedToName}
                        executionStatus={item.putAwayExecutionStatus}
                      />
                    </div>
                  )}
                </ItemContent>
                {canApprove && item.status === 'PendingApproval' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isApproving}
                    onClick={() => onApprove(item)}
                  >
                    <Check aria-hidden="true" />
                    Xác nhận hàng đến
                  </Button>
                ) : null}
              </Item>
            ))}
          </ItemGroup>
          <div className="hidden min-h-0 flex-1 overflow-auto md:block">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="">Mã phiếu</TableHead>
                  <TableHead className="">Yêu cầu · Kho</TableHead>
                  <TableHead className="w-36">Trạng thái</TableHead>
                  <TableHead className="w-48">Đã cất / Đã nhận</TableHead>
                  <TableHead className="w-48">Người cất hàng</TableHead>
                  <TableHead className="w-40">Tạo bởi</TableHead>
                  <TableHead className="">
                    <span className="sr-only">Thao tác</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={APP_ROUTES.goodsReceiptDetail(item.id) as Route}
                  >
                    <TableCell>
                      <Link
                        href={APP_ROUTES.goodsReceiptDetail(item.id) as Route}
                        className="font-mono font-semibold hover:underline"
                      >
                        {item.receiptCode}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 text-xs">
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
                      <InboundStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <OperationalQuantityProgress
                        done={item.putAwayQuantity}
                        total={Math.max(0, item.receivedQuantity - item.damagedQuantity)}
                        doneText={formatQuantity(item.putAwayQuantity)}
                        totalText={formatQuantity(
                          Math.max(0, item.receivedQuantity - item.damagedQuantity)
                        )}
                        suffix={
                          item.damagedQuantity > 0
                            ? `· hỏng ${formatQuantity(item.damagedQuantity)}`
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell className="max-w-48">
                      <TaskAssigneeCell
                        assigneeName={item.putAwayAssignedToName}
                        assignedAt={item.putAwayAssignedAt}
                        executionStatus={item.putAwayExecutionStatus}
                      />
                    </TableCell>
                    <TableCell className="min-w-0">
                      <OperationalCellStack
                        primary={item.createdByName}
                        secondary={formatOperationalDateTime(item.createdAt)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canApprove && item.status === 'PendingApproval' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Xác nhận hàng đến ${item.receiptCode}`}
                                disabled={isApproving}
                                onClick={() => onApprove(item)}
                              >
                                <Check className="text-primary" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Xác nhận hàng đến</TooltipContent>
                          </Tooltip>
                        ) : null}
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link
                            href={APP_ROUTES.goodsReceiptDetail(item.id) as Route}
                            aria-label={`Xem ${item.receiptCode}`}
                          >
                            <Eye aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
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
