import { AlertCircle, CheckCircle2, Save, Sparkles, TriangleAlert } from 'lucide-react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { InboundDocumentReviewFormValues } from '../../../schemas/inbound-document-import.schema'
import type {
  ExtractedField,
  InboundDocumentImport,
  ReceivingTask,
  SupplierDocumentLineExtraction,
} from '../../../types/inbound.types'
import { DocumentPreview } from './DocumentPreview'

interface ReviewStepProps {
  readonly task: ReceivingTask
  readonly importData: InboundDocumentImport
  readonly form: UseFormReturn<InboundDocumentReviewFormValues>
  readonly isSavingReview: boolean
  readonly isCreatingDraft: boolean
  readonly onSaveReview: () => void
  readonly onCreateDraft: () => void
}

function StatusBadges({
  status,
  isUserCorrected,
}: {
  readonly status: string
  readonly isUserCorrected: boolean
}) {
  const statusBadge =
    status === 'Matched' ? (
      <Badge variant="secondary">
        <CheckCircle2 aria-hidden="true" />
        Khớp
      </Badge>
    ) : status === 'Shortage' ? (
      <Badge variant="outline">
        <TriangleAlert aria-hidden="true" />
        Giao thiếu
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle aria-hidden="true" />
        Cần xử lý
      </Badge>
    )

  return (
    <div className="flex flex-col items-start gap-1">
      {statusBadge}
      {isUserCorrected ? <Badge variant="outline">Đã hiệu chỉnh</Badge> : null}
    </div>
  )
}

const SOURCE_LABELS = {
  AiExtracted: 'AI trích xuất',
  DocumentParser: 'Đọc từ tệp',
  InboundRequest: 'Yêu cầu nhập kho',
  SupplierMaster: 'Danh mục NCC',
  WarehouseMaster: 'Danh mục kho',
  SystemGenerated: 'Hệ thống',
  UserEdited: 'Người dùng sửa',
} as const

const VERIFICATION_LABELS = {
  Unverified: 'Chưa xác nhận',
  Matched: 'Đã đối chiếu',
  LowConfidence: 'Cần kiểm tra',
  Mismatch: 'Không khớp',
  UserConfirmed: 'Đã xác nhận',
  UserCorrected: 'Đã hiệu chỉnh',
  NotProvided: 'Không có dữ liệu',
} as const

function DocumentQuantityCell({
  item,
  fallback,
}: {
  readonly item: SupplierDocumentLineExtraction | undefined
  readonly fallback: number
}) {
  const quantity = item?.deliveredQuantity
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums">{quantity?.rawValue ?? formatQuantity(fallback)}</span>
      {quantity ? (
        <span className="text-muted-foreground text-[11px]">
          {SOURCE_LABELS[quantity.source]} · {VERIFICATION_LABELS[quantity.verificationStatus]}
        </span>
      ) : null}
    </div>
  )
}

function ExtractedValue({ field }: { readonly field: ExtractedField<string> | null }) {
  if (!field?.value) return <dd className="text-muted-foreground">Không có</dd>
  const isUnverified = field.verificationStatus === 'Unverified'
  return (
    <dd className="flex flex-wrap items-center gap-1.5">
      <span className={isUnverified ? 'font-medium' : undefined}>{field.value}</span>
      <Badge variant={isUnverified ? 'outline' : 'secondary'} className="text-[10px]">
        {VERIFICATION_LABELS[field.verificationStatus]}
      </Badge>
    </dd>
  )
}

export function ReviewStep({
  task,
  importData,
  form,
  isSavingReview,
  isCreatingDraft,
  onSaveReview,
  onCreateDraft,
}: ReviewStepProps) {
  const formLines = useWatch({ control: form.control, name: 'lines' })
  const review = importData.review
  if (!review) return null
  const errors = form.formState.errors
  const hasUnsavedChanges = form.formState.isDirty
  const isPending = isSavingReview || isCreatingDraft
  const needsWarehouseAcknowledgement =
    review.hasWarehouseMismatch && !review.warehouseMismatchAcknowledged

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <DocumentPreview importData={importData} />
      <div className="flex min-w-0 flex-col gap-4">
        <Alert>
          <AlertTitle>Kiểm hàng trước khi nhận</AlertTitle>
          <AlertDescription>
            Số xác nhận gồm hàng đạt và hàng từ chối. Phần hỏng được chuyển thành số từ chối trước
            nhận khi tạo phiếu nháp; chỉ phần đạt được nhận vào tồn. Bước gửi phiếu yêu cầu xác nhận
            bên giao giữ hoặc nhận lại hàng từ chối và đính kèm bằng chứng.
          </AlertDescription>
        </Alert>
        <div className="grid gap-3 md:grid-cols-2">
          <section className="bg-muted flex flex-col gap-2 border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-tertiary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Chứng từ đã trích xuất</h3>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Tệp</dt>
              <dd className="truncate">{importData.fileName}</dd>
              <dt className="text-muted-foreground">Số chứng từ</dt>
              <ExtractedValue field={review.extraction.documentNumber} />
              <dt className="text-muted-foreground">Mã yêu cầu</dt>
              <ExtractedValue field={review.extraction.inboundRequestCode} />
              <dt className="text-muted-foreground">Ngày chứng từ</dt>
              <ExtractedValue field={review.extraction.documentDate} />
              <dt className="text-muted-foreground">Ngày giao</dt>
              <ExtractedValue field={review.extraction.supplierDeliveryDate} />
              <dt className="text-muted-foreground">Nhà cung cấp</dt>
              <ExtractedValue field={review.extraction.supplierName} />
              <dt className="text-muted-foreground">Mã kho</dt>
              <ExtractedValue field={review.extraction.warehouseCode} />
              <dt className="text-muted-foreground">Tên kho</dt>
              <ExtractedValue field={review.extraction.warehouseName} />
              <dt className="text-muted-foreground">Nguồn</dt>
              <dd>{importData.extractionProvider ?? 'Không xác định'}</dd>
            </dl>
          </section>
          <section className="bg-card flex flex-col gap-2 border p-3">
            <h3 className="text-sm font-semibold">Dữ liệu WMS có thẩm quyền</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Yêu cầu nhập kho</dt>
              <dd className="font-mono">{review.inboundRequestCode}</dd>
              <dt className="text-muted-foreground">Nhà cung cấp</dt>
              <dd>{review.supplierName}</dd>
              <dt className="text-muted-foreground">Kho nhận</dt>
              <dd>{review.warehouseName}</dd>
              <dt className="text-muted-foreground">Ngày dự kiến</dt>
              <dd>{formatOperationalDate(review.expectedReceiptDate)}</dd>
            </dl>
          </section>
        </div>

        {review.blockingErrors.map((message) => (
          <Alert key={message} variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Lỗi cần xử lý</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ))}
        {review.warnings.map((message) => (
          <Alert key={message}>
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Cảnh báo</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ))}

        {review.hasWarehouseMismatch ? (
          <Alert>
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Kho trên chứng từ khác với yêu cầu nhập kho</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <div className="grid gap-1 sm:grid-cols-2">
                <p>
                  Chứng từ:{' '}
                  <strong>
                    {review.extraction.warehouseCode?.value ?? 'Không có mã'} ·{' '}
                    {review.extraction.warehouseName?.value ?? 'Không có tên'}
                  </strong>
                </p>
                <p>
                  Kho của PO:{' '}
                  <strong>
                    {review.warehouseCode ?? 'Không có mã'} · {review.warehouseName}
                  </strong>
                </p>
              </div>
              <Controller
                control={form.control}
                name="acknowledgeWarehouseMismatch"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id="acknowledge-warehouse-mismatch"
                      checked={field.value}
                      disabled={isPending}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="acknowledge-warehouse-mismatch">
                        Tôi xác nhận sử dụng {review.warehouseCode} · {review.warehouseName} theo
                        đơn mua.
                      </FieldLabel>
                      <FieldDescription>
                        Nội dung AI chỉ dùng để đối chiếu; hệ thống không thay đổi kho nhận của PO.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
              />
            </AlertDescription>
          </Alert>
        ) : null}

        <input type="hidden" {...form.register('inboundRequestId')} />
        <div className="max-h-[42dvh] overflow-auto border">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10">Dòng chứng từ</TableHead>
                <TableHead className="sticky top-0 z-10">Dòng yêu cầu nhập kho</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Còn lại</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">SL chứng từ</TableHead>
                <TableHead className="sticky top-0 z-10">Thông tin lô</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">SL xác nhận</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">SL hỏng</TableHead>
                <TableHead className="sticky top-0 z-10">Tình trạng hàng hỏng</TableHead>
                <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {review.lines.map((line, index) => (
                <TableRow key={line.sourceLineNumber}>
                  <TableCell>
                    <input
                      type="hidden"
                      {...form.register(`lines.${index}.sourceLineNumber`, { valueAsNumber: true })}
                    />
                    <p className="font-mono text-xs">
                      {line.extractedSku ?? `Dòng ${line.sourceLineNumber}`}
                    </p>
                    <p className="text-muted-foreground max-w-48 truncate text-xs">
                      {line.extractedProductName}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Field data-invalid={Boolean(errors.lines?.[index]?.inboundRequestItemId)}>
                      <FieldLabel className="sr-only" htmlFor={`po-line-${index}`}>
                        Dòng yêu cầu nhập kho
                      </FieldLabel>
                      <NativeSelect
                        id={`po-line-${index}`}
                        className="w-64"
                        aria-invalid={Boolean(errors.lines?.[index]?.inboundRequestItemId)}
                        value={formLines[index]?.inboundRequestItemId ?? ''}
                        onChange={(event) => {
                          const option = task.lines.find(
                            (item) => item.inboundRequestItemId === event.target.value
                          )
                          form.setValue(`lines.${index}.inboundRequestItemId`, event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                          form.setValue(
                            `lines.${index}.isLotTracked`,
                            option?.isLotTracked ?? false,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            }
                          )
                          if (!option?.isLotTracked) {
                            form.setValue(`lines.${index}.lotNumber`, '')
                            form.setValue(`lines.${index}.manufacturedDate`, '')
                            form.setValue(`lines.${index}.expiryDate`, '')
                          }
                        }}
                      >
                        <NativeSelectOption value="">Chọn sản phẩm</NativeSelectOption>
                        {task.lines.map((option) => (
                          <NativeSelectOption
                            key={option.inboundRequestItemId}
                            value={option.inboundRequestItemId}
                          >
                            {option.productSKU} · {option.productName}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <FieldError>
                        {errors.lines?.[index]?.inboundRequestItemId?.message}
                      </FieldError>
                    </Field>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(line.remainingQuantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DocumentQuantityCell
                      item={review.extraction.items.find(
                        (item) => item.sourceLineNumber === line.sourceLineNumber
                      )}
                      fallback={line.documentQuantity ?? 0}
                    />
                  </TableCell>
                  <TableCell>
                    <input type="hidden" {...form.register(`lines.${index}.isLotTracked`)} />
                    {formLines[index]?.isLotTracked ? (
                      <div className="grid w-64 gap-2">
                        <Input
                          aria-label={`Số lô dòng ${line.sourceLineNumber}`}
                          placeholder="Số lô"
                          maxLength={100}
                          {...form.register(`lines.${index}.lotNumber`)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            aria-label={`Ngày sản xuất dòng ${line.sourceLineNumber}`}
                            type="date"
                            {...form.register(`lines.${index}.manufacturedDate`)}
                          />
                          <Input
                            aria-label={`Hạn sử dụng dòng ${line.sourceLineNumber}`}
                            type="date"
                            {...form.register(`lines.${index}.expiryDate`)}
                          />
                        </div>
                        <FieldError>{errors.lines?.[index]?.lotNumber?.message}</FieldError>
                        <FieldError>{errors.lines?.[index]?.expiryDate?.message}</FieldError>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Theo số lượng</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Field data-invalid={Boolean(errors.lines?.[index]?.confirmedQuantity)}>
                      <FieldLabel className="sr-only" htmlFor={`confirmed-${index}`}>
                        Số lượng xác nhận
                      </FieldLabel>
                      <Input
                        id={`confirmed-${index}`}
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        min="0.01"
                        step="0.01"
                        className="ml-auto w-28 text-right"
                        aria-invalid={Boolean(errors.lines?.[index]?.confirmedQuantity)}
                        {...form.register(`lines.${index}.confirmedQuantity`, {
                          valueAsNumber: true,
                        })}
                      />
                      <FieldError>{errors.lines?.[index]?.confirmedQuantity?.message}</FieldError>
                    </Field>
                  </TableCell>
                  <TableCell>
                    <Field data-invalid={Boolean(errors.lines?.[index]?.damagedQuantity)}>
                      <FieldLabel className="sr-only" htmlFor={`damaged-import-${index}`}>
                        Số lượng hỏng
                      </FieldLabel>
                      <Input
                        id={`damaged-import-${index}`}
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        min="0"
                        step="0.01"
                        className="ml-auto w-24 text-right"
                        aria-invalid={Boolean(errors.lines?.[index]?.damagedQuantity)}
                        {...form.register(`lines.${index}.damagedQuantity`, {
                          valueAsNumber: true,
                        })}
                      />
                      <FieldError>{errors.lines?.[index]?.damagedQuantity?.message}</FieldError>
                    </Field>
                  </TableCell>
                  <TableCell>
                    <Field data-invalid={Boolean(errors.lines?.[index]?.exceptionReason)}>
                      <FieldLabel className="sr-only" htmlFor={`exception-import-${index}`}>
                        Tình trạng hàng hỏng
                      </FieldLabel>
                      <Input
                        id={`exception-import-${index}`}
                        className="w-56"
                        autoComplete="off"
                        placeholder="Ví dụ: vỡ thùng…"
                        aria-invalid={Boolean(errors.lines?.[index]?.exceptionReason)}
                        {...form.register(`lines.${index}.exceptionReason`)}
                      />
                      <FieldError>{errors.lines?.[index]?.exceptionReason?.message}</FieldError>
                    </Field>
                  </TableCell>
                  <TableCell>
                    <StatusBadges status={line.status} isUserCorrected={line.isUserCorrected} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isPending} onClick={onSaveReview}>
            {isSavingReview ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Lưu và kiểm tra lại
          </Button>
          <Button
            type="button"
            title={
              hasUnsavedChanges
                ? 'Lưu và kiểm tra lại các thay đổi trước khi tạo phiếu.'
                : needsWarehouseAcknowledgement
                  ? 'Xác nhận sử dụng kho của yêu cầu nhập kho để tiếp tục.'
                  : undefined
            }
            disabled={
              isPending ||
              hasUnsavedChanges ||
              importData.status !== 'ReadyForDraft' ||
              !review.canCreateDraft
            }
            onClick={onCreateDraft}
          >
            {isCreatingDraft ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckCircle2 data-icon="inline-start" />
            )}
            Tạo phiếu nhận hàng nháp
          </Button>
        </div>
      </div>
    </div>
  )
}
