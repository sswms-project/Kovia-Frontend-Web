'use client'

import { RefreshCw, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { OperationalDateRangeFilter } from '@/components/operations/OperationalDateRangeFilter'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StockIssueRequestStatus } from '../../types/stock-issue.types'
import { STOCK_ISSUE_REQUEST_STATUS_LABELS } from '../../utils/stock-issue-format'

export interface StockIssueFilterOption {
  readonly id: string
  readonly name: string
}

interface StockIssueRequestFiltersProps {
  readonly searchText: string
  readonly status: StockIssueRequestStatus | ''
  readonly warehouseId: string
  readonly stockRecipientId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly assignedToMe: boolean
  readonly warehouseOptions: readonly StockIssueFilterOption[]
  readonly stockRecipientOptions: readonly StockIssueFilterOption[]
  readonly isFetching: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: StockIssueRequestStatus | '') => void
  readonly onWarehouseChange: (value: string) => void
  readonly onStockRecipientChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onAssignedToMeChange: (value: boolean) => void
  readonly onRetry: () => void
}

export function StockIssueRequestFilters({
  searchText,
  status,
  warehouseId,
  stockRecipientId,
  dateFrom,
  dateTo,
  assignedToMe,
  warehouseOptions,
  stockRecipientOptions,
  isFetching,
  onSearchChange,
  onStatusChange,
  onWarehouseChange,
  onStockRecipientChange,
  onDateFromChange,
  onDateToChange,
  onAssignedToMeChange,
  onRetry,
}: StockIssueRequestFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== 'F3') return
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup
        className="min-w-0 flex-1 sm:w-80 sm:flex-none"
        title="Gõ không dấu, nhiều từ cùng lúc. Tìm theo mã phiếu, mã tham chiếu, người nhận, số điện thoại, kho, tên/SKU/mã vạch sản phẩm."
      >
        <InputGroupAddon>
          <Search className="text-primary" aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchInputRef}
          aria-label="Tìm yêu cầu xuất kho"
          placeholder="Tìm mã phiếu, người nhận, sản phẩm… (F3)"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </InputGroup>

      <NativeSelect
        aria-label="Lọc theo trạng thái"
        className="min-w-36"
        value={status}
        onChange={(event) => onStatusChange(event.target.value as StockIssueRequestStatus | '')}
      >
        <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
        {Object.entries(STOCK_ISSUE_REQUEST_STATUS_LABELS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        aria-label="Lọc theo kho xuất"
        className="min-w-36"
        value={warehouseId}
        onChange={(event) => onWarehouseChange(event.target.value)}
      >
        <NativeSelectOption value="">Mọi kho</NativeSelectOption>
        {warehouseOptions.map((warehouse) => (
          <NativeSelectOption key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        aria-label="Lọc theo đơn vị nhận hàng"
        className="max-w-56 min-w-36"
        value={stockRecipientId}
        onChange={(event) => onStockRecipientChange(event.target.value)}
      >
        <NativeSelectOption value="">Mọi đơn vị nhận</NativeSelectOption>
        {stockRecipientOptions.map((stockRecipient) => (
          <NativeSelectOption key={stockRecipient.id} value={stockRecipient.id}>
            {stockRecipient.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <OperationalDateRangeFilter
        from={dateFrom}
        to={dateTo}
        label="ngày tạo"
        onChange={(range) => {
          onDateFromChange(range.from)
          onDateToChange(range.to)
        }}
      />

      <Field orientation="horizontal" className="w-auto">
        <Switch
          id="stock-issue-request-filter-assigned-to-me"
          checked={assignedToMe}
          onCheckedChange={onAssignedToMeChange}
        />
        <FieldLabel htmlFor="stock-issue-request-filter-assigned-to-me">Giao cho tôi</FieldLabel>
      </Field>

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
