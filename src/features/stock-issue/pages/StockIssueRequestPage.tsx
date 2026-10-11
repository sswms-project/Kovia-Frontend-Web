'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useInventoryReservationsQuery } from '@/features/inventory/hooks/use-inventory'
import { useWarehouseLocationsQuery } from '@/features/warehouse/hooks/use-warehouse'
import {
  RecordStockPickingDialog,
  StockIssueRequestDetailSheet,
  StockIssueRequestDirectory,
  CreateGoodsReturnRequestDialog,
  CancelStockIssueRequestDialog,
  ReportPickIssueDialog,
} from '../components/StockIssueRequestsPage'
import {
  useStockRecipientOptionsQuery,
  useRecordStockPickingMutation,
  useReportStockIssuePickIssueMutation,
  useStockIssueRequestQuery,
  useStockIssueRequestsQuery,
  useCreateGoodsReturnRequestMutation,
  useAuthorizeStockDispatchMutation,
  useConfirmStockDispatchMutation,
  useRemovePickDetailMutation,
  useReleaseStockIssueRequestMutation,
  useCancelStockIssueRequestMutation,
  useAssignStockIssuePickerMutation,
} from '../hooks/use-stock-issue-requests'
import {
  recordStockPickingSchema,
  createGoodsReturnRequestSchema,
  type RecordStockPickingFormValues,
  type CreateGoodsReturnRequestFormValues,
} from '../schemas/stock-issue.schema'
import type { StockIssueRequestStatus, StockIssueRequestSummary } from '../types/stock-issue.types'

function toRecordStockPickingLines(
  order: StockIssueRequestSummary
): RecordStockPickingFormValues['lines'] {
  return order.items.map((item) => ({
    stockIssueRequestItemId: item.id,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    barcode: item.barcode,
    remainingQuantity: Math.max(0, item.quantity - item.pickedQuantity),
    inventoryStockId: '',
    availableQuantity: 0,
    pickedQuantity: 0,
    scannedBarcode: '',
  }))
}

export default function StockIssueRequestPage({
  initialRequestId,
}: { readonly initialRequestId?: string } = {}) {
  const [linkedRequestId, setLinkedRequestId] = useState(initialRequestId)
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<StockIssueRequestStatus | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [stockRecipientId, setStockRecipientId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [inspectedOrder, setInspectedOrder] = useState<StockIssueRequestSummary | null>(null)
  const router = useRouter()
  const [issuingOrder, setIssuingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [returningOrder, setGoodsReturnRequestingOrder] = useState<StockIssueRequestSummary | null>(
    null
  )
  const [dispatchingOrder, setDispatchingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [dispatchScanText, setDispatchScanText] = useState('')
  const [authorizingOrder, setAuthorizingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [releasingOrder, setReleasingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [reportingOrder, setReportingOrder] = useState<StockIssueRequestSummary | null>(null)
  const reportPickIssueMutation = useReportStockIssuePickIssueMutation()
  const [cancellingOrder, setCancellingOrder] = useState<StockIssueRequestSummary | null>(null)
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [releaseStaffId, setReleaseStaffId] = useState('')
  const [issueInventorySearch, setIssueInventorySearch] = useState('')
  const [returnSlotSearch, setGoodsReturnRequestSlotSearch] = useState('')

  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const debouncedGoodsReturnRequestSlotSearch = useDebouncedValue(returnSlotSearch, 350)

  const meQuery = useMeQuery()
  const ordersQuery = useStockIssueRequestsQuery({
    pageNumber: page,
    pageSize,
    ...(status ? { status } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    ...(stockRecipientId ? { stockRecipientId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(assignedToMe ? { assignedToMe } : {}),
  })
  const stockRecipientOptionsQuery = useStockRecipientOptionsQuery({ pageNumber: 1, pageSize: 200 })
  const orderDetailQuery = useStockIssueRequestQuery(inspectedOrder?.id ?? linkedRequestId ?? null)
  const reservationQuery = useInventoryReservationsQuery(
    {
      pageNumber: 1,
      pageSize: 100,
      status: 'Active',
      ...(issuingOrder ? { warehouseId: issuingOrder.warehouseId } : {}),
    },
    Boolean(issuingOrder)
  )
  const returnSlotsQuery = useWarehouseLocationsQuery(returningOrder?.warehouseId ?? '', {
    top: 200,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
    ...(debouncedGoodsReturnRequestSlotSearch.trim()
      ? { searchText: debouncedGoodsReturnRequestSlotSearch.trim() }
      : {}),
  })
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })

  const canPick = (meQuery.data?.permissions ?? []).includes(P.STOCK_ISSUE_REQUESTS_PICK)
  const canAssignPicker = (meQuery.data?.permissions ?? []).includes(
    P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER
  )
  const pickerWarehouseId = releasingOrder?.warehouseId ?? orderDetailQuery.data?.warehouseId
  const staffQuery = useStaffListQuery(
    STAFF_DIRECTORY_KINDS.staff,
    { top: 100, skip: 0, needTotalCount: true },
    canAssignPicker && Boolean(pickerWarehouseId)
  )
  const managerQuery = useStaffListQuery(
    STAFF_DIRECTORY_KINDS.managers,
    { top: 100, skip: 0, needTotalCount: true },
    canAssignPicker && Boolean(pickerWarehouseId)
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
      .map((staff) => ({ id: staff.id, name: staff.fullName }))
  }, [managerQuery.data?.items, pickerWarehouseId, staffQuery.data?.items])
  const assignPickerMutation = useAssignStockIssuePickerMutation()

  const recordStockPickingMutation = useRecordStockPickingMutation()
  const createGoodsReturnRequestMutation = useCreateGoodsReturnRequestMutation()
  const confirmDispatchMutation = useConfirmStockDispatchMutation()
  const authorizeDispatchMutation = useAuthorizeStockDispatchMutation()
  const removePickDetailMutation = useRemovePickDetailMutation()
  const releaseForPickingMutation = useReleaseStockIssueRequestMutation()
  const cancelMutation = useCancelStockIssueRequestMutation()

  const recordStockPickingForm = useForm<RecordStockPickingFormValues>({
    resolver: zodResolver(recordStockPickingSchema),
    defaultValues: { lines: [] },
  })
  const returnForm = useForm<CreateGoodsReturnRequestFormValues>({
    resolver: zodResolver(createGoodsReturnRequestSchema),
    defaultValues: { reason: '', lines: [] },
  })

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        id: warehouse.id,
        name: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )

  const items = ordersQuery.data?.items ?? []

  function updateFilter<TValue>(setValue: (value: TValue) => void, value: TValue) {
    setValue(value)
    setPage(1)
  }

  function handleRecordStockPickingDialogOpenChange(open: boolean) {
    if (!open) {
      setIssuingOrder(null)
      recordStockPickingForm.reset({ lines: [] })
      setIssueInventorySearch('')
    }
  }

  function handleOpenRecordStockPicking(order: StockIssueRequestSummary) {
    recordStockPickingForm.reset({ lines: toRecordStockPickingLines(order) })
    setIssueInventorySearch('')
    setIssuingOrder(order)
  }

  async function handleRecordStockPicking(values: RecordStockPickingFormValues) {
    if (!issuingOrder) return

    try {
      await recordStockPickingMutation.mutateAsync({
        stockIssueRequestId: issuingOrder.id,
        request: {
          items: values.lines
            .filter((line) => line.pickedQuantity > 0)
            .map((line) => ({
              stockIssueRequestItemId: line.stockIssueRequestItemId,
              inventoryStockId: line.inventoryStockId,
              pickedQuantity: line.pickedQuantity,
              scannedBarcode: line.scannedBarcode?.trim() || null,
              scannedSlotCode: line.scannedSlotCode?.trim() || null,
            })),
        },
      })
      toast.success('Đã ghi nhận lấy hàng và giữ tồn kho cho yêu cầu xuất kho.')
      handleRecordStockPickingDialogOpenChange(false)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể ghi nhận lấy hàng. Vui lòng thử lại.'))
    }
  }

  const allowableByPickDetail = useMemo(() => {
    if (!returningOrder) return {}
    return Object.fromEntries(
      returningOrder.items.flatMap((item) =>
        item.pickDetails.map((detail) => [detail.id, Math.max(0, detail.returnableQuantity)])
      )
    )
  }, [returningOrder])

  function openGoodsReturnRequest(order: StockIssueRequestSummary) {
    setGoodsReturnRequestingOrder(order)
    setGoodsReturnRequestSlotSearch('')
    returnForm.reset({
      reason: '',
      lines: order.items.flatMap((item) =>
        item.pickDetails
          .filter((detail) => detail.issuedAt && detail.returnableQuantity > 0)
          .map((detail) => ({
            stockIssuePickDetailId: detail.id,
            productName: item.productName,
            lotNumber: detail.lotNumber,
            returnableQuantity: detail.returnableQuantity,
            quantity: 0,
            condition: 'Good',
            restockSlotId: '',
          }))
      ),
    })
  }

  async function handleCreateGoodsReturnRequest(values: CreateGoodsReturnRequestFormValues) {
    if (!returningOrder) return
    const invalid = values.lines.some((line) => line.quantity > line.returnableQuantity)
    if (invalid) {
      toast.error('Số lượng trả vượt quá số lượng cho phép.')
      return
    }
    try {
      await createGoodsReturnRequestMutation.mutateAsync({
        stockIssueRequestId: returningOrder.id,
        request: {
          reason: values.reason,
          items: values.lines
            .filter((line) => line.quantity > 0)
            .map((line) => ({
              stockIssuePickDetailId: line.stockIssuePickDetailId,
              quantity: line.quantity,
              condition: line.condition,
              restockSlotId: line.condition === 'Scrap' ? null : line.restockSlotId,
            })),
        },
      })
      toast.success('Đã tạo yêu cầu trả hàng.')
      setGoodsReturnRequestingOrder(null)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể tạo yêu cầu trả hàng.'))
    }
  }

  async function handleConfirmDispatch() {
    if (!dispatchingOrder) return
    try {
      const scannedBarcodes = dispatchScanText
        .split(/[\s,;]+/)
        .map((code) => code.trim())
        .filter(Boolean)
      await confirmDispatchMutation.mutateAsync({
        stockIssueRequestId: dispatchingOrder.id,
        scannedBarcodes,
      })
      toast.success('Đã xác nhận hàng rời kho và ghi giảm tồn kho.')
      setDispatchingOrder(null)
      setDispatchScanText('')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể xác nhận xuất kho.'))
    }
  }

  async function handleAuthorizeDispatch() {
    if (!authorizingOrder) return
    try {
      await authorizeDispatchMutation.mutateAsync(authorizingOrder.id)
      toast.success('Đã cho phép nhân viên xác nhận hàng rời kho.')
      setAuthorizingOrder(null)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể cho phép xuất kho.'))
    }
  }

  async function handleCancel(reason: string) {
    if (!cancellingOrder) return
    try {
      if (!cancellingOrder.version) {
        toast.error('Phiếu xuất chưa có phiên bản. Vui lòng tải lại.')
        return
      }
      await cancelMutation.mutateAsync({
        stockIssueRequestId: cancellingOrder.id,
        commandId: crypto.randomUUID(),
        expectedVersion: cancellingOrder.version,
        reason,
      })
      toast.success('Đã huỷ phiếu xuất và giải phóng tồn kho giữ chỗ.')
      setCancellingOrder(null)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể huỷ phiếu xuất.'))
    }
  }

  async function handleReleaseForPicking() {
    if (!releasingOrder) return
    try {
      if (!releasingOrder.version) {
        toast.error('Phiếu xuất chưa có phiên bản. Vui lòng tải lại.')
        return
      }
      await releaseForPickingMutation.mutateAsync({
        stockIssueRequestId: releasingOrder.id,
        commandId: crypto.randomUUID(),
        expectedVersion: releasingOrder.version,
        assignedStaffId: releaseStaffId,
      })
      toast.success('Đã giao việc lấy hàng và giữ tồn kho.')
      setReleasingOrder(null)
      setReleaseStaffId('')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể giao việc lấy hàng.'))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <StockIssueRequestDirectory
        items={items}
        totalCount={ordersQuery.data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        status={status}
        warehouseId={warehouseId}
        stockRecipientId={stockRecipientId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        assignedToMe={assignedToMe}
        onAssignedToMeChange={(value) => updateFilter(setAssignedToMe, value)}
        stockRecipientOptions={(stockRecipientOptionsQuery.data?.items ?? []).map(
          (stockRecipient) => ({
            id: stockRecipient.id,
            name: `${stockRecipient.recipientCode} · ${stockRecipient.recipientName}`,
          })
        )}
        warehouseOptions={warehouseOptions}
        permissions={meQuery.data?.permissions ?? []}
        isLoading={ordersQuery.isLoading}
        isFetching={ordersQuery.isFetching}
        isError={ordersQuery.isError}
        onSearchChange={(value) => updateFilter(setSearchText, value)}
        onStatusChange={(value) => updateFilter(setStatus, value)}
        onWarehouseChange={(value) => updateFilter(setWarehouseId, value)}
        onStockRecipientChange={(value) => updateFilter(setStockRecipientId, value)}
        onDateFromChange={(value) => updateFilter(setDateFrom, value)}
        onDateToChange={(value) => updateFilter(setDateTo, value)}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        onRetry={() => void ordersQuery.refetch()}
        onInspect={setInspectedOrder}
        onReleaseForPicking={setReleasingOrder}
        onCancel={setCancellingOrder}
        onReportPickIssue={setReportingOrder}
        onRecordStockPicking={handleOpenRecordStockPicking}
        onAuthorizeDispatch={setAuthorizingOrder}
        onConfirmDispatch={setDispatchingOrder}
        onCreateGoodsReturnRequest={openGoodsReturnRequest}
      />
      <StockIssueRequestDetailSheet
        order={orderDetailQuery.data ?? null}
        isLoading={orderDetailQuery.isLoading}
        isError={orderDetailQuery.isError}
        onRetry={() => void orderDetailQuery.refetch()}
        isRemovingPick={removePickDetailMutation.isPending}
        canAssignPicker={canAssignPicker}
        pickerOptions={pickerOptions}
        isAssigningPicker={assignPickerMutation.isPending}
        canPick={canPick}
        onStartPicking={(o) => {
          setInspectedOrder(null)
          handleOpenRecordStockPicking(o)
        }}
        onReleaseForPicking={(o) => {
          setInspectedOrder(null)
          setReleasingOrder(o)
        }}
        onAssignPicker={(staffId) => {
          const detail = orderDetailQuery.data
          if (!detail?.version) return
          void assignPickerMutation
            .mutateAsync({
              stockIssueRequestId: detail.id,
              staffId,
              expectedVersion: detail.version,
            })
            .then(() => toast.success('Đã giao người lấy hàng.'))
            .catch((error) => {
              logger.error(formatApiError(error))
              toast.error(getApiErrorMessage(error, 'Không thể giao người lấy hàng.'))
            })
        }}
        onRemovePickDetail={(pickDetailId) => {
          const orderId = orderDetailQuery.data?.id
          if (!orderId) return
          void removePickDetailMutation
            .mutateAsync({ stockIssueRequestId: orderId, pickDetailId })
            .then(() => toast.success('Đã bỏ dòng phân bổ chưa xuất kho.'))
            .catch((error) => {
              logger.error(formatApiError(error))
              toast.error(getApiErrorMessage(error, 'Không thể bỏ dòng phân bổ.'))
            })
        }}
        onOpenChange={(open) => {
          if (open) return
          setInspectedOrder(null)
          if (linkedRequestId) {
            setLinkedRequestId(undefined)
            router.replace(APP_ROUTES.stockIssueRequests)
          }
        }}
      />
      <ReportPickIssueDialog
        key={`report-${reportingOrder?.id ?? 'none'}`}
        order={reportingOrder}
        isPending={reportPickIssueMutation.isPending}
        onClose={() => setReportingOrder(null)}
        onConfirm={async (reason) => {
          if (!reportingOrder) return
          try {
            await reportPickIssueMutation.mutateAsync({
              stockIssueRequestId: reportingOrder.id,
              reason,
            })
            toast.success('Đã gửi báo cáo hàng lỗi cho chủ doanh nghiệp.')
            setReportingOrder(null)
          } catch (error) {
            logger.error(formatApiError(error))
            toast.error(getApiErrorMessage(error, 'Không thể gửi báo cáo.'))
          }
        }}
      />
      <CancelStockIssueRequestDialog
        key={cancellingOrder?.id ?? 'none'}
        order={cancellingOrder}
        isPending={cancelMutation.isPending}
        onClose={() => setCancellingOrder(null)}
        onConfirm={(reason) => void handleCancel(reason)}
      />
      <RecordStockPickingDialog
        order={issuingOrder}
        form={recordStockPickingForm}
        isPending={recordStockPickingMutation.isPending}
        onOpenChange={handleRecordStockPickingDialogOpenChange}
        onSubmit={handleRecordStockPicking}
        inventoryOptions={(reservationQuery.data?.items ?? [])
          .filter(
            (item) =>
              item.referenceType === 'StockIssueRequestLine' &&
              issuingOrder?.items.some((line) => line.id === item.referenceId)
          )
          .map((item) => ({
            productId: item.productId,
            inventoryStockId: item.inventoryStockId,
            slotId: item.slotId,
            lotNumber: item.lotNumber,
            qualityStatus: item.qualityStatus,
            label: item.slotCode,
            availableQuantity: item.reservedQuantity,
          }))}
        inventorySearch={issueInventorySearch}
        onInventorySearchChange={setIssueInventorySearch}
      />
      <AlertDialog
        open={Boolean(releasingOrder)}
        onOpenChange={(open) => {
          if (!open && !releaseForPickingMutation.isPending) setReleasingOrder(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Send aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Giao việc lấy hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Chọn nhân viên kho phụ trách. Hệ thống sẽ giữ tồn đủ điều kiện cho phiếu trước khi
              nhân viên lấy hàng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {canAssignPicker ? (
            <NativeSelect
              aria-label="Giao cho nhân viên lấy hàng"
              className="w-full"
              value={releaseStaffId}
              disabled={releaseForPickingMutation.isPending}
              onChange={(event) => setReleaseStaffId(event.target.value)}
            >
              <NativeSelectOption value="">Chọn nhân viên lấy hàng…</NativeSelectOption>
              {pickerOptions.map((option) => (
                <NativeSelectOption key={option.id} value={option.id}>
                  {option.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releaseForPickingMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={releaseForPickingMutation.isPending || !releaseStaffId}
              onClick={() => void handleReleaseForPicking()}
            >
              {releaseForPickingMutation.isPending ? 'Đang xử lý…' : 'Giao việc'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CreateGoodsReturnRequestDialog
        order={returningOrder}
        form={returnForm}
        isPending={createGoodsReturnRequestMutation.isPending}
        slotOptions={(returnSlotsQuery.data?.items ?? []).map((slot) => ({
          id: slot.id,
          label: slot.code,
        }))}
        allowableByPickDetail={allowableByPickDetail}
        slotSearch={returnSlotSearch}
        onSlotSearchChange={setGoodsReturnRequestSlotSearch}
        onOpenChange={(open) => {
          if (!open) {
            setGoodsReturnRequestingOrder(null)
            setGoodsReturnRequestSlotSearch('')
          }
        }}
        onSubmit={handleCreateGoodsReturnRequest}
      />
      <AlertDialog
        open={Boolean(authorizingOrder)}
        onOpenChange={(open) => {
          if (!open && !authorizeDispatchMutation.isPending) setAuthorizingOrder(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Send aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Cho phép xuất kho?</AlertDialogTitle>
            <AlertDialogDescription>
              Hàng đã được lấy đủ và đang được giữ tại các vị trí đã chọn. Sau khi bạn cho phép,
              nhân viên kho mới có thể quét và xác nhận hàng rời kho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={authorizeDispatchMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={authorizeDispatchMutation.isPending}
              onClick={() => void handleAuthorizeDispatch()}
            >
              {authorizeDispatchMutation.isPending ? 'Đang xử lý…' : 'Cho phép xuất'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(dispatchingOrder)}
        onOpenChange={(open) => {
          if (!open && !confirmDispatchMutation.isPending) setDispatchingOrder(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Send aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận hàng đã rời kho?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ ghi giảm tồn kho thật, sử dụng lượng hàng đã giữ và chuyển yêu cầu
              xuất sang trạng thái Đã xuất kho. Quét mã sản phẩm của hàng rời kho để đối chiếu (mỗi
              mã một dòng hoặc cách nhau bằng dấu phẩy).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            aria-label="Mã sản phẩm đã quét"
            name="dispatchScannedBarcodes"
            autoComplete="off"
            rows={3}
            placeholder="Quét hoặc nhập mã sản phẩm…"
            value={dispatchScanText}
            onChange={(event) => setDispatchScanText(event.target.value)}
            className="border-input bg-background w-full border p-2 font-mono text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmDispatchMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmDispatchMutation.isPending}
              onClick={() => void handleConfirmDispatch()}
            >
              {confirmDispatchMutation.isPending ? 'Đang xác nhận…' : 'Xác nhận xuất kho'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
