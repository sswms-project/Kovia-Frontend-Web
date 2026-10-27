'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import {
  useInventoryQuery,
  useInventoryWarehouseOptionsQuery,
} from '@/features/inventory/hooks/use-inventory'
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import { useTransferRealtime } from '@/features/transfer/hooks/use-transfer-realtime'
import { useWarehouseLocationsQuery } from '@/features/warehouse/hooks/use-warehouse'
import { getApiErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { TaskSplitButton, TaskSplitSection, useTaskSplitQuery } from '@/features/task-splitting'
import {
  CreateRelocationTaskDialog,
  RelocationTaskDialog,
  WarehouseTaskDirectory,
  WarehouseTaskScheduleDialog,
  getTaskRoute,
} from '../components/WarehouseTaskDirectory'
import { MyWorkQueue } from '../components/MyWorkQueue'
import {
  useAssignWarehouseTaskMutation,
  useCreateWarehouseTaskMutation,
  useExecuteWarehouseRelocationMutation,
  useManageMyWarehouseTaskMutation,
  useMyWarehouseTasksQuery,
  useWarehouseTaskDetailQuery,
  useWarehouseTaskRecommendationsQuery,
  useUpdateWarehouseTaskScheduleMutation,
} from '../hooks/use-warehouse-task'
import {
  createWarehouseRelocationSchema,
  executeWarehouseRelocationSchema,
  type CreateWarehouseRelocationFormValues,
  type ExecuteWarehouseRelocationFormValues,
} from '../schemas/warehouse-relocation.schema'
import {
  warehouseTaskScheduleSchema,
  type WarehouseTaskScheduleFormValues,
} from '../schemas/warehouse-task-schedule.schema'
import type {
  MyWarehouseTask,
  WarehouseTaskAction,
  WarehouseTaskDeadlineStatus,
  WarehouseTaskType,
} from '../types/warehouse-task.types'

const DEFAULT_PAGE_SIZE = 20
const EMPTY_LINE = {
  sourceInventoryStockId: '',
  sourceSlotId: '',
  availableQuantity: 0,
  quantity: 1,
  proposedDestinationSlotId: null,
}
const SUCCESS_MESSAGES: Record<WarehouseTaskAction, string> = {
  Start: 'Đã bắt đầu công việc.',
  Pause: 'Đã tạm dừng công việc.',
  Return: 'Đã trả công việc về cho quản lý kho.',
}
const EMPTY_STATS = {
  unassignedCount: 0,
  queuedCount: 0,
  inProgressCount: 0,
  pausedCount: 0,
  dueSoonCount: 0,
  overdueCount: 0,
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function MyWarehouseTasksPage({
  initialTaskId,
  initialWarehouseId,
  initialDeadline,
}: {
  readonly initialTaskId?: string
  readonly initialWarehouseId?: string
  readonly initialDeadline?: WarehouseTaskDeadlineStatus
} = {}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  // Mở sẵn từ form điều chuyển kho (chọn "Điều chuyển nội bộ vị trí trong kho").
  const searchParams = useSearchParams()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === 'relocation')
  const [sourceSearch, setSourceSearch] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId)
  const [scheduleTask, setScheduleTask] = useState<MyWarehouseTask | null>(null)
  const [taskTypeFilter, setTaskTypeFilter] = useState<WarehouseTaskType | ''>('')
  const [executionStatusFilter, setExecutionStatusFilter] = useState<
    MyWarehouseTask['executionStatus'] | ''
  >('')
  const [deadlineFilter, setDeadlineFilter] = useState<WarehouseTaskDeadlineStatus | ''>(
    initialDeadline ?? ''
  )
  const [assignmentStaffId, setAssignmentStaffId] = useState('')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [pendingReason, setPendingReason] = useState<{
    task: MyWarehouseTask
    action: 'Pause' | 'Return'
  } | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []
  const assignedWarehouses = meQuery.data?.assignedWarehouses
  const assignedWarehouseIds = useMemo(
    () => (assignedWarehouses ?? []).map((warehouse) => warehouse.id),
    [assignedWarehouses]
  )
  // Việc lấy/nhận hàng điều chuyển thay đổi theo thời gian thực nên danh sách tự làm mới.
  useTransferRealtime({ warehouseIds: assignedWarehouseIds })
  const canManageOwnTasks = permissions.includes(P.WAREHOUSE_TASKS_MANAGE_OWN)
  const managesWarehouseTasks = permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL)
  const canCreateRelocation = permissions.includes(P.WAREHOUSE_TASKS_CREATE)
  const canAssignRelocation = permissions.includes(P.WAREHOUSE_TASKS_ASSIGN)
  const scope = managesWarehouseTasks ? 'managed' : 'mine'
  const exportFilters = {
    pageNumber: page,
    pageSize,
    warehouseId: warehouseFilter,
    taskType: taskTypeFilter || undefined,
    executionStatus: executionStatusFilter || undefined,
    deadlineStatus: deadlineFilter || undefined,
  }
  const query = useMyWarehouseTasksQuery(exportFilters, scope)
  const canSeeOwnWork = permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN)
  // Lọc trước khi lấy sáu việc mới nhất để việc vừa giao không bị khuất sau trang đầu.
  const ownWorkQuery = useMyWarehouseTasksQuery(
    {
      pageNumber: 1,
      pageSize: 6,
      recentlyAssignedFirst: true,
      warehouseId: warehouseFilter,
      taskType: taskTypeFilter || undefined,
      executionStatus: executionStatusFilter || undefined,
      deadlineStatus: deadlineFilter || undefined,
    },
    'mine',
    canSeeOwnWork
  )
  const action = useManageMyWarehouseTaskMutation()
  const actionLock = useRef(false)
  const detailQuery = useWarehouseTaskDetailQuery(selectedTaskId, scope)
  const createMutation = useCreateWarehouseTaskMutation()
  const assignMutation = useAssignWarehouseTaskMutation(selectedTaskId)
  const executeMutation = useExecuteWarehouseRelocationMutation(selectedTaskId)
  const scheduleMutation = useUpdateWarehouseTaskScheduleMutation(scheduleTask)
  const split = useTaskSplitQuery('Relocation', selectedTaskId ?? '')
  const [isSplitOpen, setIsSplitOpen] = useState(false)

  const scheduleForm = useForm<WarehouseTaskScheduleFormValues>({
    resolver: zodResolver(warehouseTaskScheduleSchema),
    defaultValues: { priority: 'Normal', dueAt: '', reason: '' },
  })

  const createForm = useForm<CreateWarehouseRelocationFormValues>({
    resolver: zodResolver(createWarehouseRelocationSchema),
    defaultValues: {
      warehouseId: '',
      priority: 'Normal',
      dueAt: '',
      reason: '',
      lines: [{ ...EMPTY_LINE }],
    },
  })
  const createLines = useFieldArray({ control: createForm.control, name: 'lines' })
  const createWarehouseId = useWatch({ control: createForm.control, name: 'warehouseId' })
  const debouncedSourceSearch = useDebouncedValue(sourceSearch, 350)
  const warehouseOptionsQuery = useInventoryWarehouseOptionsQuery(canCreateRelocation)
  const inventoryQuery = useInventoryQuery(
    {
      pageNumber: 1,
      pageSize: 100,
      warehouseId: createWarehouseId || undefined,
      searchTerm: debouncedSourceSearch.trim() || undefined,
    },
    canCreateRelocation && Boolean(createWarehouseId)
  )
  const locationQuery = useWarehouseLocationsQuery(createWarehouseId, {
    top: 300,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
  })
  const inventoryOptions = useMemo(
    () =>
      (inventoryQuery.data?.items ?? []).filter(
        (stock) =>
          stock.availableQuantity > 0 &&
          stock.qualityStatus === 'Good' &&
          stock.eligibilityStatus === 'Available'
      ),
    [inventoryQuery.data?.items]
  )

  const executeForm = useForm<ExecuteWarehouseRelocationFormValues>({
    resolver: zodResolver(executeWarehouseRelocationSchema),
    defaultValues: { lineId: '', destinationSlotId: '', quantity: 1, overrideReason: '' },
  })
  const executeLineId = useWatch({ control: executeForm.control, name: 'lineId' })
  const executeQuantity = useWatch({ control: executeForm.control, name: 'quantity' })
  const recommendationsQuery = useWarehouseTaskRecommendationsQuery(
    selectedTaskId,
    executeLineId || null,
    executeQuantity,
    scope,
    Boolean(detailQuery.data)
  )
  const staffQuery = useStaffListQuery(
    STAFF_DIRECTORY_KINDS.staff,
    { top: 100, skip: 0, needTotalCount: true },
    canAssignRelocation && Boolean(selectedTaskId)
  )
  const managerQuery = useStaffListQuery(
    STAFF_DIRECTORY_KINDS.managers,
    { top: 100, skip: 0, needTotalCount: true },
    canAssignRelocation && Boolean(selectedTaskId)
  )
  const assignableStaff = useMemo(() => {
    const warehouseId = detailQuery.data?.warehouseId
    const candidates = [...(staffQuery.data?.items ?? []), ...(managerQuery.data?.items ?? [])]
    return candidates.filter(
      (staff, index) =>
        staff.status === 'Active' &&
        Boolean(warehouseId && staff.assignedWarehouseIds.includes(warehouseId)) &&
        candidates.findIndex((candidate) => candidate.id === staff.id) === index
    )
  }, [detailQuery.data?.warehouseId, managerQuery.data?.items, staffQuery.data?.items])

  useEffect(() => {
    const detail = detailQuery.data
    if (!detail) return
    const firstPendingLine = detail.lines.find((line) => line.remainingQuantity > 0)
    executeForm.reset({
      lineId: firstPendingLine?.id ?? '',
      destinationSlotId: firstPendingLine?.proposedDestinationSlotId ?? '',
      quantity: firstPendingLine?.remainingQuantity ?? 1,
      overrideReason: '',
    })
  }, [detailQuery.data, executeForm])

  useEffect(() => {
    if (canAssignRelocation) return
    const line = detailQuery.data?.lines.find((item) => item.id === executeLineId)
    const assignedDestinationId =
      line?.proposedDestinationSlotId ?? recommendationsQuery.data?.[0]?.slotId
    if (assignedDestinationId) {
      executeForm.setValue('destinationSlotId', assignedDestinationId, { shouldValidate: true })
      executeForm.setValue('overrideReason', '')
    }
  }, [
    canAssignRelocation,
    detailQuery.data?.lines,
    executeForm,
    executeLineId,
    recommendationsQuery.data,
  ])

  async function run(task: MyWarehouseTask, type: WarehouseTaskAction, note?: string) {
    if (actionLock.current) return false
    actionLock.current = true
    try {
      await action.mutateAsync({
        taskType: task.taskType,
        taskId: task.id,
        action: type,
        reason: note,
      })
      toast.success(SUCCESS_MESSAGES[type])
      if (task.taskType === 'Relocation' && selectedTaskId === task.id) await detailQuery.refetch()
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật công việc. Vui lòng thử lại.'))
      return false
    } finally {
      actionLock.current = false
    }
  }

  function manage(task: MyWarehouseTask, type: WarehouseTaskAction) {
    if (type === 'Start') {
      // Lấy/nhận hàng điều chuyển có màn riêng để quét mã: bắt đầu xong mở luôn màn đó.
      const isTransferTask =
        task.taskType === 'TransferPick' ||
        task.taskType === 'TransferReceive' ||
        task.taskType === 'TransferPutAway'
      void run(task, type).then((started) => {
        if (started && isTransferTask) router.push(getTaskRoute(task))
      })
      return
    }
    setReason('')
    setReasonError('')
    setPendingReason({ task, action: type })
  }

  async function confirmReason() {
    if (!pendingReason) return
    const normalized = reason.trim()
    if (!normalized) {
      setReasonError('Vui lòng nhập lý do.')
      return
    }
    if (normalized.length > 500) {
      setReasonError('Lý do không được vượt quá 500 ký tự.')
      return
    }
    if (await run(pendingReason.task, pendingReason.action, normalized)) setPendingReason(null)
  }

  function changeCreateWarehouse(warehouseId: string) {
    createForm.setValue('warehouseId', warehouseId, { shouldValidate: true })
    createForm.setValue('lines', [{ ...EMPTY_LINE }])
    setSourceSearch('')
  }

  function changeSource(index: number, stockId: string) {
    const stock = inventoryOptions.find((item) => item.id === stockId)
    createForm.setValue(`lines.${index}.sourceInventoryStockId`, stockId, { shouldValidate: true })
    createForm.setValue(`lines.${index}.sourceSlotId`, stock?.slotId ?? '')
    createForm.setValue(`lines.${index}.availableQuantity`, stock?.availableQuantity ?? 0)
    createForm.setValue(`lines.${index}.quantity`, stock ? Math.min(1, stock.availableQuantity) : 1)
    createForm.setValue(`lines.${index}.proposedDestinationSlotId`, null)
  }

  async function createRelocation(values: CreateWarehouseRelocationFormValues) {
    try {
      await createMutation.mutateAsync({
        warehouseId: values.warehouseId,
        priority: values.priority,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        reason: values.reason.trim(),
        commandId: crypto.randomUUID(),
        lines: values.lines.map((line) => ({
          sourceInventoryStockId: line.sourceInventoryStockId,
          quantity: line.quantity,
          proposedDestinationSlotId: line.proposedDestinationSlotId || null,
        })),
      })
      toast.success('Đã tạo công việc điều chuyển vị trí.')
      setCreateOpen(false)
      createForm.reset({
        warehouseId: '',
        priority: 'Normal',
        dueAt: '',
        reason: '',
        lines: [{ ...EMPTY_LINE }],
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tạo công việc điều chuyển.'))
    }
  }

  async function assignRelocation() {
    const detail = detailQuery.data
    const targetStaffId = assignmentStaffId || detail?.assignedTo
    if (!detail || !targetStaffId) return
    if (detail.assignedTo && detail.assignedTo !== targetStaffId && !assignmentReason.trim()) {
      toast.error('Vui lòng nhập lý do khi phân công lại.')
      return
    }
    try {
      await assignMutation.mutateAsync({
        staffId: targetStaffId,
        expectedStaffId: detail.assignedTo,
        expectedVersion: detail.rowVersion,
        reason: assignmentReason.trim() || null,
      })
      toast.success(detail.assignedTo ? 'Đã phân công lại công việc.' : 'Đã phân công công việc.')
      await detailQuery.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể phân công công việc.'))
    }
  }

  function changeExecuteLine(lineId: string) {
    const line = detailQuery.data?.lines.find((item) => item.id === lineId)
    executeForm.reset({
      lineId,
      destinationSlotId: line?.proposedDestinationSlotId ?? '',
      quantity: line?.remainingQuantity ?? 1,
      overrideReason: '',
    })
  }

  async function executeRelocation(values: ExecuteWarehouseRelocationFormValues) {
    const detail = detailQuery.data
    if (!detail) return
    const line = detail.lines.find((item) => item.id === values.lineId)
    const recommendation = recommendationsQuery.data?.find(
      (item) => item.slotId === values.destinationSlotId
    )
    if (
      recommendation?.rank !== 1 &&
      values.destinationSlotId !== line?.proposedDestinationSlotId &&
      !values.overrideReason.trim()
    ) {
      executeForm.setError('overrideReason', {
        message: 'Vui lòng nêu lý do khi không chọn vị trí ưu tiên số 1.',
      })
      return
    }
    try {
      await executeMutation.mutateAsync({
        lineId: values.lineId,
        destinationSlotId: values.destinationSlotId,
        quantity: values.quantity,
        commandId: crypto.randomUUID(),
        expectedVersion: detail.rowVersion,
        overrideReason: values.overrideReason.trim() || null,
      })
      toast.success('Đã ghi nhận điều chuyển vị trí.')
      await detailQuery.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể ghi nhận điều chuyển.'))
    }
  }

  function openSchedule(task: MyWarehouseTask) {
    scheduleForm.reset({
      priority: task.priority,
      dueAt: toDateTimeLocal(task.dueAt),
      reason: '',
    })
    setScheduleTask(task)
  }

  async function updateSchedule(values: WarehouseTaskScheduleFormValues) {
    if (!scheduleTask) return
    try {
      await scheduleMutation.mutateAsync({
        priority: values.priority,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        expectedPriority: scheduleTask.priority,
        expectedDueAt: scheduleTask.dueAt,
        reason: values.reason.trim(),
      })
      toast.success('Đã cập nhật lịch công việc.')
      setScheduleTask(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật lịch công việc.'))
    }
  }

  const listExport = useListExport({
    dataset: managesWarehouseTasks ? 'managed-tasks' : 'my-tasks',
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
        {warehouseFilter ? (
          <div className="mb-2 flex shrink-0 items-center justify-between rounded-lg border p-2 text-xs">
            <span>Đang lọc kho từ tổng quan</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setWarehouseFilter(undefined)
                setPage(1)
              }}
            >
              Xóa bộ lọc kho
            </Button>
          </div>
        ) : null}
        {canSeeOwnWork ? (
          <MyWorkQueue
            tasks={ownWorkQuery.data?.items ?? []}
            totalCount={ownWorkQuery.data?.totalCount ?? 0}
            isLoading={ownWorkQuery.isFetching}
            isError={ownWorkQuery.isError}
            hasFilters={Boolean(
              warehouseFilter || taskTypeFilter || executionStatusFilter || deadlineFilter
            )}
            onRetry={() => void ownWorkQuery.refetch()}
          />
        ) : null}
        <WarehouseTaskDirectory
          exportAction={
            listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
          }
          title={managesWarehouseTasks ? 'Công việc kho' : 'Công việc của tôi'}
          description={
            managesWarehouseTasks
              ? 'Theo dõi, tạo và phân công công việc trong các kho được quản lý.'
              : 'Các nhiệm vụ kho đang chờ bạn thực hiện.'
          }
          items={query.data?.items ?? []}
          totalCount={query.data?.totalCount ?? 0}
          stats={query.data?.stats ?? EMPTY_STATS}
          statsMode={managesWarehouseTasks ? 'managed' : 'mine'}
          page={page}
          pageSize={pageSize}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          currentUserId={meQuery.data?.id}
          headerAction={
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:justify-end">
              <NativeSelect
                aria-label="Lọc theo loại công việc"
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
                <NativeSelectOption value="TransferPutAway">
                  Cất hàng điều chuyển
                </NativeSelectOption>
              </NativeSelect>
              <NativeSelect
                aria-label="Lọc theo trạng thái"
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
                <NativeSelectOption value="Queued">Chờ bắt đầu</NativeSelectOption>
                <NativeSelectOption value="InProgress">Đang làm</NativeSelectOption>
                <NativeSelectOption value="Paused">Tạm dừng</NativeSelectOption>
              </NativeSelect>
              <NativeSelect
                aria-label="Lọc theo hạn hoàn thành"
                value={deadlineFilter}
                onChange={(event) => {
                  setDeadlineFilter(event.target.value as WarehouseTaskDeadlineStatus | '')
                  setPage(1)
                }}
                className="w-full sm:w-40"
              >
                <NativeSelectOption value="">Mọi thời hạn</NativeSelectOption>
                <NativeSelectOption value="Overdue">Quá hạn</NativeSelectOption>
                <NativeSelectOption value="DueSoon">Sắp đến hạn</NativeSelectOption>
                <NativeSelectOption value="OnTrack">Đúng tiến độ</NativeSelectOption>
                <NativeSelectOption value="NoDeadline">Chưa đặt hạn</NativeSelectOption>
              </NativeSelect>
              {canCreateRelocation ? (
                <Button
                  type="button"
                  className="col-span-2 sm:col-auto"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus aria-hidden="true" /> Tạo task điều chuyển
                </Button>
              ) : null}
            </div>
          }
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize)
            setPage(1)
          }}
          onRetry={() => {
            void query.refetch()
            if (canSeeOwnWork) void ownWorkQuery.refetch()
          }}
          canManage={canManageOwnTasks}
          isActionPending={action.isPending}
          onAction={manage}
          onOpenRelocation={(task) => setSelectedTaskId(task.id)}
          onEditSchedule={canAssignRelocation ? openSchedule : undefined}
        />
      </div>
      <CreateRelocationTaskDialog
        open={createOpen && canCreateRelocation}
        form={createForm}
        fields={createLines.fields}
        warehouseOptions={warehouseOptionsQuery.data ?? []}
        inventoryOptions={inventoryOptions}
        slotOptions={locationQuery.data?.items ?? []}
        sourceSearch={sourceSearch}
        isPending={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onWarehouseChange={changeCreateWarehouse}
        onSourceChange={changeSource}
        onSourceSearchChange={setSourceSearch}
        onAddLine={() => createLines.append({ ...EMPTY_LINE })}
        onRemoveLine={createLines.remove}
        onSubmit={(values) => void createRelocation(values)}
      />
      <RelocationTaskDialog
        open={Boolean(selectedTaskId)}
        detail={detailQuery.data}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        scope={scope}
        canAssign={canAssignRelocation && !split.data?.isSplit}
        canExecute={canManageOwnTasks && detailQuery.data?.assignedTo === meQuery.data?.id}
        canOverrideDestination={canAssignRelocation}
        staffOptions={assignableStaff}
        assignmentStaffId={assignmentStaffId || detailQuery.data?.assignedTo || ''}
        assignmentReason={assignmentReason}
        recommendations={recommendationsQuery.data ?? []}
        recommendationsLoading={recommendationsQuery.isLoading}
        executeForm={executeForm}
        isAssigning={assignMutation.isPending}
        isExecuting={executeMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null)
            setIsSplitOpen(false)
            setAssignmentStaffId('')
            setAssignmentReason('')
          }
        }}
        onRetry={() => void detailQuery.refetch()}
        onAssignmentStaffChange={setAssignmentStaffId}
        onAssignmentReasonChange={setAssignmentReason}
        onAssign={() => void assignRelocation()}
        onLineChange={changeExecuteLine}
        onExecute={(values) => void executeRelocation(values)}
        taskSplitAction={
          <TaskSplitButton state={split.data} onSplit={() => setIsSplitOpen(true)} />
        }
        taskSplitSection={
          <TaskSplitSection
            state={split.data}
            isError={split.isError}
            onRetry={() => void split.refetch()}
            open={isSplitOpen}
            onOpenChange={setIsSplitOpen}
            invalidateKeys={[['warehouse-tasks']]}
          />
        }
      />
      <Dialog
        open={Boolean(pendingReason)}
        onOpenChange={(open) => !open && !action.isPending && setPendingReason(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingReason?.action === 'Pause' ? 'Tạm dừng công việc' : 'Trả lại công việc'}
            </DialogTitle>
            <DialogDescription>
              {pendingReason?.action === 'Pause'
                ? 'Công việc vẫn thuộc về bạn và có thể tiếp tục sau.'
                : 'Công việc sẽ trở về trạng thái chưa giao để quản lý kho giao cho người khác.'}{' '}
              <span className="font-mono">{pendingReason?.task.referenceCode}</span>
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(reasonError)}>
            <FieldLabel htmlFor="warehouse-task-reason">Lý do</FieldLabel>
            <Textarea
              id="warehouse-task-reason"
              rows={3}
              maxLength={500}
              value={reason}
              aria-invalid={Boolean(reasonError)}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError('')
              }}
            />
            <FieldError>{reasonError}</FieldError>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={action.isPending}
              onClick={() => setPendingReason(null)}
            >
              Hủy
            </Button>
            <Button type="button" disabled={action.isPending} onClick={() => void confirmReason()}>
              {action.isPending ? 'Đang lưu…' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WarehouseTaskScheduleDialog
        task={scheduleTask}
        form={scheduleForm}
        isPending={scheduleMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setScheduleTask(null)
        }}
        onSubmit={() => void scheduleForm.handleSubmit(updateSchedule)()}
      />
    </>
  )
}
