'use client'

import { ListFilter, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  InventoryFilterOption,
  StockMovement,
  StockMovementType,
} from '../../types/inventory.types'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'
import { StockMovementFilters } from './StockMovementFilters'
import { StockMovementDesktopTable, StockMovementMobileList } from './StockMovementResults'

interface StockMovementHistoryProps {
  readonly permissions: readonly string[]
  readonly items: readonly StockMovement[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly warehouseId: string
  readonly slotId: string
  readonly productId: string
  readonly movementType: StockMovementType | ''
  readonly dateFrom: string
  readonly dateTo: string
  readonly productOptions: readonly InventoryFilterOption[]
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly slotOptions: readonly InventoryFilterOption[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly isDateRangeValid: boolean
  readonly areProductsLoading: boolean
  readonly areProductsError: boolean
  readonly areLocationsLoading: boolean
  readonly areLocationsError: boolean
  readonly activeFilterCount: number
  readonly onProductChange: (value: string) => void
  readonly onSearchChange: (value: string) => void
  readonly onWarehouseChange: (value: string) => void
  readonly onSlotChange: (value: string) => void
  readonly onMovementTypeChange: (value: StockMovementType | '') => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onResetFilters: () => void
  readonly onRetryProducts: () => void
  readonly onRetryLocations: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
}

export function StockMovementHistory(props: StockMovementHistoryProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const {
    items,
    totalCount,
    page,
    pageSize,
    isLoading,
    isFetching,
    isError,
    isDateRangeValid,
    activeFilterCount,
    onPageChange,
    onRetry,
  } = props

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">Lịch sử biến động</h1>
      <InventoryWorkspaceNavigation currentView="movements" permissions={props.permissions} />
      <OperationalListPanel aria-labelledby="movement-history-title">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b p-3">
          <div>
            <h2 id="movement-history-title" className="text-sm font-semibold">
              Nhật ký tồn kho
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-8"
              onClick={() => setIsFilterOpen(true)}
            >
              <ListFilter aria-hidden="true" />
              Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 sm:size-8"
                  disabled={isFetching || !isDateRangeValid}
                  aria-label="Làm mới lịch sử biến động"
                  onClick={onRetry}
                >
                  <RefreshCw
                    className={isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={4}>Làm mới lịch sử</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {isFetching ? 'Đang cập nhật lịch sử biến động' : 'Lịch sử biến động đã cập nhật'}
        </p>
        {isError && items.length > 0 ? (
          <div
            className="border-destructive/30 bg-destructive/5 text-destructive border-b px-3 py-2 text-xs"
            role="alert"
          >
            Không thể tải dữ liệu mới. Bảng đang giữ kết quả gần nhất; hãy thử làm mới lại.
          </div>
        ) : null}
        {!isDateRangeValid ? (
          <OperationalEmptyState
            title="Khoảng thời gian không hợp lệ"
            description="Mở bộ lọc và chọn ngày bắt đầu không sau ngày kết thúc."
          />
        ) : isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : isError && items.length === 0 ? (
          <OperationalErrorState title="Không thể tải lịch sử biến động" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Không có biến động phù hợp"
            description={
              activeFilterCount
                ? 'Thử thay đổi hoặc đặt lại bộ lọc.'
                : 'Chưa có biến động tồn kho để hiển thị.'
            }
          />
        ) : (
          <>
            <StockMovementMobileList items={items} />
            <StockMovementDesktopTable items={items} />
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              isPending={isFetching}
              onPageChange={onPageChange}
              onPageSizeChange={props.onPageSizeChange}
            />
          </>
        )}
      </OperationalListPanel>
      <StockMovementFilters {...props} open={isFilterOpen} onOpenChange={setIsFilterOpen} />
    </div>
  )
}
