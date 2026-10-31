'use client'

import { useState } from 'react'
import { CalendarRange, CheckCheck, RefreshCw, Search, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { dateToIsoDateString, formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import type { NotificationType } from '../../types/platform-services.types'
import type { NotificationFilterValues } from './types'

const TYPE_LABELS: Record<NotificationType, string> = {
  LowStock: 'Tồn kho thấp',
  TaskAssigned: 'Nhiệm vụ',
  InboundRequestUpdate: 'Yêu cầu nhập kho',
  TenantStatusUpdate: 'Trạng thái tenant',
  SubscriptionPlanUpdate: 'Gói đăng ký',
  SubscriptionPaymentUpdate: 'Thanh toán gói',
  GoodsReceiptUpdate: 'Phiếu nhận hàng',
  StockAdjustmentUpdate: 'Điều chỉnh tồn',
  TransferUpdate: 'Điều chuyển kho',
  StockIssueRequestUpdate: 'Yêu cầu xuất kho',
  GoodsReturnRequestUpdate: 'Yêu cầu trả hàng',
  CycleCountUpdate: 'Kiểm kê',
  WarehouseUpdate: 'Kho hàng',
  StaffInvitationUpdate: 'Nhân sự',
  SessionRevoked: 'Phiên đăng nhập',
  InventoryUpdate: 'Tồn kho',
  OpeningStockUpdate: 'Tồn đầu kỳ',
  DamageCaseUpdate: 'Hàng hỏng',
  StockDiscrepancyUpdate: 'Chênh lệch tồn kho',
  InboundArrivalUpcoming: 'Hàng sắp về',
  SupplierReturnUpdate: 'Trả hàng NCC',
  DailyOperationsDigest: 'Tóm tắt đầu ngày',
}

interface NotificationFiltersProps {
  readonly filters: NotificationFilterValues
  readonly isFetching: boolean
  readonly onApply: (filters: NotificationFilterValues) => void
  readonly onClear: () => void
  readonly onRetry: () => void
  readonly unreadCount: number | null
  readonly isMarkingAll: boolean
  readonly onMarkAllRead: () => void
}

export function NotificationFilters({
  filters,
  isFetching,
  onApply,
  onClear,
  onRetry,
  unreadCount,
  isMarkingAll,
  onMarkAllRead,
}: NotificationFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)

  const hasDateFilter = Boolean(filters.dateFrom || filters.dateTo)
  const hasActiveFilters =
    Boolean(localSearch) || Boolean(filters.type) || filters.readState !== 'all' || hasDateFilter

  const dateRange: DateRange = {
    from: isoDateStringToDate(filters.dateFrom),
    to: isoDateStringToDate(filters.dateTo),
  }

  function handleDateRangeSelect(range: DateRange | undefined) {
    onApply({
      ...filters,
      dateFrom: range?.from ? dateToIsoDateString(range.from) : '',
      dateTo: range?.to ? dateToIsoDateString(range.to) : '',
    })
  }

  function buildDateLabel() {
    const from = dateRange.from ? formatDisplayDate(dateRange.from) : null
    const to = dateRange.to ? formatDisplayDate(dateRange.to) : null
    if (from && to) return `${from} – ${to}`
    if (from) return `Từ ${from}`
    if (to) return `Đến ${to}`
    return 'Khoảng ngày'
  }

  function commitSearch() {
    if (localSearch !== filters.search) {
      onApply({ ...filters, search: localSearch })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="min-w-0 flex-1 basis-full sm:w-72 sm:flex-none sm:basis-auto">
        <InputGroupAddon>
          <Search className="text-primary" aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Tìm thông báo"
          placeholder="Tìm thông báo…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onBlur={commitSearch}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch()
          }}
        />
      </InputGroup>

      <NativeSelect
        aria-label="Lọc theo loại"
        value={filters.type || 'all'}
        onChange={(e) =>
          onApply({ ...filters, type: e.target.value === 'all' ? '' : e.target.value })
        }
      >
        <NativeSelectOption value="all">Tất cả loại</NativeSelectOption>
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        aria-label="Lọc theo trạng thái đọc"
        value={filters.readState}
        onChange={(e) => onApply({ ...filters, readState: e.target.value })}
      >
        <NativeSelectOption value="all">Tất cả</NativeSelectOption>
        <NativeSelectOption value="unread">Chưa đọc</NativeSelectOption>
        <NativeSelectOption value="read">Đã đọc</NativeSelectOption>
      </NativeSelect>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={hasDateFilter ? 'default' : 'outline'}
            size="sm"
            aria-label="Lọc theo khoảng ngày"
          >
            <CalendarRange aria-hidden="true" />
            {buildDateLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="border-b p-3">
            <PopoverTitle>Khoảng ngày thông báo</PopoverTitle>
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={1}
          />
          {hasDateFilter ? (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onApply({ ...filters, dateFrom: '', dateTo: '' })}
              >
                <X aria-hidden="true" />
                Xoá lọc ngày
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden="true" />
          Xóa lọc
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={unreadCount === 0 || isMarkingAll}
        onClick={onMarkAllRead}
      >
        <CheckCheck aria-hidden="true" />
        {isMarkingAll ? 'Đang xử lý…' : 'Đọc tất cả'}
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tải lại danh sách"
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
  )
}

export { TYPE_LABELS }
