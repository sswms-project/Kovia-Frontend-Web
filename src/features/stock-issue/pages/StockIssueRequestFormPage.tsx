'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import type { LookupOption } from '@/features/inbound-request/components/InboundRequestFormPage'
import { StockRecipientFormDialog } from '@/features/stock-recipient/components/StockRecipientsPage'
import {
  useCreateStockRecipientMutation,
  useNextStockRecipientCodeQuery,
} from '@/features/stock-recipient/hooks/use-stock-recipients'
import {
  emptyStockRecipientFormValues,
  stockRecipientSchema,
  toStockRecipientRequest,
  type StockRecipientFormValues,
} from '@/features/stock-recipient/schemas/stock-recipient.schema'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { dateToIsoDateString } from '@/lib/date-format'
import { logger } from '@/lib/logger'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  STOCK_ISSUE_ATTACHMENT_EXTENSIONS,
  STOCK_ISSUE_MAX_ATTACHMENT_BYTES,
  STOCK_ISSUE_MAX_ATTACHMENTS,
  StockIssueRequestForm,
  type StockIssueRecipientSnapshot,
} from '../components/StockIssueRequestFormPage'
import {
  useCreateStockIssueRequestMutation,
  useNextStockIssueRequestCodeQuery,
  useStockIssueProductOptionsQuery,
  useStockIssueRequestQuery,
  useStockIssueSavedProductOptions,
  useStockRecipientOptionsQuery,
  useUpdateStockIssueRequestMutation,
} from '../hooks/use-stock-issue-requests'
import {
  createStockIssueRequestSchema,
  type CreateStockIssueRequestFormValues,
} from '../schemas/stock-issue.schema'
import { stockIssueService } from '../services/stock-issue.service'
import type { StockIssueProductOption } from '../types/stock-issue.types'
import { canEditStockIssueRequest, formatStockIssueQuantity } from '../utils/stock-issue-format'

const EMPTY_LINE = { productId: '', quantity: 1, unitId: '', note: '' }
const LOOKUP_PAGE_SIZE = 20

interface ProductSearchState {
  readonly scope: string
  readonly value: string
}

function productLabel(sku: string, productName: string) {
  return `${sku} - ${productName}`
}

export default function StockIssueRequestFormPage({
  stockIssueRequestId,
}: {
  readonly stockIssueRequestId?: string
} = {}) {
  const router = useRouter()
  const isEditing = Boolean(stockIssueRequestId)
  const codeInstanceId = useId()
  const [codeSession, setCodeSession] = useState(0)
  const codeSessionKey = `${codeInstanceId}:${codeSession}`
  const [requestCodeSession, setRequestCodeSession] = useState(0)
  const requestCodeSessionKey = `${codeInstanceId}:request:${requestCodeSession}`
  const hydratedRequestId = useRef<string | null>(null)
  const editingVersion = useRef('')
  const [warehouseSearchText, setWarehouseSearchText] = useState('')
  const [recipientSearchText, setRecipientSearchText] = useState('')
  const [productSearch, setProductSearch] = useState<ProductSearchState | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [isQuickRecipientOpen, setIsQuickRecipientOpen] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  // Lựa chọn đã chọn có thể không nằm trong trang kết quả tìm kiếm hiện tại, nên phải nhớ lại nhãn.
  const [warehouseOption, setWarehouseOption] = useState<LookupOption>()
  const [recipientOption, setRecipientOption] = useState<LookupOption>()
  const [recipientSnapshots, setRecipientSnapshots] = useState<
    Record<string, StockIssueRecipientSnapshot>
  >({})
  const [pickedProducts, setPickedProducts] = useState<Record<string, StockIssueProductOption>>({})
  const debouncedWarehouseSearch = useDebouncedValue(warehouseSearchText.trim(), 300)
  const debouncedRecipientSearch = useDebouncedValue(recipientSearchText.trim(), 300)
  const debouncedProductSearch = useDebouncedValue(productSearch?.value.trim() ?? '', 300)

  const form = useForm<CreateStockIssueRequestFormValues>({
    resolver: zodResolver(createStockIssueRequestSchema),
    defaultValues: {
      stockIssueRequestCode: '',
      stockRecipientId: '',
      warehouseId: '',
      purpose: '',
      referenceCode: '',
      issueDate: dateToIsoDateString(new Date()),
      note: '',
      lines: [{ ...EMPTY_LINE }],
    },
  })
  const recipientForm = useForm<StockRecipientFormValues>({
    resolver: zodResolver(stockRecipientSchema),
    defaultValues: emptyStockRecipientFormValues,
  })
  const fieldArray = useFieldArray({ control: form.control, name: 'lines' })
  const selectedWarehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const selectedRecipientId = useWatch({ control: form.control, name: 'stockRecipientId' })

  const detailQuery = useStockIssueRequestQuery(stockIssueRequestId ?? null)
  const warehousesQuery = useWarehousesQuery({
    top: LOOKUP_PAGE_SIZE,
    skip: 0,
    needTotalCount: true,
    isActive: true,
    ...(debouncedWarehouseSearch ? { searchText: debouncedWarehouseSearch } : {}),
  })
  const recipientsQuery = useStockRecipientOptionsQuery({
    pageNumber: 1,
    pageSize: LOOKUP_PAGE_SIZE,
    status: 'Active',
    ...(debouncedRecipientSearch ? { searchTerm: debouncedRecipientSearch } : {}),
  })
  const productsQuery = useStockIssueProductOptionsQuery({
    warehouseId: selectedWarehouseId,
    pageSize: LOOKUP_PAGE_SIZE,
    ...(debouncedProductSearch ? { searchTerm: debouncedProductSearch } : {}),
  })
  // Phiếu đang sửa cung cấp sẵn nhãn của kho, người nhận và sản phẩm đã lưu.
  const savedRequest = detailQuery.data
  const savedItems = savedRequest?.items ?? []
  const savedProductQueries = useStockIssueSavedProductOptions(
    savedItems.map((item) => item.sku),
    selectedWarehouseId
  )
  const productsById: Record<string, StockIssueProductOption> = {}
  // Sản phẩm đã lưu mà kho không còn tồn thì không có trong tra cứu; giữ lại đơn vị đã chọn để sửa tiếp.
  savedItems.forEach((item, index) => {
    const found = savedProductQueries[index]?.data?.find((option) => option.id === item.productId)
    productsById[item.productId] = found ?? {
      id: item.productId,
      sku: item.sku,
      productName: item.productName,
      barcode: item.barcode,
      unitId: item.enteredUnitId,
      unitName: item.enteredUnitName,
      availableQuantity: 0,
      firstExpiringLotNumber: null,
      firstExpiringLotDate: null,
      units: [
        {
          unitId: item.enteredUnitId,
          unitName: item.enteredUnitName,
          conversionFactor: item.conversionFactor,
          quantityPrecision: 0,
        },
      ],
    }
  })
  Object.assign(productsById, pickedProducts)
  const nextRecipientCode = useNextStockRecipientCodeQuery(isQuickRecipientOpen, codeSessionKey)
  const nextRequestCode = useNextStockIssueRequestCodeQuery(!isEditing, requestCodeSessionKey)
  const createMutation = useCreateStockIssueRequestMutation()
  const updateMutation = useUpdateStockIssueRequestMutation()
  const createRecipientMutation = useCreateStockRecipientMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const requestCodeSuggestion = useCodeSuggestion({
    active: !isEditing,
    sessionKey: requestCodeSessionKey,
    suggestedCode: nextRequestCode.data,
    isFetching: nextRequestCode.isFetching,
    isError: nextRequestCode.isError,
    getCurrentCode: () => form.getValues('stockIssueRequestCode'),
    applyCode: (code) =>
      form.setValue('stockIssueRequestCode', code, {
        shouldValidate: form.formState.isSubmitted,
      }),
  })

  const codeSuggestion = useCodeSuggestion({
    active: isQuickRecipientOpen,
    sessionKey: codeSessionKey,
    suggestedCode: nextRecipientCode.data?.data,
    isFetching: nextRecipientCode.isFetching,
    isError: nextRecipientCode.isError,
    getCurrentCode: () => recipientForm.getValues('recipientCode'),
    applyCode: (code) =>
      recipientForm.setValue('recipientCode', code, {
        shouldValidate: recipientForm.formState.isSubmitted,
      }),
  })

  useEffect(() => {
    const detail = detailQuery.data
    if (!detail || hydratedRequestId.current === detail.id) return
    form.reset({
      stockIssueRequestCode: detail.stockIssueRequestCode,
      stockRecipientId: detail.stockRecipientId,
      warehouseId: detail.warehouseId,
      purpose: detail.purpose ?? '',
      referenceCode: detail.referenceCode ?? '',
      issueDate: detail.issueDate ?? '',
      note: detail.note ?? '',
      lines: detail.items.map((item) => ({
        productId: item.productId,
        quantity: item.enteredQuantity,
        unitId: item.enteredUnitId,
        note: item.note ?? '',
      })),
    })
    hydratedRequestId.current = detail.id
    editingVersion.current = detail.version ?? ''
  }, [detailQuery.data, form])

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!form.formState.isDirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [form.formState.isDirty])

  const warehouseOptions = (warehousesQuery.data?.items ?? []).map((warehouse) => ({
    value: warehouse.id,
    label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
  }))
  const recipients = recipientsQuery.data?.items ?? []
  const recipientOptions = recipients.map((recipient) => ({
    value: recipient.id,
    label: `${recipient.recipientCode} · ${recipient.recipientName}`,
    description: recipient.phone,
  }))
  const products = productsQuery.data ?? []
  const productOptions = products.map((product) => ({
    value: product.id,
    label: productLabel(product.sku, product.productName),
    description: `Tồn ${formatStockIssueQuantity(product.availableQuantity)} ${product.unitName}${
      product.barcode ? ` · Mã vạch ${product.barcode}` : ''
    }`,
  }))
  const listedRecipient = recipients.find((recipient) => recipient.id === selectedRecipientId)
  const recipientSnapshot = listedRecipient
    ? {
        recipientName: listedRecipient.recipientName,
        phone: listedRecipient.phone,
        address: listedRecipient.address,
      }
    : (recipientSnapshots[selectedRecipientId] ??
      (savedRequest && savedRequest.stockRecipientId === selectedRecipientId
        ? {
            recipientName: savedRequest.recipientName,
            phone: savedRequest.recipientPhone,
            address: savedRequest.recipientAddress,
          }
        : undefined))

  function addAttachments(files: FileList) {
    const next = [...attachments]
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!STOCK_ISSUE_ATTACHMENT_EXTENSIONS.includes(extension)) {
        toast.error(`Tệp "${file.name}" có định dạng không được hỗ trợ.`)
      } else if (file.size > STOCK_ISSUE_MAX_ATTACHMENT_BYTES) {
        toast.error(`Tệp "${file.name}" vượt quá 5 MB.`)
      } else if (next.length >= STOCK_ISSUE_MAX_ATTACHMENTS) {
        toast.error(`Chỉ đính kèm tối đa ${STOCK_ISSUE_MAX_ATTACHMENTS} tệp.`)
        break
      } else {
        next.push(file)
      }
    }
    setAttachments(next)
  }

  async function uploadAttachments(requestId: string) {
    const failedUploads: string[] = []
    for (const file of attachments) {
      try {
        await stockIssueService.uploadAttachment(requestId, file)
      } catch (error) {
        logger.error(formatApiError(error))
        failedUploads.push(file.name)
      }
    }
    return failedUploads
  }

  async function save(values: CreateStockIssueRequestFormValues, addAnother: boolean) {
    const request = {
      stockRecipientId: values.stockRecipientId,
      warehouseId: values.warehouseId,
      purpose: values.purpose || null,
      referenceCode: values.referenceCode || null,
      issueDate: values.issueDate || null,
      note: values.note || null,
      items: values.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitId: line.unitId || null,
        note: line.note || null,
      })),
    }
    try {
      if (stockIssueRequestId) {
        await updateMutation.mutateAsync({
          ...request,
          stockIssueRequestId,
          expectedVersion: editingVersion.current,
        })
        form.reset(values)
        toast.success('Đã lưu thay đổi của yêu cầu xuất kho.')
        router.push(APP_ROUTES.stockIssueRequestDetail(stockIssueRequestId) as Route)
        return
      }

      const created = await createMutation.mutateAsync({
        ...request,
        stockIssueRequestCode: values.stockIssueRequestCode || null,
      })
      const failedUploads = await uploadAttachments(created.data)
      if (failedUploads.length > 0)
        toast.warning(
          `Đã tạo phiếu nhưng không tải lên được: ${failedUploads.join(', ')}. Hãy thêm lại trong chi tiết phiếu.`
        )
      else toast.success('Đã tạo yêu cầu xuất kho.')
      setAttachments([])
      if (addAnother) {
        form.reset({
          ...values,
          stockIssueRequestCode: '',
          purpose: '',
          referenceCode: '',
          note: '',
          lines: [{ ...EMPTY_LINE }],
        })
        requestCodeSuggestion.resetSession()
        setRequestCodeSession((current) => current + 1)
        return
      }
      form.reset(values)
      router.push(APP_ROUTES.stockIssueRequestDetail(created.data) as Route)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(
        getApiErrorMessage(
          error,
          'Không thể lưu yêu cầu xuất kho. Vui lòng kiểm tra dữ liệu và thử lại.'
        )
      )
    }
  }

  async function quickCreateRecipient(values: StockRecipientFormValues) {
    try {
      const response = await createRecipientMutation.mutateAsync(toStockRecipientRequest(values))
      setRecipientOption({
        value: response.data,
        label: `${values.recipientCode} · ${values.recipientName}`,
      })
      setRecipientSnapshots((current) => ({
        ...current,
        [response.data]: {
          recipientName: values.recipientName,
          phone: values.phone,
          address: values.address,
        },
      }))
      form.setValue('stockRecipientId', response.data, { shouldDirty: true, shouldValidate: true })
      setIsQuickRecipientOpen(false)
      recipientForm.reset(emptyStockRecipientFormValues)
      toast.success('Đã tạo và chọn đơn vị nhận hàng.')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể tạo đơn vị nhận hàng.'))
    }
  }

  function leavePage() {
    router.push(
      (stockIssueRequestId
        ? APP_ROUTES.stockIssueRequestDetail(stockIssueRequestId)
        : APP_ROUTES.stockIssueRequests) as Route
    )
  }

  function handleCancel() {
    if (form.formState.isDirty) setShowLeaveDialog(true)
    else leavePage()
  }

  function handleProductSearchChange(scope: string, value: string) {
    setProductSearch((current) => {
      if (value) return { scope, value }
      return current?.scope === scope ? null : current
    })
  }

  function rememberProduct(option?: LookupOption) {
    const product = option ? products.find((candidate) => candidate.id === option.value) : undefined
    if (!product) return
    setPickedProducts((current) => ({ ...current, [product.id]: product }))
  }

  // Sản phẩm chỉ hợp lệ trong kho đã chọn nên đổi kho thì phải chọn lại hàng.
  function changeWarehouse(option?: LookupOption) {
    if (!option) return
    const previousWarehouseId = warehouseOption?.value ?? savedRequest?.warehouseId
    setWarehouseOption(option)
    if (!previousWarehouseId || previousWarehouseId === option.value) return
    if (form.getValues('lines').some((line) => line.productId)) {
      fieldArray.replace([{ ...EMPTY_LINE }])
      toast.info('Đã đặt lại danh sách sản phẩm vì mỗi kho có hàng tồn riêng.')
    }
  }

  if (isEditing) {
    if (detailQuery.isLoading) return <OperationalLoadingState rows={8} />
    if (detailQuery.isError || !detailQuery.data)
      return (
        <OperationalErrorState
          title="Không thể tải yêu cầu xuất kho"
          onRetry={() => void detailQuery.refetch()}
        />
      )
    if (!canEditStockIssueRequest(detailQuery.data.status))
      return (
        <div className="flex flex-col items-start gap-3 border p-4">
          <p className="text-sm font-medium">Phiếu xuất này không còn chỉnh sửa được</p>
          <p className="text-muted-foreground text-sm">
            Chỉ phiếu đang chờ xử lý (chưa giao việc lấy hàng) mới sửa được nội dung.
          </p>
          <Button asChild variant="outline">
            <Link href={APP_ROUTES.stockIssueRequestDetail(detailQuery.data.id) as Route}>
              Về trang chi tiết
            </Link>
          </Button>
        </div>
      )
  }

  return (
    <>
      <StockIssueRequestForm
        title={
          isEditing
            ? `Chỉnh sửa ${detailQuery.data?.stockIssueRequestCode ?? 'yêu cầu xuất kho'}`
            : 'Tạo yêu cầu xuất kho'
        }
        isEditing={isEditing}
        form={form}
        fields={fieldArray.fields}
        warehouseOptions={warehouseOptions}
        selectedWarehouseOption={
          warehouseOption ??
          (savedRequest
            ? { value: savedRequest.warehouseId, label: savedRequest.warehouseName }
            : undefined)
        }
        recipientOptions={recipientOptions}
        selectedRecipientOption={
          recipientOption ??
          (savedRequest
            ? {
                value: savedRequest.stockRecipientId,
                label: `${savedRequest.recipientCode} · ${savedRequest.stockRecipientName}`,
              }
            : undefined)
        }
        recipientSnapshot={recipientSnapshot}
        productOptions={productOptions}
        selectedProductOptions={Object.fromEntries(
          Object.values(productsById).map((product) => [
            product.id,
            { value: product.id, label: productLabel(product.sku, product.productName) },
          ])
        )}
        productsById={productsById}
        attachments={attachments}
        isWarehouseSearchLoading={warehousesQuery.isFetching}
        isRecipientSearchLoading={recipientsQuery.isFetching}
        isProductSearchLoading={productsQuery.isFetching}
        isPending={isPending}
        codeSuggestionStatus={
          isEditing
            ? undefined
            : nextRequestCode.isFetching
              ? 'loading'
              : nextRequestCode.isError
                ? 'error'
                : 'ready'
        }
        onCodeChange={requestCodeSuggestion.markEdited}
        onWarehouseSearchChange={setWarehouseSearchText}
        onRecipientSearchChange={setRecipientSearchText}
        onProductSearchChange={handleProductSearchChange}
        onProductSelect={rememberProduct}
        onRecipientSelect={(option) => option && setRecipientOption(option)}
        onWarehouseSelect={changeWarehouse}
        onQuickCreateRecipient={() => {
          recipientForm.reset(emptyStockRecipientFormValues)
          codeSuggestion.resetSession()
          setCodeSession((value) => value + 1)
          setIsQuickRecipientOpen(true)
        }}
        onAddLine={() => fieldArray.append({ ...EMPTY_LINE })}
        onRemoveLine={fieldArray.remove}
        onAddAttachments={addAttachments}
        onRemoveAttachment={(index) =>
          setAttachments((current) => current.filter((_, position) => position !== index))
        }
        onCancel={handleCancel}
        onSave={() => void form.handleSubmit((values) => save(values, false))()}
        onSaveAndAddAnother={() => void form.handleSubmit((values) => save(values, true))()}
      />
      <StockRecipientFormDialog
        open={isQuickRecipientOpen}
        title="Thêm nhanh đơn vị nhận hàng"
        description="Đơn vị nhận hàng mới sẽ được chọn ngay trong yêu cầu hiện tại."
        form={recipientForm}
        isPending={createRecipientMutation.isPending}
        isCreate
        codeSuggestionStatus={
          nextRecipientCode.isFetching ? 'loading' : nextRecipientCode.isError ? 'error' : 'ready'
        }
        onCodeChange={codeSuggestion.markEdited}
        onOpenChange={setIsQuickRecipientOpen}
        onSubmit={(values) => void quickCreateRecipient(values)}
      />
      <UnsavedChangesDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onDiscard={leavePage}
      />
    </>
  )
}
