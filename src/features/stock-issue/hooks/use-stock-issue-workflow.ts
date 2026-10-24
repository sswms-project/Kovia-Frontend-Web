import { useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { stockIssueService } from '../services/stock-issue.service'
import { APP_ROUTES } from '@/routes/app-routes'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import {
  getApiErrorCode,
  getApiErrorMessage,
  isApiErrorResponse,
  logApiError,
} from '@/lib/api-error'
import {
  recordStockPickingSchema,
  type RecordStockPickingFormValues,
} from '../schemas/stock-issue.schema'
import type {
  StockIssueCapabilities,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../types/stock-issue.types'
import { buildStockPickingLines } from '../utils/stock-issue-picking'
import { crossDockService } from '../services/cross-dock.service'
import {
  assignWarehouseTaskSchema,
  type AssignWarehouseTaskFormValues,
} from '@/features/inbound/schemas/inbound.schema'
import type { RecordStockPickingRequest } from '../types/stock-issue.types'
import {
  useAssignStockIssuePickerMutation,
  useAuthorizeStockDispatchMutation,
  useCancelStockIssueRequestMutation,
  useConfirmStockDispatchMutation,
  useRecordStockPickingMutation,
  useReleaseStockIssueRequestMutation,
  useRemovePickDetailMutation,
  useReportStockIssuePickIssueMutation,
} from './use-stock-issue-requests'

const MISSING_VERSION_MESSAGE = 'Phiếu xuất chưa có phiên bản. Vui lòng tải lại.'

function notifyError(error: unknown, fallback: string) {
  logApiError(error)
  toast.error(getApiErrorMessage(error, fallback))
}

/**
 * Luồng thao tác trên một phiếu xuất (giao việc, lấy hàng, cho phép xuất, xác nhận rời kho, huỷ)
 * dùng chung cho trang danh sách và trang chi tiết. `contextWarehouseId` là kho của phiếu đang
 * xem để tải sẵn danh sách người lấy hàng khi chưa mở hộp thoại giao việc.
 */
export function useStockIssueWorkflow(contextWarehouseId?: string) {
  const router = useRouter()
  const client = useQueryClient()
  const [pickingOrder, setPickingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [dispatchingOrder, setDispatchingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [authorizingOrder, setAuthorizingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [releasingOrder, setReleasingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [reportingOrder, setReportingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [cancellingOrder, setCancellingOrder] = useState<StockIssueRequestSummary | null>(null)
  const releaseForm = useForm<AssignWarehouseTaskFormValues>({
    resolver: zodResolver(assignWarehouseTaskSchema),
    defaultValues: { staffId: '', priority: 'Normal', dueAt: '', reason: '' },
  })
  const preparingPick = useRef(false)
  const savingPick = useRef(false)
  const [advancingPick, setAdvancingPick] = useState(false)
  const [pickNeedsRefresh, setPickNeedsRefresh] = useState(false)
  const pickIntent = useRef<{ id: string; request: RecordStockPickingRequest } | null>(null)
  const [pickUncertain, setPickUncertain] = useState(false)
  const pickCommand = useRef<{ body: string; commandId: string } | null>(null)

  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions
  const capabilities = useMemo<StockIssueCapabilities>(() => {
    const granted = permissions ?? []
    return {
      canCreate: granted.includes(P.STOCK_ISSUE_REQUESTS_CREATE),
      canAssignPicker: granted.includes(P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER),
      canPick: granted.includes(P.STOCK_ISSUE_REQUESTS_PICK),
      canAuthorizeDispatch: granted.includes(P.STOCK_ISSUE_REQUESTS_AUTHORIZE_DISPATCH),
      canDispatch: granted.includes(P.STOCK_ISSUE_REQUESTS_DISPATCH),
      canCancel: granted.includes(P.STOCK_ISSUE_REQUESTS_CANCEL),
    }
  }, [permissions])

  const pickerWarehouseId = releasingOrder?.warehouseId ?? contextWarehouseId
  const canLoadPickers = capabilities.canAssignPicker && Boolean(pickerWarehouseId)
  const staffQuery = useStaffListQuery(
    STAFF_DIRECTORY_KINDS.staff,
    { top: 100, skip: 0, needTotalCount: true },
    canLoadPickers
  )
  const managerQuery = useStaffListQuery(
    STAFF_DIRECTORY_KINDS.managers,
    { top: 100, skip: 0, needTotalCount: true },
    canLoadPickers
  )
  const pickerOptions = useMemo(() => {
    const candidates = [...(staffQuery.data?.items ?? []), ...(managerQuery.data?.items ?? [])]
    return candidates
      .filter(
        (staff, index) =>
          staff.status === 'Active' &&
          Boolean(pickerWarehouseId && staff.assignedWarehouseIds.includes(pickerWarehouseId)) &&
          candidates.findIndex((candidate) => candidate.id === staff.id) === index
      )
      .map((staff) => ({
        id: staff.id,
        name: staff.fullName,
        fullName: staff.fullName,
        email: staff.email,
      }))
  }, [managerQuery.data?.items, pickerWarehouseId, staffQuery.data?.items])

  const recordPickingMutation = useRecordStockPickingMutation()
  const confirmDispatchMutation = useConfirmStockDispatchMutation()
  const authorizeDispatchMutation = useAuthorizeStockDispatchMutation()
  const removePickDetailMutation = useRemovePickDetailMutation()
  const releaseMutation = useReleaseStockIssueRequestMutation()
  const cancelMutation = useCancelStockIssueRequestMutation()
  const assignPickerMutation = useAssignStockIssuePickerMutation()
  const reportPickIssueMutation = useReportStockIssuePickIssueMutation()

  const pickingForm = useForm<RecordStockPickingFormValues>({
    resolver: zodResolver(recordStockPickingSchema),
    defaultValues: { lines: [] },
  })

  function closePicking() {
    if (savingPick.current || pickUncertain) return
    setPickingOrder(null)
    setPickNeedsRefresh(false)
    pickingForm.reset({ lines: [] })
  }

  async function preparePicking(order: StockIssueRequestSummary) {
    const lines = buildStockPickingLines(order)
    const stockIds = [...new Set(lines.map((line) => line.inventoryStockId).filter(Boolean))]
    const destinations = stockIds.length
      ? await crossDockService.destinations(order.id, stockIds)
      : []
    if (
      destinations.length !== stockIds.length ||
      new Set(destinations.map((target) => target.inventoryStockId)).size !== stockIds.length ||
      stockIds.some(
        (stockId) => !destinations.some((target) => target.inventoryStockId === stockId)
      ) ||
      destinations.some(
        (target) =>
          target.stockIssueRequestId !== order.id ||
          target.warehouseId !== order.warehouseId ||
          target.version !== order.version
      )
    )
      throw new Error('Phiếu đã thay đổi. Tải lại trước khi lấy hàng.')
    pickingForm.reset({
      lines: lines.map((line) => {
        const destination = destinations.find(
          (target) => target.inventoryStockId === line.inventoryStockId
        )
        return {
          ...line,
          destinationStagingSlotId: destination?.slotId,
          stagingSlotCode: destination?.slotCode,
          stagingPath: destination?.path,
        }
      }),
    })
    pickCommand.current = null
    setPickingOrder(order)
  }

  // Vị trí cần lấy đã nằm sẵn trong phiếu nên nhân viên không cần quyền xem tồn kho.
  async function openPicking(order: StockIssueRequestSummary) {
    if (
      preparingPick.current ||
      savingPick.current ||
      pickUncertain ||
      !capabilities.canPick ||
      meQuery.isError ||
      !order.version
    )
      return
    preparingPick.current = true
    try {
      const fresh = await client.fetchQuery({
        queryKey: queryKeys.stockIssueRequests.detail(order.id),
        staleTime: 0,
        retry: false,
        queryFn: () =>
          stockIssueService.getStockIssueRequest(order.id).then((response) => response.data),
      })
      if (fresh.id !== order.id || fresh.warehouseId !== order.warehouseId || !fresh.version)
        throw new Error('Không xác định được phiếu mới nhất. Hãy tải lại.')
      if (fresh.status !== 'Picking' && fresh.status !== 'ReleasedForPicking') {
        toast.info('Phiếu không còn hàng chờ lấy hoặc không còn ở trạng thái lấy hàng.')
        return
      }
      await preparePicking(fresh)
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode === 409) {
        logApiError(error)
        const stagingConflict = [
          'STOCK_ISSUE_STAGING_MISSING',
          'STOCK_ISSUE_STAGING_INACTIVE',
          'STOCK_ISSUE_STAGING_SAME_SOURCE',
          'STOCK_ISSUE_STAGING_INCOMPATIBLE',
        ].includes(getApiErrorCode(error) ?? '')
        const canConfigure =
          !meQuery.isError &&
          !meQuery.isFetching &&
          permissions?.includes(P.WAREHOUSES_CONFIGURE_LAYOUT) &&
          permissions.includes(P.WAREHOUSES_VIEW)
        toast.warning(getApiErrorMessage(error), {
          description: stagingConflict
            ? `Chưa ghi nhận lấy hoặc di chuyển hàng. ${canConfigure ? 'Kiểm tra khu vực và điểm chờ xuất của đúng kho.' : 'Liên hệ quản lý kho để kiểm tra điểm chờ xuất.'}`
            : 'Chưa ghi nhận lấy hàng. Tải lại phiếu trước khi thử lại.',
          duration: 12000,
          closeButton: true,
          ...(stagingConflict && canConfigure
            ? {
                action: {
                  label: 'Cấu hình kho',
                  onClick: () => router.push(APP_ROUTES.warehouseLayoutDesigner(order.warehouseId)),
                },
              }
            : {}),
        })
      } else notifyError(error, 'Không tải được khu chờ xuất hợp lệ. Chưa ghi nhận lấy hàng.')
    } finally {
      preparingPick.current = false
    }
  }

  async function refreshPicking() {
    if (!pickingOrder) return
    setAdvancingPick(true)
    setPickNeedsRefresh(true)
    try {
      const key = queryKeys.stockIssueRequests.detail(pickingOrder.id)
      const cached = client.getQueryData<StockIssueRequestSummary>(key)
      const fresh =
        cached?.version &&
        cached.version !== pickingOrder.version &&
        client.getQueryState(key)?.status === 'success'
          ? cached
          : await client.fetchQuery({
              queryKey: key,
              staleTime: 0,
              retry: false,
              queryFn: () =>
                stockIssueService
                  .getStockIssueRequest(pickingOrder.id)
                  .then((response) => response.data),
            })
      if (
        fresh.id !== pickingOrder.id ||
        fresh.warehouseId !== pickingOrder.warehouseId ||
        !fresh.version ||
        fresh.version === pickingOrder.version
      )
        throw new Error('Chưa nhận được phiên bản mới của phiếu. Hãy tải lại.')
      if (fresh.status !== 'Picking' && fresh.status !== 'ReleasedForPicking') {
        setPickingOrder(null)
        pickingForm.reset({ lines: [] })
      } else await preparePicking(fresh)
      pickIntent.current = null
      setPickNeedsRefresh(false)
    } catch (error) {
      logApiError(error)
      toast.warning(
        'Lượt lấy đã được lưu nhưng chưa tải được phần còn lại. Chỉ tải lại phiếu, không xác nhận lại lượt đã lưu.'
      )
    } finally {
      setAdvancingPick(false)
    }
  }

  async function submitPicking(values: RecordStockPickingFormValues) {
    if (
      !pickingOrder?.version ||
      !capabilities.canPick ||
      meQuery.isError ||
      meQuery.isFetching ||
      recordPickingMutation.isPending ||
      savingPick.current ||
      pickNeedsRefresh
    )
      return
    savingPick.current = true
    try {
      const request: RecordStockPickingRequest = {
        expectedVersion: pickingOrder.version,
        items: values.lines
          .filter((line) => line.pickedQuantity > 0)
          .map((line) => ({
            stockIssueRequestItemId: line.stockIssueRequestItemId,
            inventoryStockId: line.inventoryStockId,
            // Conversion factors support six decimals; remove binary noise without rounding to storage scale.
            pickedQuantity: Number((line.pickedQuantity * line.unitFactor).toFixed(6)),
            scannedBarcode: line.scannedBarcode?.trim() || null,
            scannedSlotCode: line.scannedSlotCode?.trim() || null,
            destinationStagingSlotId: line.destinationStagingSlotId,
          })),
      }
      const body = JSON.stringify(request)
      if (!pickUncertain) {
        if (pickCommand.current?.body !== body)
          pickCommand.current = { body, commandId: crypto.randomUUID() }
        pickIntent.current = {
          id: pickingOrder.id,
          request: { ...request, commandId: pickCommand.current.commandId },
        }
      }
      const intent = pickIntent.current
      if (!intent) return
      await recordPickingMutation.mutateAsync({
        stockIssueRequestId: intent.id,
        request: intent.request,
      })
      toast.success('Đã ghi nhận lấy hàng và chuyển hàng ra khu chờ xuất.')
      setPickUncertain(false)
      await refreshPicking()
    } catch (error) {
      setPickUncertain(
        !isApiErrorResponse(error) || error.statusCode >= 500 || error.statusCode === 408
      )
      notifyError(error, 'Không thể ghi nhận lấy hàng. Vui lòng thử lại.')
    } finally {
      savingPick.current = false
    }
  }

  function canConfirmDispatch(order: StockIssueRequestSummary) {
    if (meQuery.isError || meQuery.isFetching || !meQuery.data?.id || !capabilities.canDispatch) {
      toast.warning('Chưa xác định được quyền xác nhận xuất kho. Hãy tải lại thông tin tài khoản.')
      return false
    }
    if (order.assignedStaffId && order.assignedStaffId !== meQuery.data.id) {
      toast.warning(
        `Phiếu này do ${order.assignedStaffName || 'người được giao lấy hàng'} phụ trách xác nhận hàng rời kho.`,
        { description: 'Có quyền xác nhận xuất kho không thay thế việc được phân công cho phiếu.' }
      )
      return false
    }
    if (order.status !== 'AuthorizedForDispatch') {
      toast.warning('Phiếu chưa được cho phép xuất kho hoặc trạng thái đã thay đổi. Hãy tải lại.')
      return false
    }
    return true
  }

  async function confirmDispatch() {
    if (
      !dispatchingOrder ||
      confirmDispatchMutation.isPending ||
      !canConfirmDispatch(dispatchingOrder)
    )
      return
    try {
      await confirmDispatchMutation.mutateAsync(dispatchingOrder.id)
      toast.success('Đã xác nhận hàng rời kho và ghi giảm tồn kho.')
      setDispatchingOrder(null)
    } catch (error) {
      notifyError(error, 'Không thể xác nhận xuất kho.')
    }
  }

  async function authorizeDispatch() {
    if (!authorizingOrder) return
    try {
      await authorizeDispatchMutation.mutateAsync(authorizingOrder.id)
      toast.success('Đã cho phép nhân viên xác nhận hàng rời kho.')
      setAuthorizingOrder(null)
    } catch (error) {
      notifyError(error, 'Không thể cho phép xuất kho.')
    }
  }

  async function cancel(reason: string) {
    if (!cancellingOrder) return
    if (!cancellingOrder.version) {
      toast.error(MISSING_VERSION_MESSAGE)
      return
    }
    try {
      await cancelMutation.mutateAsync({
        stockIssueRequestId: cancellingOrder.id,
        commandId: crypto.randomUUID(),
        expectedVersion: cancellingOrder.version,
        reason,
      })
      toast.success('Đã huỷ phiếu xuất và giải phóng tồn kho giữ chỗ.')
      setCancellingOrder(null)
    } catch (error) {
      notifyError(error, 'Không thể huỷ phiếu xuất.')
    }
  }

  function openRelease(order: StockIssueRequestSummary) {
    releaseForm.reset({
      staffId: order.assignedStaffId ?? '',
      priority: 'Normal',
      dueAt: '',
      reason: '',
    })
    setReleasingOrder(order)
  }

  async function releaseForPicking(values: AssignWarehouseTaskFormValues) {
    if (
      !releasingOrder ||
      releaseMutation.isPending ||
      staffQuery.isError ||
      managerQuery.isError ||
      !pickerOptions.some((option) => option.id === values.staffId)
    )
      return
    if (!releasingOrder.version) {
      toast.error(MISSING_VERSION_MESSAGE)
      return
    }
    try {
      await releaseMutation.mutateAsync({
        stockIssueRequestId: releasingOrder.id,
        commandId: crypto.randomUUID(),
        expectedVersion: releasingOrder.version,
        assignedStaffId: values.staffId,
      })
      toast.success('Đã giao việc lấy hàng và giữ tồn kho.')
      setReleasingOrder(null)
      releaseForm.reset({ staffId: '', priority: 'Normal', dueAt: '', reason: '' })
    } catch (error) {
      notifyError(error, 'Không thể giao việc lấy hàng.')
    }
  }

  async function reportPickIssue(reason: string) {
    if (!reportingOrder) return
    try {
      await reportPickIssueMutation.mutateAsync({
        stockIssueRequestId: reportingOrder.id,
        reason,
      })
      toast.success('Đã gửi báo cáo hàng lỗi cho chủ doanh nghiệp.')
      setReportingOrder(null)
    } catch (error) {
      notifyError(error, 'Không thể gửi báo cáo.')
    }
  }

  async function assignPicker(order: StockIssueRequestSummary, staffId: string) {
    if (!order.version) {
      toast.error(MISSING_VERSION_MESSAGE)
      return
    }
    try {
      await assignPickerMutation.mutateAsync({
        stockIssueRequestId: order.id,
        staffId,
        expectedVersion: order.version,
      })
      toast.success('Đã giao người lấy hàng.')
    } catch (error) {
      notifyError(error, 'Không thể giao người lấy hàng.')
    }
  }

  async function removePickDetail(stockIssueRequestId: string, pickDetailId: string) {
    try {
      await removePickDetailMutation.mutateAsync({ stockIssueRequestId, pickDetailId })
      toast.success('Đã bỏ dòng phân bổ chưa xuất kho.')
    } catch (error) {
      notifyError(error, 'Không thể bỏ dòng phân bổ.')
    }
  }

  const handlers: StockIssueRowActionHandlers = {
    onReleaseForPicking: openRelease,
    onRecordStockPicking: (order) => {
      void openPicking(order)
    },
    onReportPickIssue: setReportingOrder,
    onAuthorizeDispatch: setAuthorizingOrder,
    onConfirmDispatch: (order) => {
      if (canConfirmDispatch(order)) setDispatchingOrder(order)
    },
    onCancel: setCancellingOrder,
  }

  return {
    capabilities,
    handlers,
    pickerOptions,
    assignPicker,
    removePickDetail,
    isAssigningPicker: assignPickerMutation.isPending,
    isRemovingPick: removePickDetailMutation.isPending,
    picking: {
      needsRefresh: pickNeedsRefresh,
      onRefresh: () => void refreshPicking(),
      isUncertain: pickUncertain,
      order: pickingOrder,
      form: pickingForm,
      isPending: recordPickingMutation.isPending || advancingPick,
      onOpenChange: (open: boolean) => {
        if (!open) closePicking()
      },
      onSubmit: submitPicking,
    },
    release: {
      order: releasingOrder,
      form: releaseForm,
      isPending: releaseMutation.isPending,
      isLoadingStaff: staffQuery.isLoading || managerQuery.isLoading,
      isErrorStaff: staffQuery.isError || managerQuery.isError,
      isFetchingStaff: staffQuery.isFetching || managerQuery.isFetching,
      onRetryStaff: () => {
        void staffQuery.refetch()
        void managerQuery.refetch()
      },
      onClose: () => setReleasingOrder(null),
      onConfirm: () => void releaseForm.handleSubmit(releaseForPicking)(),
    },
    authorize: {
      order: authorizingOrder,
      isPending: authorizeDispatchMutation.isPending,
      onClose: () => setAuthorizingOrder(null),
      onConfirm: () => void authorizeDispatch(),
    },
    dispatch: {
      order: dispatchingOrder,
      isPending: confirmDispatchMutation.isPending,
      onClose: () => setDispatchingOrder(null),
      onConfirm: () => void confirmDispatch(),
    },
    cancel: {
      order: cancellingOrder,
      isPending: cancelMutation.isPending,
      onClose: () => setCancellingOrder(null),
      onConfirm: (reason: string) => void cancel(reason),
    },
    report: {
      order: reportingOrder,
      isPending: reportPickIssueMutation.isPending,
      onClose: () => setReportingOrder(null),
      onConfirm: (reason: string) => void reportPickIssue(reason),
    },
  }
}

export type StockIssueWorkflow = ReturnType<typeof useStockIssueWorkflow>
