'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { ArrowLeft, Paperclip, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
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
import { useProductListQuery } from '@/features/product/hooks/use-products'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { APP_ROUTES } from '@/routes/app-routes'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { stockIssueService } from '../services/stock-issue.service'
import {
  useCreateStockIssueRequestMutation,
  useStockRecipientOptionsQuery,
} from '../hooks/use-stock-issue-requests'
import {
  createStockIssueRequestSchema,
  type CreateStockIssueRequestFormValues,
} from '../schemas/stock-issue.schema'

const EMPTY_LINE = { productId: '', quantity: 1, note: '' }
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const ATTACHMENT_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
]

function todayIso() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function StockIssueRequestCreatePage() {
  const router = useRouter()
  const [quickStockRecipientOpen, setQuickStockRecipientOpen] = useState(false)
  const codeInstanceId = useId()
  const [codeSession, setCodeSession] = useState(0)
  const codeSessionKey = `${codeInstanceId}:${codeSession}`
  const [stockRecipientSearch, setStockRecipientSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [createdStockRecipient, setCreatedStockRecipient] = useState<{
    id: string
    recipientName: string
    phone: string
    address: string
  } | null>(null)
  const debouncedStockRecipientSearch = useDebouncedValue(stockRecipientSearch, 350)
  const debouncedProductSearch = useDebouncedValue(productSearch, 350)
  const form = useForm<CreateStockIssueRequestFormValues>({
    resolver: zodResolver(createStockIssueRequestSchema),
    defaultValues: {
      stockRecipientId: '',
      warehouseId: '',
      purpose: '',
      referenceCode: '',
      issueDate: todayIso(),
      note: '',
      lines: [{ ...EMPTY_LINE }],
    },
  })
  const productSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'F3') return
      event.preventDefault()
      productSearchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const stockRecipientForm = useForm<StockRecipientFormValues>({
    resolver: zodResolver(stockRecipientSchema),
    defaultValues: emptyStockRecipientFormValues,
  })
  const nextRecipientCode = useNextStockRecipientCodeQuery(quickStockRecipientOpen, codeSessionKey)
  const selectedStockRecipientId = useWatch({ control: form.control, name: 'stockRecipientId' })
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'lines',
  })
  const warehouses = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true, isActive: true })
  const stockRecipients = useStockRecipientOptionsQuery({
    pageNumber: 1,
    pageSize: 200,
    ...(debouncedStockRecipientSearch.trim()
      ? { searchTerm: debouncedStockRecipientSearch.trim() }
      : {}),
  })
  const products = useProductListQuery({
    pageNumber: 1,
    pageSize: 200,
    ...(debouncedProductSearch.trim() ? { searchTerm: debouncedProductSearch.trim() } : {}),
  })
  const selectedStockRecipient =
    stockRecipients.data?.items.find(
      (stockRecipient) => stockRecipient.id === selectedStockRecipientId
    ) ??
    (createdStockRecipient?.id === selectedStockRecipientId ? createdStockRecipient : undefined)
  const createOrder = useCreateStockIssueRequestMutation()
  const createStockRecipient = useCreateStockRecipientMutation()

  const codeSuggestion = useCodeSuggestion({
    active: quickStockRecipientOpen,
    sessionKey: codeSessionKey,
    suggestedCode: nextRecipientCode.data?.data,
    isFetching: nextRecipientCode.isFetching,
    isError: nextRecipientCode.isError,
    getCurrentCode: () => stockRecipientForm.getValues('recipientCode'),
    applyCode: (code) =>
      stockRecipientForm.setValue('recipientCode', code, {
        shouldValidate: stockRecipientForm.formState.isSubmitted,
      }),
  })

  function addAttachments(files: FileList | null) {
    if (!files) return
    const next = [...attachments]
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ATTACHMENT_EXTENSIONS.includes(extension)) {
        toast.error(`Tệp "${file.name}" có định dạng không được hỗ trợ.`)
      } else if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`Tệp "${file.name}" vượt quá 5 MB.`)
      } else if (next.length >= MAX_ATTACHMENTS) {
        toast.error(`Chỉ đính kèm tối đa ${MAX_ATTACHMENTS} tệp.`)
        break
      } else {
        next.push(file)
      }
    }
    setAttachments(next)
    if (attachmentInputRef.current) attachmentInputRef.current.value = ''
  }

  async function submit(values: CreateStockIssueRequestFormValues, addAnother: boolean) {
    try {
      const created = await createOrder.mutateAsync({
        stockRecipientId: values.stockRecipientId,
        warehouseId: values.warehouseId,
        purpose: values.purpose || null,
        referenceCode: values.referenceCode || null,
        issueDate: values.issueDate || null,
        note: values.note || null,
        items: values.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          note: line.note || null,
        })),
      })
      const failedUploads: string[] = []
      for (const file of attachments) {
        try {
          await stockIssueService.uploadAttachment(created.data, file)
        } catch (error) {
          logger.error(error)
          failedUploads.push(file.name)
        }
      }
      if (failedUploads.length > 0) {
        toast.warning(
          `Đã tạo phiếu nhưng không tải lên được: ${failedUploads.join(', ')}. Hãy thêm lại trong chi tiết phiếu.`
        )
      } else {
        toast.success('Đã tạo yêu cầu xuất kho.')
      }
      setAttachments([])
      if (addAnother) {
        form.reset({
          stockRecipientId: values.stockRecipientId,
          warehouseId: values.warehouseId,
          purpose: '',
          referenceCode: '',
          issueDate: values.issueDate,
          note: '',
          lines: [{ ...EMPTY_LINE }],
        })
      } else {
        router.push(APP_ROUTES.stockIssueRequests as Route)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo yêu cầu xuất kho.')
    }
  }

  async function quickCreate(values: StockRecipientFormValues) {
    try {
      const response = await createStockRecipient.mutateAsync(toStockRecipientRequest(values))
      setCreatedStockRecipient({
        id: response.data,
        recipientName: values.recipientName,
        phone: values.phone,
        address: values.address,
      })
      form.setValue('stockRecipientId', response.data, { shouldValidate: true })
      setQuickStockRecipientOpen(false)
      stockRecipientForm.reset()
      toast.success('Đã tạo và chọn đơn vị nhận hàng.')
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể tạo đơn vị nhận hàng.'))
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-4">
      <header className="flex shrink-0 items-start gap-3 border-b pb-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => router.push(APP_ROUTES.stockIssueRequests as Route)}
          aria-label="Quay lại"
        >
          <ArrowLeft />
        </Button>
        <div>
          <p className="text-primary text-xs font-medium">Xuất kho</p>
          <h1 className="text-xl font-semibold">Tạo yêu cầu xuất kho</h1>
          <p className="text-muted-foreground text-sm">
            Thông tin người nhận được chụp từ hồ sơ đơn vị nhận hàng khi tạo yêu cầu.
          </p>
        </div>
      </header>
      <form
        className="min-h-0 flex-1 space-y-5 overflow-y-auto border p-4"
        onSubmit={form.handleSubmit((values) => submit(values, false))}
      >
        <h2 className="text-sm font-semibold">1. Thông tin chung</h2>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.warehouseId)}>
            <FieldLabel htmlFor="outbound-warehouse">Kho xuất</FieldLabel>
            <NativeSelect id="outbound-warehouse" {...form.register('warehouseId')}>
              <NativeSelectOption value="">Chọn kho</NativeSelectOption>
              {(warehouses.data?.items ?? []).map((w) => (
                <NativeSelectOption key={w.id} value={w.id}>
                  {w.warehouseCode} · {w.warehouseName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[form.formState.errors.warehouseId]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.stockRecipientId)}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="outbound-stockRecipient">Đơn vị nhận hàng</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  stockRecipientForm.reset(emptyStockRecipientFormValues)
                  codeSuggestion.resetSession()
                  setCodeSession((value) => value + 1)
                  setQuickStockRecipientOpen(true)
                }}
              >
                <UserPlus />
                Thêm nhanh
              </Button>
            </div>
            <Input
              aria-label="Tìm đơn vị nhận hàng"
              placeholder="Tìm mã, tên hoặc số điện thoại"
              value={stockRecipientSearch}
              onChange={(event) => setStockRecipientSearch(event.target.value)}
            />
            <NativeSelect id="outbound-stockRecipient" {...form.register('stockRecipientId')}>
              <NativeSelectOption value="">
                {stockRecipients.isLoading
                  ? 'Đang tải đơn vị nhận hàng...'
                  : stockRecipients.isError
                    ? 'Không thể tải đơn vị nhận hàng'
                    : (stockRecipients.data?.items.length ?? 0) === 0
                      ? 'Không có đơn vị nhận hàng phù hợp'
                      : 'Chọn đơn vị nhận hàng'}
              </NativeSelectOption>
              {(stockRecipients.data?.items ?? []).map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.recipientCode} · {c.recipientName} · {c.phone}
                </NativeSelectOption>
              ))}
              {createdStockRecipient &&
              !(stockRecipients.data?.items ?? []).some(
                (stockRecipient) => stockRecipient.id === createdStockRecipient.id
              ) ? (
                <NativeSelectOption value={createdStockRecipient.id}>
                  Mới · {createdStockRecipient.recipientName} · {createdStockRecipient.phone}
                </NativeSelectOption>
              ) : null}
            </NativeSelect>
            <FieldError errors={[form.formState.errors.stockRecipientId]} />
            {selectedStockRecipient ? (
              <dl className="bg-muted/40 grid gap-1 border p-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Người nhận</dt>
                  <dd className="font-medium">{selectedStockRecipient.recipientName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Số điện thoại</dt>
                  <dd className="font-medium">{selectedStockRecipient.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Địa chỉ giao</dt>
                  <dd className="font-medium">{selectedStockRecipient.address}</dd>
                </div>
              </dl>
            ) : null}
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.issueDate)}>
            <FieldLabel htmlFor="outbound-issue-date">Ngày xuất</FieldLabel>
            <Input id="outbound-issue-date" type="date" {...form.register('issueDate')} />
            <FieldError errors={[form.formState.errors.issueDate]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.referenceCode)}>
            <FieldLabel htmlFor="outbound-reference">Tham chiếu</FieldLabel>
            <Input
              id="outbound-reference"
              placeholder="Số chứng từ, hợp đồng, PO…"
              {...form.register('referenceCode')}
            />
            <FieldError errors={[form.formState.errors.referenceCode]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.purpose)}>
            <FieldLabel htmlFor="outbound-purpose">Diễn giải / mục đích</FieldLabel>
            <Textarea id="outbound-purpose" rows={2} {...form.register('purpose')} />
            <FieldError errors={[form.formState.errors.purpose]} />
          </Field>
        </FieldGroup>
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">2. Hàng hóa</h2>
              <Input
                ref={productSearchRef}
                className="mt-2 sm:w-72"
                aria-label="Tìm sản phẩm"
                placeholder="Tìm SKU hoặc tên sản phẩm (F3)"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => append({ ...EMPTY_LINE })}>
                <Plus />
                Thêm dòng
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={fields.length === 1 && !form.getValues('lines.0.productId')}
                onClick={() => replace([{ ...EMPTY_LINE }])}
              >
                <Trash2 />
                Xóa hết dòng
              </Button>
            </div>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 border p-3 sm:grid-cols-[1fr_10rem_1fr_auto]">
              <Field data-invalid={Boolean(form.formState.errors.lines?.[index]?.productId)}>
                <FieldLabel htmlFor={`outbound-product-${index}`}>Sản phẩm</FieldLabel>
                <NativeSelect
                  id={`outbound-product-${index}`}
                  {...form.register(`lines.${index}.productId`)}
                >
                  <NativeSelectOption value="">
                    {products.isLoading
                      ? 'Đang tải sản phẩm...'
                      : products.isError
                        ? 'Không thể tải sản phẩm'
                        : (products.data?.items.length ?? 0) === 0
                          ? 'Không có sản phẩm phù hợp'
                          : 'Chọn sản phẩm'}
                  </NativeSelectOption>
                  {(products.data?.items ?? []).map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.sku} · {p.productName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[form.formState.errors.lines?.[index]?.productId]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.lines?.[index]?.quantity)}>
                <FieldLabel htmlFor={`outbound-quantity-${index}`}>Số lượng</FieldLabel>
                <Input
                  id={`outbound-quantity-${index}`}
                  type="number"
                  min={0.01}
                  step="0.01"
                  {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                />
                <FieldError errors={[form.formState.errors.lines?.[index]?.quantity]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.lines?.[index]?.note)}>
                <FieldLabel htmlFor={`outbound-line-note-${index}`}>Ghi chú</FieldLabel>
                <Input
                  id={`outbound-line-note-${index}`}
                  {...form.register(`lines.${index}.note`)}
                />
                <FieldError errors={[form.formState.errors.lines?.[index]?.note]} />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                aria-label="Xóa dòng"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">3. Đính kèm / ghi chú</h2>
          <Field data-invalid={Boolean(form.formState.errors.note)}>
            <FieldLabel htmlFor="outbound-note">Ghi chú chung</FieldLabel>
            <Textarea id="outbound-note" rows={2} {...form.register('note')} />
            <FieldError errors={[form.formState.errors.note]} />
          </Field>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              disabled={attachments.length >= MAX_ATTACHMENTS}
              onClick={() => attachmentInputRef.current?.click()}
            >
              <Paperclip />
              Đính kèm tệp
            </Button>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept={ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
              className="sr-only"
              aria-label="Chọn tệp đính kèm"
              onChange={(event) => addAttachments(event.target.files)}
            />
            <p className="text-muted-foreground text-xs">
              Tối đa {MAX_ATTACHMENTS} tệp, mỗi tệp không quá 5 MB (PDF, ảnh, Word, Excel, CSV,
              TXT).
            </p>
            {attachments.length > 0 ? (
              <ul className="divide-y border text-sm">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-2 px-2 py-1"
                  >
                    <span className="truncate">
                      {file.name}{' '}
                      <span className="text-muted-foreground text-xs">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Bỏ tệp ${file.name}`}
                      onClick={() =>
                        setAttachments((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
        <p className="text-muted-foreground text-xs">
          Hệ thống tự gán mã phiếu, ngày tạo và người lập khi lưu.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(APP_ROUTES.stockIssueRequests as Route)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={createOrder.isPending}
            onClick={() => void form.handleSubmit((values) => submit(values, true))()}
          >
            Lưu và Thêm
          </Button>
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </form>
      <StockRecipientFormDialog
        open={quickStockRecipientOpen}
        title="Thêm nhanh đơn vị nhận hàng"
        description="Đơn vị nhận hàng mới sẽ được chọn ngay trong yêu cầu hiện tại."
        form={stockRecipientForm}
        isPending={createStockRecipient.isPending}
        isCreate
        codeSuggestionStatus={
          nextRecipientCode.isFetching ? 'loading' : nextRecipientCode.isError ? 'error' : 'ready'
        }
        onCodeChange={codeSuggestion.markEdited}
        onOpenChange={setQuickStockRecipientOpen}
        onSubmit={(values) => void quickCreate(values)}
      />
    </div>
  )
}
