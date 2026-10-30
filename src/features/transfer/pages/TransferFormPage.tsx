'use client'

import { productStockOption } from '@/lib/product-stock-option'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { P } from '@/config/permissionCodes'
import {
  useInboundRequestProductDetails,
  useInboundRequestUnitConversions,
} from '@/features/inbound-request/hooks/use-inbound-requests'
import {
  RECORD_STATUS,
  type LookupOption,
} from '@/features/inbound-request/types/inbound-request.types'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { useUnitsQuery } from '@/features/product/hooks/use-products'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  TransferForm,
  type TransferFormMode,
  type TransferLineLockInfo,
} from '../components/TransferFormPage'
import { TransferChangedBanner, TransferConfirmDialog } from '../components/TransferShared'
import { useTransferFormActions } from '../hooks/use-transfer-form-actions'
import { useTransferDestinationPreview } from '../hooks/use-transfer-destination-preview'
import { useTransferDestinationLoadQuery } from '../hooks/use-transfer-destination-load-query'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import {
  useNextTransferCodeQuery,
  useTransferAvailabilityQuery,
  useTransferQuery,
  useTransferRequesterOptionsQuery,
  useTransferReceivableSlotsQuery,
  useTransferSourceProductsQuery,
  useTransferSourceWarehousesQuery,
} from '../hooks/use-transfers'
import {
  transferRequestSchemaWithLocks,
  type TransferLineLock,
  type TransferRequestFormValues,
} from '../schemas/transfer-request.schema'
import {
  EMPTY_TRANSFER_LINE,
  dispatchedInEnteredUnit,
  emptyTransferForm,
  findWarehouseName,
  visibleTransferItems,
} from '../utils/transfer-form'
import { canSeeWarehouse } from '../utils/transfer-capabilities'
import { buildTransferLineUnits } from '../utils/transfer-line-units'
import type { TransferLineUnits } from '../types/transfer.types'

const LOOKUP_PAGE_SIZE = 20

interface ProductSearchState {
  readonly scope: string
  readonly value: string
}

export default function TransferFormPage({ transferId }: { readonly transferId?: string }) {
  const router = useRouter()
  const { viewer, isReady } = useTransferViewer()
  const detailQuery = useTransferQuery(transferId ?? null)
  const detail = detailQuery.data
  const locksRef = useRef<ReadonlyMap<string, TransferLineLock>>(new Map())
  const [productSearch, setProductSearch] = useState<ProductSearchState | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const debouncedProductSearch = useDebouncedValue(productSearch?.value.trim() ?? '', 300)

  const mode: TransferFormMode = !transferId
    ? 'create'
    : detail?.status === 'Draft'
      ? 'draft'
      : 'edit'

  const form = useForm<TransferRequestFormValues>({
    resolver: (values, context, options) =>
      zodResolver(
        transferRequestSchemaWithLocks(locksRef.current, mode === 'edit' ? detail : undefined)
      )(values, context, options),
    defaultValues: emptyTransferForm(),
  })
  const fieldArray = useFieldArray({ control: form.control, name: 'lines' })
  const lines = useWatch({ control: form.control, name: 'lines' })
  const sourceWarehouseId = useWatch({ control: form.control, name: 'sourceWarehouseId' })
  const destinationWarehouseId = useWatch({ control: form.control, name: 'destinationWarehouseId' })
  const requiredBy = useWatch({ control: form.control, name: 'requiredBy' })
  const destinationLoad = useTransferDestinationLoadQuery(
    {
      warehouseId: destinationWarehouseId,
      date: requiredBy.slice(0, 10),
      excludeTransferId: transferId,
    },
    isReady && viewer.permissions.includes(P.TRANSFERS_CREATE)
  )

  // Ghi cho màn hình đang nhập dở: chỉ báo thay đổi, không tải đè lên dữ liệu đang nhập.
  const realtime = useTransferRealtime({ transferId: transferId ?? null, autoRefresh: false })

  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const sourceWarehousesQuery = useTransferSourceWarehousesQuery(
    {
      destinationWarehouseId,
      top: 100,
      skip: 0,
      needTotalCount: true,
    },
    Boolean(destinationWarehouseId)
  )
  const hasWarehouses = Boolean(
    sourceWarehouseId && destinationWarehouseId && sourceWarehouseId !== destinationWarehouseId
  )
  // Chỉ gợi ý sản phẩm còn tồn khả dụng ở kho xuất, để không chọn nhầm hàng kho đó không có.
  const productsQuery = useTransferSourceProductsQuery(
    {
      sourceWarehouseId,
      destinationWarehouseId,
      pageSize: LOOKUP_PAGE_SIZE,
      ...(debouncedProductSearch ? { searchTerm: debouncedProductSearch } : {}),
    },
    hasWarehouses
  )
  const productIds = useMemo(
    () => [...new Set(lines.map((line) => line.productId).filter(Boolean))].sort(),
    [lines]
  )
  const availabilityQuery = useTransferAvailabilityQuery(
    { sourceWarehouseId, destinationWarehouseId, productIds },
    hasWarehouses
  )

  // Đơn vị lấy từ danh mục sản phẩm để hiện ngay khi chọn sản phẩm, không chờ chọn kho.
  const productDetails = useInboundRequestProductDetails(productIds)
  const productConversions = useInboundRequestUnitConversions(productIds)
  const unitsQuery = useUnitsQuery(true, RECORD_STATUS.Active)

  // Vị trí đi chỉ dành cho chủ và người kho xuất; người kho nhập không biết nơi lấy hàng.
  const showSourceSlot =
    hasWarehouses &&
    viewer.permissions.includes(P.TRANSFERS_DISPATCH) &&
    canSeeWarehouse(viewer, sourceWarehouseId)
  const knownSourceSlots = useMemo(() => {
    const known: Record<string, LookupOption> = {}
    for (const item of detail?.items ?? []) {
      if (item.sourceSlotId) {
        known[item.sourceSlotId] = {
          value: item.sourceSlotId,
          label: item.sourceSlotPath ?? item.sourceSlotCode ?? item.sourceSlotId,
        }
      }
    }
    return known
  }, [detail?.items])
  // Vị trí đến chỉ dành cho chủ và người kho nhập; người kho xuất không thấy cột này.
  const showDestinationSlot =
    Boolean(destinationWarehouseId) && canSeeWarehouse(viewer, destinationWarehouseId)
  const [slotSearch, setSlotSearch] = useState('')
  const debouncedSlotSearch = useDebouncedValue(slotSearch.trim(), 300)
  const destinationSlotsQuery = useTransferReceivableSlotsQuery(
    {
      warehouseId: destinationWarehouseId,
      top: LOOKUP_PAGE_SIZE,
      ...(debouncedSlotSearch ? { search: debouncedSlotSearch } : {}),
    },
    showDestinationSlot
  )
  const destinationSlotOptions = useMemo<LookupOption[]>(
    () =>
      (destinationSlotsQuery.isPlaceholderData || destinationSlotsQuery.isError
        ? []
        : (destinationSlotsQuery.data ?? [])
      ).map((slot) => ({ value: slot.id, label: slot.path })),
    [
      destinationSlotsQuery.data,
      destinationSlotsQuery.isPlaceholderData,
      destinationSlotsQuery.isError,
    ]
  )
  const knownDestinationSlots = useMemo(() => {
    const known: Record<string, LookupOption> = {}
    for (const item of detail?.items ?? []) {
      if (item.destinationSlotId) {
        known[item.destinationSlotId] = {
          value: item.destinationSlotId,
          label: item.destinationSlotPath ?? item.destinationSlotCode ?? item.destinationSlotId,
        }
      }
    }
    return known
  }, [detail?.items])
  const lockedDestinationItemIds = useMemo(
    () =>
      new Set(
        (detail?.items ?? [])
          .filter(
            (item) =>
              item.receivedQuantity > 0 || item.damagedQuantity > 0 || item.missingQuantity > 0
          )
          .map((item) => item.id)
      ),
    [detail?.items]
  )

  const codeSessionKey = useId()
  const nextCodeQuery = useNextTransferCodeQuery(mode === 'create', codeSessionKey)
  const codeSuggestion = useCodeSuggestion({
    active: mode === 'create',
    sessionKey: codeSessionKey,
    suggestedCode: nextCodeQuery.data,
    isFetching: nextCodeQuery.isFetching,
    isError: nextCodeQuery.isError,
    getCurrentCode: () => form.getValues('transferCode'),
    applyCode: (code) =>
      form.setValue('transferCode', code, { shouldValidate: form.formState.isSubmitted }),
  })
  const requesterOptionsQuery = useTransferRequesterOptionsQuery(mode !== 'edit')
  const requesterNames = useMemo(
    () => [...new Set((requesterOptionsQuery.data ?? []).map((option) => option.fullName))],
    [requesterOptionsQuery.data]
  )

  const actions = useTransferFormActions({
    mode,
    transferId,
    detail,
    form,
    refetchDetail: detailQuery.refetch,
    dismissRealtime: realtime.dismiss,
  })

  const { lockInfoByItemId, lineLocks } = useMemo(() => {
    const info: Record<string, TransferLineLockInfo> = {}
    const locks = new Map<string, TransferLineLock>()
    for (const item of visibleTransferItems(detail?.items ?? [])) {
      const dispatched = dispatchedInEnteredUnit(item)
      info[item.id] = { dispatched, unitName: item.unitName ?? item.baseUnitName ?? '' }
      if (mode === 'edit' && dispatched > 0) locks.set(item.id, { minimum: dispatched })
    }
    return { lockInfoByItemId: info, lineLocks: locks }
  }, [detail?.items, mode])

  useEffect(() => {
    locksRef.current = lineLocks
  }, [lineLocks])

  const availabilityByProductId = useMemo(
    () =>
      Object.fromEntries((availabilityQuery.data ?? []).map((entry) => [entry.productId, entry])),
    [availabilityQuery.data]
  )
  const unitsByProductId: Record<string, TransferLineUnits> = {}
  productIds.forEach((id, index) => {
    const product = productDetails[index]?.data
    if (!product) return
    unitsByProductId[id] = buildTransferLineUnits(
      product,
      productConversions[index]?.data ?? [],
      unitsQuery.data ?? [],
      availabilityByProductId[id]
    )
  })
  const isUnitLoading =
    unitsQuery.isPending ||
    productDetails.some((query) => query.isPending) ||
    productConversions.some((query) => query.isPending)
  const isUnitError =
    unitsQuery.isError ||
    productDetails.some((query) => query.isError) ||
    productConversions.some((query) => query.isError)
  const knownProductOptions = useMemo(() => {
    const options: Record<string, LookupOption> = {}
    for (const item of detail?.items ?? []) {
      options[item.productId] = {
        value: item.productId,
        label: `${item.sku} - ${item.productName}`,
      }
    }
    for (const entry of availabilityQuery.data ?? []) {
      options[entry.productId] = {
        value: entry.productId,
        label: `${entry.sku} - ${entry.productName}`,
      }
    }
    return options
  }, [availabilityQuery.data, detail?.items])
  const productOptions = useMemo<LookupOption[]>(
    () =>
      (productsQuery.isError ? [] : (productsQuery.data ?? [])).map((product) =>
        productStockOption(
          {
            id: product.productId,
            sku: product.sku,
            productName: product.productName,
            unitName: product.baseUnitName,
          },
          product.availableQuantity
        )
      ),
    [productsQuery.data, productsQuery.isError]
  )

  const destinationOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        id: warehouse.id,
        name: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
        address: warehouse.address,
      })),
    [warehousesQuery.data?.items]
  )
  const sourceOptions = useMemo(() => {
    const options = (sourceWarehousesQuery.data?.items ?? []).map((warehouse) => ({
      id: warehouse.id,
      name: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      address: warehouse.address,
    }))
    if (detail && !options.some((option) => option.id === detail.sourceWarehouseId)) {
      options.unshift({
        id: detail.sourceWarehouseId,
        name: detail.sourceWarehouseName,
        address: null,
      })
    }
    return options
  }, [detail, sourceWarehousesQuery.data?.items])

  useEffect(() => {
    if (!form.formState.isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [form.formState.isDirty])

  const hasShipments = (detail?.shipments ?? []).some((shipment) => shipment.status !== 'Cancelled')
  const warehousesLocked = mode === 'edit' && hasShipments

  function leave() {
    if (form.formState.isDirty) setShowLeaveDialog(true)
    else router.push(transferId ? APP_ROUTES.transferDetail(transferId) : APP_ROUTES.transfers)
  }

  function changeDestination(value: string) {
    form.setValue('destinationWarehouseId', value, { shouldDirty: true, shouldValidate: true })
    form.setValue('sourceWarehouseId', '', { shouldDirty: true })
    // Vị trí đến thuộc kho nhập cũ, vị trí đi thuộc kho xuất cũ nên không còn hợp lệ khi đổi kho.
    form.getValues('lines').forEach((_, index) => {
      form.setValue(`lines.${index}.destinationSlotId`, '', { shouldDirty: true })
      form.setValue(`lines.${index}.sourceSlotId`, '', { shouldDirty: true })
    })
  }

  const submit = form.handleSubmit((values) =>
    mode === 'edit' ? actions.update(values) : actions.setIsConfirmOpen(true)
  )

  const canCreate = viewer.permissions.includes(P.TRANSFERS_CREATE)
  const title =
    mode === 'edit'
      ? 'Sửa yêu cầu điều chuyển'
      : mode === 'draft'
        ? 'Soạn tiếp nháp'
        : 'Tạo yêu cầu điều chuyển'
  const unavailable = isReady && !canCreate
  const notEditable =
    Boolean(detail) &&
    (detail?.isLegacyWorkflow ||
      Boolean(detail?.approvedAt) ||
      (detail?.status !== 'Draft' && detail?.status !== 'InProgress'))

  const totalBaseQuantity = lines.reduce((sum, line) => {
    const info = unitsByProductId[line.productId]
    const unit = info?.units.find(
      (candidate) => candidate.unitId === (line.unitId || info.baseUnitId)
    )
    return unit && Number.isFinite(line.quantity)
      ? sum + line.quantity * unit.conversionFactor
      : sum
  }, 0)

  const destinationPreview = useTransferDestinationPreview({
    form,
    fields: fieldArray.fields,
    lines,
    warehouseId: destinationWarehouseId,
    viewerId: viewer.currentUserId,
    enabled:
      isReady &&
      showDestinationSlot &&
      hasWarehouses &&
      mode !== 'edit' &&
      !notEditable &&
      viewer.permissions.includes(P.TRANSFERS_CREATE),
    blocked:
      actions.isSaving ||
      actions.isConfirmOpen ||
      actions.unknownResult ||
      form.formState.isSubmitting,
  })

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start gap-3 border-b pb-4">
        <Button type="button" variant="outline" size="icon" aria-label="Quay lại" onClick={leave}>
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div>
          <p className="text-primary text-xs font-medium">Điều chuyển kho</p>
          <h1 className="text-xl font-semibold">{title}</h1>
          {detail ? (
            <p className="text-muted-foreground font-mono text-xs" translate="no">
              {detail.transferCode}
            </p>
          ) : null}
        </div>
      </header>

      {!actions.unknownResult && (realtime.hasPendingChange || actions.hasConflict) ? (
        <TransferChangedBanner
          onReload={() => void actions.reload()}
          onDismiss={actions.dismissChange}
        />
      ) : null}

      {actions.unknownResult ? (
        <Alert className="shrink-0" role="status" aria-live="polite">
          <AlertTitle>Cần đối chiếu kết quả lưu</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>
              Server có thể đã lưu phiếu nhưng phản hồi bị mất. Nội dung được giữ lại và tạm khóa
              gửi lại để tránh tạo trùng.
              {!actions.unknownTransferId
                ? ' Mở danh sách để kiểm tra theo mã phiếu trước khi tạo yêu cầu khác.'
                : null}
            </span>
            {actions.unknownTransferId ? (
              <Button
                type="button"
                size="sm"
                disabled={actions.isChecking}
                onClick={() => void actions.checkResult()}
              >
                {actions.isChecking ? 'Đang kiểm tra…' : 'Kiểm tra phiếu đã lưu'}
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href={APP_ROUTES.transfers} target="_blank" rel="noopener noreferrer">
                  Mở danh sách ở tab mới
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {unavailable ? (
        <OperationalEmptyState
          title="Bạn không có quyền tạo yêu cầu điều chuyển"
          description="Liên hệ chủ doanh nghiệp để được cấp quyền tạo điều chuyển."
        />
      ) : transferId && detailQuery.isLoading ? (
        <OperationalLoadingState rows={4} />
      ) : transferId && detailQuery.isError ? (
        <OperationalErrorState
          title="Không thể tải phiếu điều chuyển"
          onRetry={() => void detailQuery.refetch()}
        />
      ) : notEditable ? (
        <OperationalEmptyState
          title="Phiếu này không còn sửa được"
          description="Yêu cầu đang chờ phải được thu hồi về nháp trước khi sửa. Yêu cầu đã được chấp nhận không thể thay đổi nội dung."
        />
      ) : (
        <TransferForm
          destinationLoad={destinationLoad.data}
          form={form}
          fields={fieldArray.fields}
          mode={mode}
          destinationOptions={destinationOptions}
          sourceOptions={sourceOptions}
          warehousesLocked={warehousesLocked}
          productOptions={productOptions}
          knownProductOptions={knownProductOptions}
          unitsByProductId={unitsByProductId}
          isUnitLoading={isUnitLoading}
          isUnitError={isUnitError}
          hasWarehouses={hasWarehouses}
          showSourceSlot={showSourceSlot}
          sourceWarehouseId={sourceWarehouseId}
          knownSourceSlots={knownSourceSlots}
          showDestinationSlot={showDestinationSlot}
          destinationSlotOptions={destinationSlotOptions}
          knownDestinationSlots={{ ...knownDestinationSlots, ...destinationPreview.options }}
          onDestinationManualChange={destinationPreview.markManual}
          destinationSuggestionNotes={Object.fromEntries(
            fieldArray.fields.map((field, index) => [field.id, destinationPreview.note(index)])
          )}
          isDestinationSlotLoading={destinationSlotsQuery.isFetching}
          lockedDestinationItemIds={lockedDestinationItemIds}
          onDestinationSlotSearchChange={setSlotSearch}
          lockByItemId={lockInfoByItemId}
          isProductSearchLoading={productsQuery.isFetching}
          isSaving={actions.isSaving}
          isBlocked={actions.unknownResult}
          requesterNames={requesterNames}
          codeSuggestionStatus={
            mode === 'create'
              ? nextCodeQuery.isFetching
                ? 'loading'
                : nextCodeQuery.isError
                  ? 'error'
                  : 'ready'
              : undefined
          }
          canCreateRelocation={viewer.permissions.includes(P.WAREHOUSE_TASKS_CREATE)}
          onCodeChange={codeSuggestion.markEdited}
          onSelectInternalRelocation={() => router.push(APP_ROUTES.createRelocationTask)}
          onDestinationChange={changeDestination}
          onSourceChange={(value) => {
            form.setValue('sourceWarehouseId', value, { shouldDirty: true, shouldValidate: true })
            form
              .getValues('lines')
              .forEach((_, index) =>
                form.setValue(`lines.${index}.sourceSlotId`, '', { shouldDirty: true })
              )
          }}
          onProductSearchChange={(scope, value) =>
            setProductSearch((current) =>
              current?.scope === scope && current.value === value ? current : { scope, value }
            )
          }
          onAddLine={() => fieldArray.append({ ...EMPTY_TRANSFER_LINE })}
          onRemoveLine={fieldArray.remove}
          onSaveDraft={() => void form.handleSubmit(actions.saveDraft)()}
          onCancel={leave}
          onSubmit={() => void submit()}
        />
      )}

      <TransferConfirmDialog
        open={actions.isConfirmOpen}
        title="Tạo yêu cầu điều chuyển?"
        description={
          <div className="grid gap-3">
            <dl className="bg-muted/50 text-foreground grid gap-1.5 rounded-md border p-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Kho xuất</dt>
                <dd className="text-right font-medium">
                  {findWarehouseName(sourceOptions, sourceWarehouseId)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Kho nhập</dt>
                <dd className="text-right font-medium">
                  {findWarehouseName(destinationOptions, destinationWarehouseId)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Số dòng hàng</dt>
                <dd className="text-right font-medium tabular-nums">{lines.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tổng số lượng</dt>
                <dd className="text-right font-medium tabular-nums">
                  {formatQuantity(totalBaseQuantity)} theo đơn vị chính
                </dd>
              </div>
            </dl>
            <p>
              Yêu cầu sẽ gửi tới kho xuất để xác nhận, <strong>chưa giữ chỗ tồn kho</strong>. Hệ
              thống kiểm tra lại tồn và giữ chỗ khi kho xuất chấp nhận.
            </p>
          </div>
        }
        confirmLabel="Tạo yêu cầu"
        pendingLabel="Đang tạo…"
        isPending={actions.isSaving}
        onOpenChange={actions.setIsConfirmOpen}
        onConfirm={() => void form.handleSubmit(actions.submitRequest)()}
      />
      <UnsavedChangesDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onDiscard={() =>
          router.push(transferId ? APP_ROUTES.transferDetail(transferId) : APP_ROUTES.transfers)
        }
      />
    </div>
  )
}
