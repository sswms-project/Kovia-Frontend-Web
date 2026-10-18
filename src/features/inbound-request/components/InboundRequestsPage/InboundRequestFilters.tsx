'use client'

import { CalendarRange, RefreshCw, Search, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { dateToIsoDateString, formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { INBOUND_REQUEST_STATUS_LABELS } from '../../utils/inbound-request-format'
import type { InboundRequestStatus } from '../../types/inbound-request.types'

interface InboundRequestFiltersProps {
  readonly searchText: string
  readonly status: InboundRequestStatus | ''
  readonly createdFrom: string
  readonly createdTo: string
  readonly isFetching: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: InboundRequestStatus | '') => void
  readonly onCreatedFromChange: (value: string) => void
  readonly onCreatedToChange: (value: string) => void
  readonly onRetry: () => void
}

export function InboundRequestFilters({
  searchText,
  status,
  createdFrom,
  createdTo,
  isFetching,
  onSearchChange,
  onStatusChange,
  onCreatedFromChange,
  onCreatedToChange,
  onRetry,
}: InboundRequestFiltersProps) {
  const hasDateFilter = Boolean(createdFrom || createdTo)

  const dateRange: DateRange = {
    from: isoDateStringToDate(createdFrom),
    to: isoDateStringToDate(createdTo),
  }

  function handleDateRangeSelect(range: DateRange | undefined) {
    onCreatedFromChange(range?.from ? dateToIsoDateString(range.from) : '')
    onCreatedToChange(range?.to ? dateToIsoDateString(range.to) : '')
  }

  function buildDateLabel() {
    const from = dateRange.from ? formatDisplayDate(dateRange.from) : null
    const to = dateRange.to ? formatDisplayDate(dateRange.to) : null
    if (from && to) return `${from} – ${to}`
    if (from) return `Từ ${from}`
    if (to) return `Đến ${to}`
    return 'Khoảng ngày'
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="min-w-0 flex-1 basis-full sm:w-72 sm:flex-none sm:basis-auto">
        <InputGroupAddon>
          <Search className="text-primary" aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Tìm yêu cầu nhập kho"
          placeholder="Tìm mã yêu cầu, nguồn hàng…"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </InputGroup>

      <NativeSelect
        aria-label="Lọc theo trạng thái"
        className="min-w-36"
        value={status}
        onChange={(event) => onStatusChange(event.target.value as InboundRequestStatus | '')}
      >
        <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
        {Object.entries(INBOUND_REQUEST_STATUS_LABELS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={hasDateFilter ? 'default' : 'outline'}
            size="sm"
            aria-label="Lọc theo khoảng ngày tạo"
          >
            <CalendarRange aria-hidden="true" />
            {buildDateLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="border-b p-3">
            <PopoverTitle>Khoảng ngày tạo</PopoverTitle>
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
