'use client'

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
import { InboundPageHeader } from '../components/InboundWorkspace'
import {
  PutawayDeviationReportSheet,
  PutawayDirectory,
  type PutawayAssignmentFilter,
  type PutawayReportRange,
} from '../components/PutawayPage'
import { AssignWarehouseTaskDialog } from '../components/TaskAssignment'
import { useAssignWarehouseTask } from '../hooks/use-assign-warehouse-task'
import { usePutawayDeviationReportQuery, usePutawayTasksQuery } from '../hooks/use-inbound'
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
  const query = usePutawayTasksQuery({
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText ? { searchTerm: debouncedSearchText } : {}),
    ...(createdFrom ? { createdFrom: toOperationalDateTimeStart(createdFrom) } : {}),
    ...(createdTo ? { createdTo: toOperationalDateTimeEnd(createdTo) } : {}),
    ...(canAssign && assignmentFilter === 'unassigned' ? { unassigned: true } : {}),
  })

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
      <PutawayDirectory
        items={query.data?.items ?? []}
        totalCount={query.data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        createdFrom={createdFrom}
        createdTo={createdTo}
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
