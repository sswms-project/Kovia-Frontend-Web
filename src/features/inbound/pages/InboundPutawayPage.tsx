'use client'

import { OrderType } from '@/types/api'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { ChartColumn, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
} from '@/features/inbound-request/utils/inbound-request-format'
import { OperationalCountTile } from '@/components/operations/OperationalCountTile'
import {
  InboundPageHeader,
  InboundMasterDetail,
  InboundStageGoodsPreview,
} from '../components/InboundWorkspace'
import { INBOUND_STATUS_LABELS } from '../utils/inbound-format'
import { useInboundGoodsSelection } from '../hooks/use-inbound-goods-selection'
import { receiptStageGoodsRows } from '../utils/inbound-goods-preview'
import {
  PutawayDeviationReportSheet,
  PutawayDirectory,
  type PutawayAssignmentFilter,
  type PutawayReportRange,
} from '../components/PutawayPage'
import { AssignWarehouseTaskDialog } from '../components/TaskAssignment'
import { useAssignWarehouseTask } from '../hooks/use-assign-warehouse-task'
import {
  useGoodsReceiptQuery,
  usePutawayDeviationReportQuery,
  usePutawayTasksQuery,
} from '../hooks/use-inbound'
import { useWarehouseTaskAssignmentAccess } from '../hooks/use-warehouse-task-assignment-access'
import type { GoodsReceiptSummary, PutAwayDeviationReportQuery } from '../types/inbound.types'

// Mốc thời gian được chốt lúc mở/đổi khoảng để query key ổn định giữa các lần render.
function toReportPeriod(days: PutawayReportRange): PutAwayDeviationReportQuery {
  const to = new Date()
  return { from: new Date(to.getTime() - days * 86_400_000).toISOString(), to: to.toISOString() }
}

export default function InboundPutawayPage() {
  const meQuery = useMeQuery()
  const { currentUserId, canAssign } = useWarehouseTaskAssignmentAccess()
  const [searchText, setSearchText] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sortDirection, setSortDirection] = useState(OrderType.Descending)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [assignmentFilter, setAssignmentFilter] = useState<PutawayAssignmentFilter>('all')
  const assignment = useAssignWarehouseTask()
  const [reportOpen, setReportOpen] = useState(false)
  const [reportRange, setReportRange] = useState<PutawayReportRange>(30)
  const [reportPeriod, setReportPeriod] = useState(() => toReportPeriod(30))
  const reportQuery = usePutawayDeviationReportQuery(reportPeriod, reportOpen)
  const canViewReport = meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_PLAN_PUTAWAY) ?? false
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const exportFilters = {
    sortDirection,
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText ? { searchTerm: debouncedSearchText } : {}),
    ...(createdFrom ? { createdFrom: toOperationalDateTimeStart(createdFrom) } : {}),
    ...(createdTo ? { createdTo: toOperationalDateTimeEnd(createdTo) } : {}),
    ...(canAssign && assignmentFilter === 'unassigned' ? { unassigned: true } : {}),
  }
  const query = usePutawayTasksQuery(exportFilters)
  const preview = useInboundGoodsSelection(
    'putaway',
    JSON.stringify([exportFilters, searchText]),
    (query.data?.items ?? []).map((item) => item.id),
    !query.isError &&
      !query.isPlaceholderData &&
      searchText.trim() === debouncedSearchText.trim() &&
      Boolean(meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW))
  )
  const previewItem = preview.id
    ? query.data?.items.find((item) => item.id === preview.id)
    : undefined
  const previewQuery = useGoodsReceiptQuery(
    preview.expanded && previewItem && meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW)
      ? previewItem.id
      : ''
  )
  const previewDetail =
    previewItem && previewQuery.data?.id === previewItem.id ? previewQuery.data : undefined

  function openAssign(receipt: GoodsReceiptSummary) {
    assignment.open({
      kind: 'PutAway',
      id: receipt.id,
      referenceCode: receipt.receiptCode,
      warehouseId: receipt.warehouseId,
      warehouseName: receipt.warehouseName,
      currentAssigneeId: receipt.putAwayAssignedTo,
      currentAssigneeName: receipt.putAwayAssignedToName,
      currentPriority: receipt.putAwayTaskPriority,
      currentDueAt: receipt.putAwayTaskDueAt,
    })
  }

  const listExport = useListExport({
    dataset: 'putaway',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.GOODS_RECEIPTS_VIEW,
    totalCount: query.data?.totalCount ?? 0,
    isFetching: query.isFetching,
    isError: query.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <InboundPageHeader
        title="Cất hàng"
        canViewRequests={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_VIEW) ?? false}
        canViewReceipts={meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW) ?? false}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-border w-full shrink-0 border sm:max-w-xs">
          <OperationalCountTile
            icon={PackageCheck}
            tone="active"
            label="Phiếu chờ cất"
            value={query.data?.totalCount ?? 0}
            isLoading={query.isFetching}
            isError={query.isError}
          />
        </div>
        {canViewReport ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReportPeriod(toReportPeriod(reportRange))
              setReportOpen(true)
            }}
          >
            <ChartColumn aria-hidden="true" />
            Báo cáo cất khác khuyến nghị
          </Button>
        ) : null}
      </div>
      <InboundMasterDetail
        title="Chi tiết hàng hóa"
        detailAnchorId={preview.anchorId}
        expanded={preview.expanded}
        onExpandedChange={preview.setExpanded}
        referenceCode={previewItem?.receiptCode}
        detail={
          <InboundStageGoodsPreview
            key={preview.id || 'empty'}
            stage="putaway"
            rows={receiptStageGoodsRows(previewDetail?.items ?? [], 'putaway')}
            selected={Boolean(previewItem)}
            isLoading={Boolean(previewItem) && !previewDetail && !previewQuery.isError}
            isError={query.isError || previewQuery.isError}
            statusLabel={previewDetail ? INBOUND_STATUS_LABELS[previewDetail.status] : undefined}
            onRetry={() => void (query.isError ? query.refetch() : previewQuery.refetch())}
          />
        }
      >
        <PutawayDirectory
          previewId={preview.id}
          onPreview={(item, open) => preview.select(item.id, open)}
          previewAction={
            <Button
              type="button"
              variant="outline"
              disabled={!previewItem}
              aria-label={previewItem ? `Xem hàng hóa ${previewItem.receiptCode}` : 'Xem hàng hóa'}
              onClick={() => preview.select(preview.id, true)}
            >
              Xem hàng hóa
            </Button>
          }
          exportAction={
            listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
          }
          items={query.data?.items ?? []}
          totalCount={query.data?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          searchText={searchText}
          createdFrom={createdFrom}
          createdTo={createdTo}
          sortDirection={sortDirection}
          onSortDirectionChange={(value) => {
            setSortDirection(value)
            setPage(1)
          }}
          isLoading={query.isFetching}
          isFetching={query.isFetching}
          isError={query.isError}
          onSearchChange={(value) => {
            setSearchText(value)
            setPage(1)
          }}
          onCreatedFromChange={(value) => {
            setCreatedFrom(value)
            setPage(1)
          }}
          onCreatedToChange={(value) => {
            setCreatedTo(value)
            setPage(1)
          }}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setPage(1)
          }}
          onRetry={() => void query.refetch()}
          currentUserId={currentUserId}
          canAssign={canAssign}
          assignmentFilter={assignmentFilter}
          onAssignmentFilterChange={(value) => {
            setAssignmentFilter(value)
            setPage(1)
          }}
          onAssign={openAssign}
        />
      </InboundMasterDetail>
      <PutawayDeviationReportSheet
        open={reportOpen}
        rangeDays={reportRange}
        report={reportQuery.data}
        isLoading={reportQuery.isLoading}
        isError={reportQuery.isError}
        onOpenChange={setReportOpen}
        onRangeChange={(days) => {
          setReportRange(days)
          setReportPeriod(toReportPeriod(days))
        }}
        onRetry={() => void reportQuery.refetch()}
      />
      <AssignWarehouseTaskDialog
        target={assignment.target}
        form={assignment.form}
        staff={assignment.staff}
        isLoadingStaff={assignment.isLoadingStaff}
        isErrorStaff={assignment.isErrorStaff}
        isFetchingStaff={assignment.isFetchingStaff}
        onRetryStaff={assignment.onRetryStaff}
        isPending={assignment.isPending}
        onOpenChange={(open) => !open && assignment.close()}
        onSubmit={assignment.onSubmit}
      />
    </div>
  )
}
