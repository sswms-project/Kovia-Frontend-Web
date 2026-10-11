'use client'

import { ListFilter, Plus, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferStage, TransferStatus, TransferSummary } from '../../types/transfer.types'
import { transferStatusOptions } from '../../utils/transfer-stage'
import { TransferDesktopTable } from './TransferDesktopTable'
import { TransferFilterSheet } from './TransferFilterSheet'
import { TransferMobileList } from './TransferMobileList'
import { TransferRowActions } from './TransferRowActions'
import { TRANSFER_STAGE_LABELS, TransferTabs } from './TransferTabs'

interface WarehouseOption {
  readonly id: string
  readonly name: string
}

interface TransferDirectoryProps {
  readonly stage: TransferStage
  readonly openDiscrepancyCount: number
  readonly items: readonly TransferSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: TransferStatus | ''
  readonly sourceWarehouseId: string
  readonly destinationWarehouseId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouseOptions: readonly WarehouseOption[]
  readonly previewId?: string
  readonly canCreate: boolean
  readonly currentUserId: string | null
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: TransferStatus | '') => void
  readonly onSourceWarehouseChange: (value: string) => void
  readonly onDestinationWarehouseChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onPreview: (transfer: TransferSummary) => void
}

export function TransferDirectory({
  stage,
  openDiscrepancyCount,
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  sourceWarehouseId,
  destinationWarehouseId,
  dateFrom,
  dateTo,
  warehouseOptions,
  previewId,
  canCreate,
  currentUserId,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onStatusChange,
  onSourceWarehouseChange,
  onDestinationWarehouseChange,
  onDateFromChange,
  onDateToChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onPreview,
}: TransferDirectoryProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const statusOptions = transferStatusOptions(stage)
  const activeFilterCount =
    (sourceWarehouseId ? 1 : 0) +
    (destinationWarehouseId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)

  const renderRowActions = (transfer: TransferSummary): ReactNode => (
    <TransferRowActions
      transfer={transfer}
      canOpenDraft={
        canCreate && transfer.status === 'Draft' && transfer.createdBy === currentUserId
      }
    />
  )

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <header className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="sr-only">Điều chuyển kho</h1>
        <div className="min-w-0 flex-1">
          <TransferTabs stage={stage} openDiscrepancyCount={openDiscrepancyCount} />
        </div>
        {canCreate ? (
          <Button asChild size="sm" className="shrink-0">
            <Link href={APP_ROUTES.transferCreate}>
              <Plus aria-hidden="true" />
              Tạo yêu cầu điều chuyển
            </Link>
          </Button>
        ) : null}
      </header>

      <OperationalListPanel>
        <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">{TRANSFER_STAGE_LABELS[stage]}</h2>
          <div className="flex w-full gap-2 sm:w-auto">
            <InputGroup className="min-w-0 flex-1 sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Tìm phiếu điều chuyển"
                placeholder="Tìm mã phiếu, kho xuất, kho nhập…"
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputGroup>
            {statusOptions.length > 0 ? (
              <NativeSelect
                aria-label="Lọc theo trạng thái"
                className="w-44 shrink-0"
                value={status}
                onChange={(event) => onStatusChange(event.target.value as TransferStatus | '')}
              >
                {statusOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setIsFilterOpen(true)}>
              <ListFilter aria-hidden="true" />
              Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Tải lại danh sách"
                  aria-busy={isFetching}
                  onClick={onRetry}
                >
                  <RefreshCw
                    className={
                      isFetching
                        ? 'animate-spin motion-reduce:animate-none motion-reduce:opacity-50'
                        : undefined
                    }
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
          <OperationalErrorState title="Không thể tải phiếu điều chuyển" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có phiếu điều chuyển phù hợp"
            description="Thử đổi tab, từ khóa, bộ lọc hoặc tạo yêu cầu điều chuyển mới."
          />
        ) : (
          <>
            <TransferMobileList
              items={items}
              previewId={previewId}
              onPreview={onPreview}
              renderRowActions={renderRowActions}
            />
            <TransferDesktopTable
              items={items}
              previewId={previewId}
              onPreview={onPreview}
              renderRowActions={renderRowActions}
            />
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

      <TransferFilterSheet
        open={isFilterOpen}
        sourceWarehouseId={sourceWarehouseId}
        destinationWarehouseId={destinationWarehouseId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        warehouseOptions={warehouseOptions}
        onOpenChange={setIsFilterOpen}
        onSourceWarehouseChange={onSourceWarehouseChange}
        onDestinationWarehouseChange={onDestinationWarehouseChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </div>
  )
}
