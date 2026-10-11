'use client'

import {
  OperationalEmptyState,
  OperationalErrorState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  INBOUND_REQUEST_STATUS,
  type InboundRequestStatus,
  type InboundRequestStatusCount,
  type InboundRequestSummary,
} from '../../types/inbound-request.types'
import { INBOUND_REQUEST_STATUS_LABELS } from '../../utils/inbound-request-format'
import { InboundRequestFilters } from './InboundRequestFilters'
import { InboundRequestBulkActions } from './InboundRequestBulkActions'
import { InboundRequestStatusStats } from './InboundRequestStatusStats'
import { InboundRequestTable, InboundRequestTableSkeleton } from './InboundRequestTable'
import { InboundRequestMobileList } from './InboundRequestMobileList'

interface InboundRequestDirectoryProps {
  readonly items: readonly InboundRequestSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: InboundRequestStatus | ''
  readonly createdFrom: string
  readonly createdTo: string
  readonly statusCounts: readonly InboundRequestStatusCount[]
  readonly isLoading: boolean
  readonly isStatsError: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly canDelete: boolean
  readonly canDeleteApproved?: boolean
  readonly canEdit?: boolean
  readonly canEditApproved?: boolean
  readonly canCreate: boolean
  readonly canSubmit: boolean
  readonly canApprove: boolean
  readonly isDeleting: boolean
  readonly isSubmitting: boolean
  readonly isApproving: boolean
  readonly isDuplicating: boolean
  readonly selectedIds: readonly string[]
  readonly isDeletingMany: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: InboundRequestStatus | '') => void
  readonly onCreatedFromChange: (value: string) => void
  readonly onCreatedToChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onDelete: (item: InboundRequestSummary) => void
  readonly onSubmit: (item: InboundRequestSummary) => void
  readonly onApprove: (item: InboundRequestSummary) => void
  readonly onDuplicate: (item: InboundRequestSummary) => void
  readonly onSelectionChange: (ids: readonly string[]) => void
  readonly onDeleteMany: (ids: readonly string[]) => void
  readonly onSubmitMany: (ids: readonly string[]) => void
  readonly onApproveMany: (ids: readonly string[]) => void
}

export function InboundRequestDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  createdFrom,
  createdTo,
  statusCounts,
  isLoading,
  isStatsError,
  isFetching,
  isError,
  canDelete,
  canDeleteApproved = false,
  canEdit = false,
  canEditApproved = false,
  canCreate,
  canSubmit,
  canApprove,
  isDeleting,
  isSubmitting,
  isApproving,
  isDuplicating,
  selectedIds,
  isDeletingMany,
  onSearchChange,
  onStatusChange,
  onCreatedFromChange,
  onCreatedToChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onDelete,
  onSubmit,
  onApprove,
  onDuplicate,
  onSelectionChange,
  onDeleteMany,
  onSubmitMany,
  onApproveMany,
}: InboundRequestDirectoryProps) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id))
  const firstStatus = selectedItems[0]?.status ?? null
  const selectedStatus = selectedItems.every((item) => item.status === firstStatus)
    ? firstStatus
    : null
  const selectAllIds = items.map((item) => item.id)
  const visibleSelectedIds = selectedItems.map((item) => item.id)
  const deletableIds = selectedItems
    .filter(
      (item) =>
        item.status === INBOUND_REQUEST_STATUS.Draft ||
        (canDeleteApproved &&
          item.status === INBOUND_REQUEST_STATUS.Approved &&
          item.receivedQuantity === 0)
    )
    .map((item) => item.id)
  const selectedDraftIds = selectedStatus === INBOUND_REQUEST_STATUS.Draft ? visibleSelectedIds : []
  const selectedPendingIds =
    selectedStatus === INBOUND_REQUEST_STATUS.PendingApproval ? visibleSelectedIds : []
  const allSelected =
    selectAllIds.length > 0 && selectAllIds.every((id) => selectedIds.includes(id))
  const showDraftActions =
    selectedStatus === INBOUND_REQUEST_STATUS.Draft && (canSubmit || canDelete)
  const showApproveAction = selectedStatus === INBOUND_REQUEST_STATUS.PendingApproval && canApprove

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <InboundRequestStatusStats
        counts={statusCounts}
        isLoading={isLoading}
        isError={isStatsError}
      />

      <OperationalListPanel aria-labelledby="inbound-request-directory-title">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 basis-full flex-col gap-1 2xl:basis-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 id="inbound-request-directory-title" className="text-sm font-semibold">
                  Danh sách yêu cầu nhập kho
                </h2>
                {visibleSelectedIds.length > 0 ? (
                  <InboundRequestBulkActions
                    hasActions={true}
                    selectedCount={visibleSelectedIds.length}
                    selectedStatusLabel={
                      selectedStatus ? INBOUND_REQUEST_STATUS_LABELS[selectedStatus] : null
                    }
                    showDraftActions={showDraftActions}
                    showApproveAction={showApproveAction}
                    canDelete={canDelete}
                    canSubmit={canSubmit}
                    draftIds={selectedDraftIds}
                    deletableIds={deletableIds}
                    pendingIds={selectedPendingIds}
                    isDeletingMany={isDeletingMany}
                    isSubmitting={isSubmitting}
                    isApproving={isApproving}
                    onClearSelection={() => onSelectionChange([])}
                    onDeleteMany={onDeleteMany}
                    onSubmitMany={onSubmitMany}
                    onApproveMany={onApproveMany}
                  />
                ) : null}
              </div>
            </div>
            <InboundRequestFilters
              searchText={searchText}
              status={status}
              createdFrom={createdFrom}
              createdTo={createdTo}
              isFetching={isFetching}
              onSearchChange={onSearchChange}
              onStatusChange={onStatusChange}
              onCreatedFromChange={onCreatedFromChange}
              onCreatedToChange={onCreatedToChange}
              onRetry={onRetry}
            />
          </div>
        </div>

        {isLoading ? (
          <InboundRequestTableSkeleton />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải yêu cầu nhập kho" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có yêu cầu nhập kho phù hợp"
            description="Thử đổi từ khóa, bộ lọc hoặc tạo yêu cầu nhập kho đầu tiên."
          />
        ) : (
          <>
            <div data-slot="operational-list-body" className="md:hidden">
              <InboundRequestMobileList
                items={items}
                canCreate={canCreate}
                isDuplicating={isDuplicating}
                onDuplicate={onDuplicate}
              />
            </div>
            <InboundRequestTable
              items={items}
              canDelete={canDelete}
              canDeleteApproved={canDeleteApproved}
              canEdit={canEdit}
              canEditApproved={canEditApproved}
              canCreate={canCreate}
              canSubmit={canSubmit}
              canApprove={canApprove}
              isDeleting={isDeleting}
              isSubmitting={isSubmitting}
              isApproving={isApproving}
              isDeletingMany={isDeletingMany}
              selectAllIds={selectAllIds}
              isDuplicating={isDuplicating}
              selectedIds={selectedIds}
              allSelected={allSelected}
              onDelete={onDelete}
              onSubmit={onSubmit}
              onApprove={onApprove}
              onDuplicate={onDuplicate}
              onSelectionChange={onSelectionChange}
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
    </div>
  )
}
