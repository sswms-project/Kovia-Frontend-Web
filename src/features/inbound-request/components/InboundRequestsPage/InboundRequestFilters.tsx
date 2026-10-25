'use client'

import { OperationalDateSort } from '@/components/operations/OperationalDateSort'
import type { OrderType } from '@/types/api'

import type { ReactNode } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { OperationalDateRangeFilter } from '@/components/operations/OperationalDateRangeFilter'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { INBOUND_REQUEST_STATUS_LABELS } from '../../utils/inbound-request-format'
import type { InboundRequestStatus } from '../../types/inbound-request.types'

interface InboundRequestFiltersProps {
  readonly searchText: string
  readonly status: InboundRequestStatus | ''
  readonly createdFrom: string
  readonly createdTo: string
  readonly sortDirection: OrderType
  readonly onSortDirectionChange: (value: OrderType) => void
  readonly isFetching: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: InboundRequestStatus | '') => void
  readonly onCreatedFromChange: (value: string) => void
  readonly onCreatedToChange: (value: string) => void
  readonly exportAction?: ReactNode
  readonly onRetry: () => void
}

export function InboundRequestFilters({
  searchText,
  status,
  createdFrom,
  createdTo,
  sortDirection,
  onSortDirectionChange,
  isFetching,
  onSearchChange,
  onStatusChange,
  onCreatedFromChange,
  onCreatedToChange,
  onRetry,
  exportAction,
}: InboundRequestFiltersProps) {
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

      <OperationalDateSort value={sortDirection} onChange={onSortDirectionChange} />
      <OperationalDateRangeFilter
        label="ngày tạo"
        withTime
        from={createdFrom}
        to={createdTo}
        onChange={({ from, to }) => {
          onCreatedFromChange(from)
          onCreatedToChange(to)
        }}
      />

      {exportAction}
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
