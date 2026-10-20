'use client'

import type { ReactNode } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import type {
  StockIssueCapabilities,
  StockIssueRequestStatus,
  StockIssueRequestStatusCount,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../../types/stock-issue.types'
import { StockIssueRequestFilters, type StockIssueFilterOption } from './StockIssueRequestFilters'
import { StockIssueRequestMobileList } from './StockIssueRequestMobileList'
import { StockIssueRequestStatusStats } from './StockIssueRequestStatusStats'
import { StockIssueRequestTable, StockIssueRequestTableSkeleton } from './StockIssueRequestTable'

interface StockIssueRequestDirectoryProps {
  readonly items: readonly StockIssueRequestSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: StockIssueRequestStatus | ''
  readonly warehouseId: string
  readonly stockRecipientId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly assignedToMe: boolean
  readonly statusCounts: readonly StockIssueRequestStatusCount[]
  readonly stockRecipientOptions: readonly StockIssueFilterOption[]
  readonly warehouseOptions: readonly StockIssueFilterOption[]
  readonly capabilities: StockIssueCapabilities
  readonly handlers: StockIssueRowActionHandlers
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: StockIssueRequestStatus | '') => void
  readonly onWarehouseChange: (value: string) => void
  readonly onStockRecipientChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onAssignedToMeChange: (value: boolean) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly exportAction?: ReactNode
  readonly onRetry: () => void
}

export function StockIssueRequestDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  warehouseId,
  stockRecipientId,
  dateFrom,
  dateTo,
  assignedToMe,
  statusCounts,
  stockRecipientOptions,
  warehouseOptions,
  capabilities,
  handlers,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onStatusChange,
  onWarehouseChange,
  onStockRecipientChange,
  onDateFromChange,
  onDateToChange,
  onAssignedToMeChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  exportAction,
}: StockIssueRequestDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <StockIssueRequestStatusStats counts={statusCounts} isLoading={isLoading} isError={isError} />

      <OperationalListPanel aria-labelledby="stock-issue-request-directory-title">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id="stock-issue-request-directory-title"
              className="min-w-0 flex-1 basis-full text-sm font-semibold 2xl:basis-0"
            >
              Danh sách yêu cầu xuất kho
            </h2>
            <StockIssueRequestFilters
              exportAction={exportAction}
              searchText={searchText}
              status={status}
              warehouseId={warehouseId}
              stockRecipientId={stockRecipientId}
              dateFrom={dateFrom}
              dateTo={dateTo}
              assignedToMe={assignedToMe}
              warehouseOptions={warehouseOptions}
              stockRecipientOptions={stockRecipientOptions}
              isFetching={isFetching}
              onSearchChange={onSearchChange}
              onStatusChange={onStatusChange}
              onWarehouseChange={onWarehouseChange}
              onStockRecipientChange={onStockRecipientChange}
              onDateFromChange={onDateFromChange}
              onDateToChange={onDateToChange}
              onAssignedToMeChange={onAssignedToMeChange}
              onRetry={onRetry}
            />
          </div>
        </div>

        {isLoading ? (
          <StockIssueRequestTableSkeleton />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải yêu cầu xuất kho" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có yêu cầu xuất kho phù hợp"
            description="Thử đổi từ khóa, bộ lọc hoặc tạo yêu cầu xuất kho đầu tiên."
          />
        ) : (
          <>
            <div data-slot="operational-list-body" className="md:hidden">
              <StockIssueRequestMobileList
                items={items}
                capabilities={capabilities}
                handlers={handlers}
              />
            </div>
            <StockIssueRequestTable items={items} capabilities={capabilities} handlers={handlers} />
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
