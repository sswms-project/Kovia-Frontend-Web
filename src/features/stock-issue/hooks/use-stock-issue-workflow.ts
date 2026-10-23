import { useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
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
  logger.error(formatApiError(error))
  toast.error(getApiErrorMessage(error, fallback))
}

/**
 * Luồng thao tác trên một phiếu xuất (giao việc, lấy hàng, cho phép xuất, xác nhận rời kho, huỷ)
 * dùng chung cho trang danh sách và trang chi tiết. `contextWarehouseId` là kho của phiếu đang
 * xem để tải sẵn danh sách người lấy hàng khi chưa mở hộp thoại giao việc.
 */
export function useStockIssueWorkflow(contextWarehouseId?: string) {
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
    setPickingOrder(null)
    pickingForm.reset({ lines: [] })
  }

  // Vị trí cần lấy đã nằm sẵn trong phiếu nên nhân viên không cần quyền xem tồn kho.
  async function openPicking(order: StockIssueRequestSummary) {
    if (preparingPick.current || !capabilities.canPick || meQuery.isError || !order.version) return
    preparingPick.current = true
    try {
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
            scannedStagingSlotCode: '',
          }
        }),
      })
      pickCommand.current = null
      setPickingOrder(order)
    } catch (error) {
      notifyError(error, 'Không tải được khu chờ xuất hợp lệ. Chưa ghi nhận lấy hàng.')
    } finally {
      preparingPick.current = false
    }
  }

  async function submitPicking(values: RecordStockPickingFormValues) {
    if (
      !pickingOrder?.version ||
      !capabilities.canPick ||
      meQuery.isError ||
      meQuery.isFetching ||
      recordPickingMutation.isPending
    )
      return
    try {
      const request: RecordStockPickingRequest = {
        expectedVersion: pickingOrder.version,
        items: values.lines
          .filter((line) => line.pickedQuantity > 0)
          .map((line) => ({
            stockIssueRequestItemId: line.stockIssueRequestItemId,
            inventoryStockId: line.inventoryStockId,
            pickedQuantity: line.pickedQuantity * line.unitFactor,
            scannedBarcode: line.scannedBarcode?.trim() || null,
            scannedSlotCode: line.scannedSlotCode?.trim() || null,
            destinationStagingSlotId: line.destinationStagingSlotId,
            scannedStagingSlotCode: line.scannedStagingSlotCode?.trim() || null,
          })),
      }
      const body = JSON.stringify(request)
      if (pickCommand.current?.body !== body)
        pickCommand.current = { body, commandId: crypto.randomUUID() }
      await recordPickingMutation.mutateAsync({
        stockIssueRequestId: pickingOrder.id,
        request: { ...request, commandId: pickCommand.current.commandId },
      })
      toast.success('Đã ghi nhận lấy hàng và chuyển hàng ra khu chờ xuất.')
      closePicking()
    } catch (error) {
      notifyError(error, 'Không thể ghi nhận lấy hàng. Vui lòng thử lại.')
    }
  }

  async function confirmDispatch() {
    if (!dispatchingOrder) return
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
    onConfirmDispatch: setDispatchingOrder,
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
      order: pickingOrder,
      form: pickingForm,
      isPending: recordPickingMutation.isPending,
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
