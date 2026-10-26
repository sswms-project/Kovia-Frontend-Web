'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { logger } from '@/lib/logger'
import { USER_ROLES } from '@/config/roles'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useAssignableStaffQuery } from '@/features/inbound/hooks/use-inbound'
import {
  formatApiError,
  getApiErrorMessage,
  isApiErrorResponse,
  logApiError,
} from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'
import { APP_ROUTES } from '@/routes/app-routes'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useUnitsQuery } from '@/features/product/hooks/use-products'
import type {
  ProductResponse,
  ProductUnitConversion,
  UnitResponse,
} from '@/features/product/types/product.types'
import { InboundRequestForm, InboundRequestCodeForm } from '../components/InboundRequestFormPage'
import {
  useCreateInboundRequestMutation,
  useInboundRequestProductDetails,
  useInboundRequestQuery,
  useInboundRequestUnitConversions,
  useProductOptionsQuery,
  useSubmitInboundRequestMutation,
  useSupplierOptionsQuery,
  useUpdateInboundRequestMutation,
  useInboundRequestAllowedActionsQuery,
  useNextInboundRequestCodeQuery,
  useUpdateInboundRequestCodeMutation,
} from '../hooks/use-inbound-requests'
import {
  inboundRequestSchemaWithUnits,
  inboundRequestCodeSchema,
  type InboundRequestCodeFormValues,
  type InboundRequestFormValues,
} from '../schemas/inbound-request.schema'
import type { LookupOption, ProductSearchState } from '../types/inbound-request.types'
import { INBOUND_SOURCE_TYPE, RECORD_STATUS } from '../types/inbound-request.types'
import {
  mergeLookupOptions,
  isPastInboundExpectedDate,
  toInboundRequestSaveRequest,
  toOperationalDateInputValue,
} from '../utils/inbound-request-format'

const EMPTY_LINE = { productId: '', quantity: 1, unitId: '' }
const LOOKUP_PAGE_SIZE = 20

export default function InboundRequestFormPage({
  inboundRequestId,
}: {
  readonly inboundRequestId?: string
}) {
  const router = useRouter()
  const codeSessionKey = useId()
  const isOwner = useAuthStore((state) => state.user?.role === USER_ROLES.TenantOwner)
  const meQuery = useMeQuery()
  const canAssign =
    !inboundRequestId && Boolean(meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_CREATE))
  const hydratedInboundRequestId = useRef<string | null>(null)
  const editingVersion = useRef('')
  const createdInboundRequestId = useRef<string | null>(null)
  const [warehouseSearchText, setWarehouseSearchText] = useState('')
  const [supplierSearchText, setSupplierSearchText] = useState('')
  const [productSearch, setProductSearch] = useState<ProductSearchState | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [editCodeOnly, setEditCodeOnly] = useState(false)
  const debouncedWarehouseSearch = useDebouncedValue(warehouseSearchText.trim(), 300)
  const debouncedSupplierSearch = useDebouncedValue(supplierSearchText.trim(), 300)
  const debouncedProductSearch = useDebouncedValue(productSearch?.value.trim() ?? '', 300)
  const isEditing = Boolean(inboundRequestId)
  const validationData = useRef<{
    products: Record<string, ProductResponse>
    units: UnitResponse[]
    conversions: Record<string, ProductUnitConversion[]>
  }>({ products: {}, units: [], conversions: {} })
  const form = useForm<InboundRequestFormValues>({
    resolver: (values, context, options) =>
      zodResolver(
        inboundRequestSchemaWithUnits(
          validationData.current.products,
          validationData.current.units,
          validationData.current.conversions
        )
      )(values, context, options),
    defaultValues: {
      inboundRequestCode: '',
      warehouseId: '',
      receivingAssignedTo: '',
      sourceType: INBOUND_SOURCE_TYPE.Supplier,
      supplierId: '',
      sourceName: '',
      sourceReference: '',
      expectedDate: '',
      lines: [EMPTY_LINE],
    },
  })
  const fieldArray = useFieldArray({ control: form.control, name: 'lines' })
  const selectedLines = useWatch({ control: form.control, name: 'lines' })
  const selectedWarehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const staffQuery = useAssignableStaffQuery(canAssign ? selectedWarehouseId : null)
  const productIds = [...new Set(selectedLines.map((line) => line.productId).filter(Boolean))]
  // ponytail: lookups grow with line count; use a batch endpoint if large inbound requests become common.
  const productDetails = useInboundRequestProductDetails(productIds)
  const productConversions = useInboundRequestUnitConversions(productIds)
  const unitsQuery = useUnitsQuery(true, RECORD_STATUS.Active)
  const detailQuery = useInboundRequestQuery(inboundRequestId ?? '')
  const actionsQuery = useInboundRequestAllowedActionsQuery(inboundRequestId ?? '')
  const nextCodeQuery = useNextInboundRequestCodeQuery(!isEditing, codeSessionKey)
  const codeMutation = useUpdateInboundRequestCodeMutation()
  const codeForm = useForm<InboundRequestCodeFormValues>({
    resolver: zodResolver(inboundRequestCodeSchema),
    defaultValues: { inboundRequestCode: '', reason: '' },
  })
  const codeSuggestion = useCodeSuggestion({
    active: !isEditing,
    sessionKey: codeSessionKey,
    suggestedCode: nextCodeQuery.data,
    isFetching: nextCodeQuery.isFetching,
    isError: nextCodeQuery.isError,
    getCurrentCode: () => form.getValues('inboundRequestCode'),
    applyCode: (code) =>
      form.setValue('inboundRequestCode', code, { shouldValidate: form.formState.isSubmitted }),
  })
  const warehousesQuery = useWarehousesQuery({
    top: LOOKUP_PAGE_SIZE,
    skip: 0,
    needTotalCount: true,
    isActive: true,
    ...(debouncedWarehouseSearch ? { searchText: debouncedWarehouseSearch } : {}),
  })
  const productsQuery = useProductOptionsQuery({
    pageNumber: 1,
    pageSize: LOOKUP_PAGE_SIZE,
    status: RECORD_STATUS.Active,
    ...(debouncedProductSearch ? { searchTerm: debouncedProductSearch } : {}),
  })
  const suppliersQuery = useSupplierOptionsQuery({
    pageNumber: 1,
    pageSize: LOOKUP_PAGE_SIZE,
    status: RECORD_STATUS.Active,
    ...(debouncedSupplierSearch ? { searchTerm: debouncedSupplierSearch } : {}),
  })
  const productsById: Record<string, ProductResponse> = {}
  const conversionsByProductId: Record<string, ProductUnitConversion[]> = {}
  productIds.forEach((id, index) => {
    const product = productDetails[index]?.data
    if (product) productsById[id] = product
    const conversions = productConversions[index]?.data
    if (conversions)
      conversionsByProductId[id] = conversions.map((conversion) => {
        const savedLine = detailQuery.data?.lines.find(
          (line) => line.productId === id && line.enteredUnitId === conversion.unitId
        )
        const enteredLine = selectedLines.find((line) => line.productId === id)
        // Unchanged lines retain their approved snapshot, matching the update command.
        return savedLine &&
          enteredLine?.quantity === savedLine.enteredQuantity &&
          enteredLine.unitId === savedLine.enteredUnitId
          ? { ...conversion, conversionFactor: savedLine.conversionFactorSnapshot }
          : conversion
      })
  })
  useEffect(() => {
    validationData.current = {
      products: productsById,
      units: unitsQuery.data ?? [],
      conversions: conversionsByProductId,
    }
  })
  const createMutation = useCreateInboundRequestMutation()
  const updateMutation = useUpdateInboundRequestMutation()
  const submitMutation = useSubmitInboundRequestMutation()
  const lookupIsLoading =
    productDetails.some((query) => query.isPending) ||
    productConversions.some((query) => query.isPending)
  const lookupIsError =
    productDetails.some((query) => query.isError) ||
    productConversions.some((query) => query.isError)

  useEffect(() => {
    const detail = detailQuery.data
    if (!detail || hydratedInboundRequestId.current === detail.id) return
    form.reset({
      inboundRequestCode: detail.inboundRequestCode,
      warehouseId: detail.warehouseId ?? '',
      sourceType: detail.sourceType,
      supplierId: detail.supplierId ?? '',
      sourceName: detail.sourceName ?? '',
      sourceReference: detail.sourceReference ?? '',
      expectedDate: toOperationalDateInputValue(detail.expectedDate),
      lines: detail.lines.map((line) => ({
        productId: line.productId,
        quantity: line.enteredQuantity,
        unitId: line.enteredUnitId,
      })),
    })
    hydratedInboundRequestId.current = detail.id
    editingVersion.current = detail.version
    codeForm.reset({ inboundRequestCode: detail.inboundRequestCode, reason: '' })
  }, [detailQuery.data, form, codeForm])

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!form.formState.isDirty && !codeForm.formState.isDirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [form.formState.isDirty, codeForm.formState.isDirty])

  async function save(values: InboundRequestFormValues, shouldSubmit: boolean) {
    if (shouldSubmit && isPastInboundExpectedDate(values.expectedDate)) {
      form.setError('expectedDate', {
        type: 'validate',
        message: 'Ngày dự kiến đã qua. Vui lòng chọn hôm nay hoặc ngày sau để gửi duyệt.',
      })
      form.setFocus('expectedDate')
      return
    }
    if (lookupIsLoading || lookupIsError) {
      toast.error('Vui lòng chờ tải thông tin đơn vị tính hoặc thử lại.')
      return
    }
    let savedId = inboundRequestId ?? createdInboundRequestId.current
    const autoApproved = !savedId && isOwner
    try {
      const request = toInboundRequestSaveRequest(values)
      if (savedId) {
        await updateMutation.mutateAsync({
          inboundRequestId: savedId,
          request: { ...request, expectedVersion: editingVersion.current },
        })
      } else {
        const response = await createMutation.mutateAsync({
          ...request,
          ...(values.receivingAssignedTo
            ? { receivingAssignedTo: values.receivingAssignedTo }
            : {}),
        })
        savedId = response.data
        createdInboundRequestId.current = savedId
      }
      if (
        shouldSubmit &&
        savedId &&
        !autoApproved &&
        (!isEditing || detailQuery.data?.status === 'Draft')
      ) {
        try {
          await submitMutation.mutateAsync(savedId)
        } catch (error) {
          logApiError(error)
          toast.warning('Đã lưu nháp. Chưa gửi duyệt.', {
            description: getApiErrorMessage(
              error,
              'Vui lòng kiểm tra lại thông tin và gửi duyệt từ trang chi tiết.'
            ),
          })
          router.push(APP_ROUTES.inboundRequestDetail(savedId) as Route)
          return
        }
      }
      form.reset(values)
      toast.success(
        autoApproved
          ? 'Yêu cầu nhập kho đã được tạo và phê duyệt.'
          : shouldSubmit
            ? 'Đã lưu và gửi yêu cầu nhập kho để duyệt.'
            : 'Đã lưu yêu cầu nhập kho.'
      )
      if (savedId) router.push(APP_ROUTES.inboundRequestDetail(savedId) as Route)
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500)
        logger.warn(formatApiError(error))
      else logger.error(formatApiError(error))
      toast.error(
        getApiErrorMessage(
          error,
          'Không thể lưu yêu cầu nhập kho. Vui lòng kiểm tra dữ liệu và thử lại.'
        )
      )
    }
  }

  function leavePage() {
    router.push(
      (inboundRequestId
        ? APP_ROUTES.inboundRequestDetail(inboundRequestId)
        : APP_ROUTES.inboundRequests) as Route
    )
  }

  function handleCancel() {
    if (form.formState.isDirty || codeForm.formState.isDirty) {
      setShowLeaveDialog(true)
      return
    }
    leavePage()
  }

  function onProductSearchChange(scope: string, value: string) {
    setProductSearch((current) => {
      if (value) return { scope, value }
      return current?.scope === scope ? null : current
    })
  }

  function retryProductDetails() {
    productDetails.forEach((query) => {
      if (query.isError) void query.refetch()
    })
    productConversions.forEach((query) => {
      if (query.isError) void query.refetch()
    })
  }

  function retry() {
    void warehousesQuery.refetch()
    void productsQuery.refetch()
    void suppliersQuery.refetch()
    void unitsQuery.refetch()
    if (inboundRequestId) void detailQuery.refetch()
    if (inboundRequestId) void actionsQuery.refetch()
  }

  const canEditContents =
    !editCodeOnly && (!isEditing || actionsQuery.data?.allowedActions.includes('Update'))
  const isLoading =
    (canEditContents &&
      (warehousesQuery.isLoading ||
        productsQuery.isLoading ||
        suppliersQuery.isLoading ||
        unitsQuery.isLoading)) ||
    (isEditing && (detailQuery.isLoading || actionsQuery.isLoading))
  const isError =
    (canEditContents &&
      (warehousesQuery.isError ||
        productsQuery.isError ||
        suppliersQuery.isError ||
        unitsQuery.isError)) ||
    (isEditing && (detailQuery.isError || actionsQuery.isError))
  const isPending = createMutation.isPending || updateMutation.isPending || submitMutation.isPending
  const detail = detailQuery.data
  const warehouseOptions = mergeLookupOptions(
    (warehousesQuery.data?.items ?? []).map(
      (warehouse): LookupOption => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}`,
      })
    ),
    detail?.warehouseId
      ? [
          {
            value: detail.warehouseId,
            label: `${detail.warehouseCode ?? ''} - ${detail.warehouseName ?? 'Kho hiện tại'}`,
          },
        ]
      : []
  )
  const supplierOptions = mergeLookupOptions(
    (suppliersQuery.data?.items ?? []).map(
      (supplier): LookupOption => ({
        value: supplier.id,
        label: `${supplier.supplierName} · ${supplier.phone}`,
      })
    ),
    detail?.supplierId
      ? [
          {
            value: detail.supplierId,
            label: detail.supplierName ?? 'Nhà cung cấp hiện tại',
          },
        ]
      : []
  )
  const productOptions = mergeLookupOptions(
    (productsQuery.data?.items ?? []).map(
      (product): LookupOption => ({
        value: product.id,
        label: `${product.sku} - ${product.productName}`,
      })
    ),
    detail?.lines.map(
      (line): LookupOption => ({
        value: line.productId,
        label: `${line.productSKU} - ${line.productName}`,
      })
    ) ?? []
  )
  if (isLoading) return <OperationalLoadingState rows={8} />
  if (isError) {
    return (
      <OperationalErrorState title="Không thể chuẩn bị biểu mẫu yêu cầu nhập kho" onRetry={retry} />
    )
  }

  if (isEditing && (editCodeOnly || !actionsQuery.data?.allowedActions.includes('Update'))) {
    if (!actionsQuery.data?.allowedActions.includes('UpdateCode'))
      return (
        <OperationalErrorState
          title="Yêu cầu hiện không được phép chỉnh sửa"
          onRetry={() => void actionsQuery.refetch()}
        />
      )
    return (
      <>
        <InboundRequestCodeForm
          form={codeForm}
          isPending={codeMutation.isPending}
          onCancel={handleCancel}
          onSave={() =>
            void codeForm.handleSubmit(async (values) => {
              if (!inboundRequestId || !detail) return
              try {
                await codeMutation.mutateAsync({
                  id: inboundRequestId,
                  request: {
                    ...values,
                    inboundRequestCode: values.inboundRequestCode.trim().toUpperCase(),
                    expectedVersion: editingVersion.current,
                  },
                })
                codeForm.reset(values)
                toast.success('Đã đổi mã yêu cầu. Nội dung và chứng từ liên quan được giữ nguyên.')
                leavePage()
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Không thể đổi mã yêu cầu.'))
              }
            })()
          }
        />
        <UnsavedChangesDialog
          open={showLeaveDialog}
          onOpenChange={setShowLeaveDialog}
          onDiscard={leavePage}
        />
      </>
    )
  }

  return (
    <>
      <InboundRequestForm
        codeDescription={!isEditing ? 'Mã được gợi ý, có thể chỉnh sửa.' : undefined}
        codeSuggestionStatus={
          !isEditing
            ? nextCodeQuery.isFetching
              ? 'loading'
              : nextCodeQuery.isError
                ? 'error'
                : 'ready'
            : undefined
        }
        onCodeChange={codeSuggestion.markEdited}
        onEditCode={
          isEditing && actionsQuery.data?.allowedActions.includes('UpdateCode')
            ? () => setEditCodeOnly(true)
            : undefined
        }
        isApprovedEdit={isEditing && detail?.status !== 'Draft'}
        title={
          isEditing
            ? `Chỉnh sửa ${detailQuery.data?.inboundRequestCode ?? 'yêu cầu nhập kho'}`
            : 'Tạo yêu cầu nhập kho'
        }
        autoApprove={isOwner && !isEditing}
        form={form}
        fields={fieldArray.fields}
        warehouseOptions={warehouseOptions}
        canAssign={canAssign}
        staffOptions={(staffQuery.data ?? []).map((staff) => ({
          value: staff.id,
          label: `${staff.fullName} · ${staff.email}`,
        }))}
        isStaffLoading={staffQuery.isFetching}
        isStaffError={staffQuery.isError}
        onRetryStaff={() => void staffQuery.refetch()}
        supplierOptions={supplierOptions}
        productOptions={productOptions}
        productsById={productsById}
        conversionsByProductId={conversionsByProductId}
        units={unitsQuery.data ?? []}
        isUnitLoading={lookupIsLoading}
        isUnitError={lookupIsError}
        onRetryUnits={retryProductDetails}
        isWarehouseSearchLoading={warehousesQuery.isFetching}
        isSupplierSearchLoading={suppliersQuery.isFetching}
        isProductSearchLoading={productsQuery.isFetching}
        isPending={isPending || lookupIsLoading || lookupIsError}
        disablePastDates={!isEditing}
        onAddLine={() => fieldArray.append(EMPTY_LINE)}
        onRemoveLine={fieldArray.remove}
        onCancel={handleCancel}
        onSaveDraft={() => void form.handleSubmit((values) => save(values, false))()}
        onSaveAndSubmit={() => void form.handleSubmit((values) => save(values, true))()}
        onWarehouseSearchChange={setWarehouseSearchText}
        onSupplierSearchChange={setSupplierSearchText}
        onProductSearchChange={onProductSearchChange}
      />
      <UnsavedChangesDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onDiscard={leavePage}
      />
    </>
  )
}
