'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { RelocationTaskDialog, WarehouseTaskDirectory } from '../components/WarehouseTaskDirectory'
import {
  useMyWarehouseTaskHistoryQuery,
  useWarehouseTaskDetailQuery,
} from '../hooks/use-warehouse-task'
import type { ExecuteWarehouseRelocationFormValues } from '../schemas/warehouse-relocation.schema'
import type {
  MyWarehouseTask,
  WarehouseTaskDeadlineStatus,
  WarehouseTaskType,
} from '../types/warehouse-task.types'

const DEFAULT_PAGE_SIZE = 20

export default function MyWarehouseTaskHistoryPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskTypeFilter, setTaskTypeFilter] = useState<WarehouseTaskType | ''>('')
  const [executionStatusFilter, setExecutionStatusFilter] = useState<
    MyWarehouseTask['executionStatus'] | ''
  >('')
  const [deadlineFilter, setDeadlineFilter] = useState<WarehouseTaskDeadlineStatus | ''>('')
  const meQuery = useMeQuery()
  const managesWarehouseTasks = (meQuery.data?.permissions ?? []).includes(
    P.WAREHOUSE_TASKS_VIEW_ALL
  )
  const exportFilters = {
    pageNumber: page,
    pageSize,
    taskType: taskTypeFilter || undefined,
    executionStatus: executionStatusFilter || undefined,
    deadlineStatus: deadlineFilter || undefined,
  }
  const query = useMyWarehouseTaskHistoryQuery(
    exportFilters,
    managesWarehouseTasks ? 'managed' : 'mine'
  )
  const scope = managesWarehouseTasks ? 'managed' : 'mine'
  const detailQuery = useWarehouseTaskDetailQuery(selectedTaskId, scope)
  const readOnlyForm = useForm<ExecuteWarehouseRelocationFormValues>({
    defaultValues: { lineId: '', destinationSlotId: '', quantity: 1, overrideReason: '' },
  })
  const listExport = useListExport({
    dataset: managesWarehouseTasks ? 'managed-task-history' : 'my-task-history',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: managesWarehouseTasks ? P.WAREHOUSE_TASKS_VIEW_ALL : P.WAREHOUSE_TASKS_VIEW_OWN,
    totalCount: query.data?.totalCount ?? 0,
    isFetching: query.isFetching,
    isError: query.isError,
  })
  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <WarehouseTaskDirectory
          exportAction={
            listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
          }
          title={managesWarehouseTasks ? 'Lịch sử công việc kho' : 'Công việc đã xử lý'}
          description="Các công việc đã hoàn tất hoặc đã hủy; không bao gồm nhật ký thao tác hệ thống."
          items={query.data?.items ?? []}
          totalCount={query.data?.totalCount ?? 0}
          stats={
            query.data?.stats ?? {
              unassignedCount: 0,
              queuedCount: 0,
              inProgressCount: 0,
              pausedCount: 0,
              dueSoonCount: 0,
              overdueCount: 0,
            }
          }
          statsMode={managesWarehouseTasks ? 'managed' : 'mine'}
          showStats={false}
          page={page}
          pageSize={pageSize}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          headerAction={
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:justify-end">
              <NativeSelect
                aria-label="Lọc lịch sử theo loại công việc"
                value={taskTypeFilter}
                onChange={(event) => {
                  setTaskTypeFilter(event.target.value as WarehouseTaskType | '')
                  setPage(1)
                }}
                className="w-full sm:w-40"
              >
                <NativeSelectOption value="">Mọi loại việc</NativeSelectOption>
                <NativeSelectOption value="Receiving">Nhận hàng</NativeSelectOption>
                <NativeSelectOption value="Picking">Lấy hàng xuất kho</NativeSelectOption>
                <NativeSelectOption value="PutAway">Cất hàng</NativeSelectOption>
                <NativeSelectOption value="CycleCount">Kiểm kê</NativeSelectOption>
                <NativeSelectOption value="Relocation">Điều chuyển vị trí</NativeSelectOption>
                <NativeSelectOption value="TransferPick">Lấy hàng điều chuyển</NativeSelectOption>
                <NativeSelectOption value="TransferReceive">
                  Nhận hàng điều chuyển
                </NativeSelectOption>
              </NativeSelect>
              <NativeSelect
                aria-label="Lọc lịch sử theo trạng thái"
                value={executionStatusFilter}
                onChange={(event) => {
                  setExecutionStatusFilter(
                    event.target.value as MyWarehouseTask['executionStatus'] | ''
                  )
                  setPage(1)
                }}
                className="w-full sm:w-40"
              >
                <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
                <NativeSelectOption value="Completed">Hoàn tất</NativeSelectOption>
                <NativeSelectOption value="Cancelled">Đã hủy</NativeSelectOption>
              </NativeSelect>
              <NativeSelect
                aria-label="Lọc lịch sử theo thời hạn"
                value={deadlineFilter}
                onChange={(event) => {
                  setDeadlineFilter(event.target.value as WarehouseTaskDeadlineStatus | '')
                  setPage(1)
                }}
                className="w-full sm:w-40"
              >
                <NativeSelectOption value="">Mọi thời hạn</NativeSelectOption>
                <NativeSelectOption value="CompletedOnTime">Đúng hạn</NativeSelectOption>
                <NativeSelectOption value="CompletedLate">Trễ hạn</NativeSelectOption>
                <NativeSelectOption value="Cancelled">Đã hủy</NativeSelectOption>
              </NativeSelect>
            </div>
          }
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize)
            setPage(1)
          }}
          onRetry={() => void query.refetch()}
          onOpenRelocation={(task) => setSelectedTaskId(task.id)}
        />
      </div>
      <RelocationTaskDialog
        open={Boolean(selectedTaskId)}
        detail={detailQuery.data}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        scope={scope}
        canAssign={false}
        canExecute={false}
        canOverrideDestination={false}
        staffOptions={[]}
        assignmentStaffId=""
        assignmentReason=""
        recommendations={[]}
        recommendationsLoading={false}
        executeForm={readOnlyForm}
        isAssigning={false}
        isExecuting={false}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onRetry={() => void detailQuery.refetch()}
        onAssignmentStaffChange={() => undefined}
        onAssignmentReasonChange={() => undefined}
        onAssign={() => undefined}
        onLineChange={() => undefined}
        onExecute={() => undefined}
      />
    </>
  )
}
