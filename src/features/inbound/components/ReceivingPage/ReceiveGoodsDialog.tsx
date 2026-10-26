'use client'

import { Save, Send } from 'lucide-react'
import { BusinessCodeField } from '@/components/forms/BusinessCodeField'
import type { UseFormReturn } from 'react-hook-form'
import type { ReactNode } from 'react'
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
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getReceiptUnit, getRemainingReceiptQuantity } from '../../utils/receipt-units'
import type { GoodsReceiptFormValues } from '../../schemas/inbound.schema'
import type { ReceivingTask } from '../../types/inbound.types'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { ReceiveQuickActions } from './ReceiveQuickActions'

interface ReceiveGoodsDialogProps {
  readonly receivingLocationField?: ReactNode
  readonly acceptanceFirst?: boolean
  readonly task: ReceivingTask | null
  readonly form: UseFormReturn<GoodsReceiptFormValues>
  readonly isPending: boolean
  readonly title?: string
  readonly description?: string
  readonly saveDraftLabel?: string
  readonly mode?: 'create' | 'edit'
  readonly canEditReceivedQuantity?: boolean
  readonly isLoadingCode?: boolean
  readonly isCodeSuggestionError?: boolean
  readonly onReceiptCodeChange?: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSaveDraft: () => void
  readonly onSaveAndSubmit: () => void
}

export function ReceiveGoodsDialog({
  task,
  form,
  isPending,
  title,
  description,
  saveDraftLabel = 'Lưu nháp',
  mode = 'create',
  canEditReceivedQuantity = true,
  receivingLocationField,
  acceptanceFirst = true,
  isLoadingCode = false,
  isCodeSuggestionError = false,
  onReceiptCodeChange,
  onOpenChange,
  onSaveDraft,
  onSaveAndSubmit,
}: ReceiveGoodsDialogProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form
  const selectedLines = watch('lines')
  return (
    <Dialog open={Boolean(task)} onOpenChange={onOpenChange}>
      <DialogContent
        data-scrollbar="slim"
        className="max-h-[90dvh] overflow-y-auto overscroll-contain sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{title ?? `Nhận hàng ${task?.inboundRequestCode ?? ''}`}</DialogTitle>
          <DialogDescription>
            {description ??
              'Kiểm trước nhận: ghi riêng phần chấp nhận và phần từ chối bên giao giữ/mang về. Phần từ chối không vào tồn.'}
          </DialogDescription>
        </DialogHeader>
        {task ? (
          <div className="flex flex-col gap-3">
            {receivingLocationField}
            <div className="bg-muted grid gap-3 border p-3 text-sm sm:grid-cols-2">
              <BusinessCodeField
                label="Mã phiếu nhận *"
                error={errors.receiptCode}
                description={
                  canEditReceivedQuantity ? 'Mã được gợi ý, có thể chỉnh sửa.' : undefined
                }
                suggestionStatus={
                  mode === 'create'
                    ? isLoadingCode
                      ? 'loading'
                      : isCodeSuggestionError
                        ? 'error'
                        : 'ready'
                    : undefined
                }
                inputProps={{
                  ...register('receiptCode', { onChange: onReceiptCodeChange }),
                  id: 'receipt-code',
                  required: true,
                  maxLength: 100,
                  placeholder: 'VD: PN000001…',
                  // Keep the field focusable when a save response reports a code conflict.
                  readOnly: !canEditReceivedQuantity || isPending,
                }}
              />
              <dl className="contents">
                <div>
                  <dt className="text-muted-foreground text-xs">Mã yêu cầu</dt>
                  <dd className="font-medium break-all">{task.inboundRequestCode}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Nhà cung cấp / nguồn hàng</dt>
                  <dd className="font-medium">
                    {[task.supplierCode, task.supplierName || task.sourceName]
                      .filter(Boolean)
                      .join(' — ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Kho nhận</dt>
                  <dd className="font-medium">
                    {[task.warehouseCode, task.warehouseName].filter(Boolean).join(' — ')}
                  </dd>
                </div>
              </dl>
            </div>
            {mode === 'create' && canEditReceivedQuantity ? (
              <ReceiveQuickActions
                key={task.inboundRequestId}
                task={task}
                form={form}
                disabled={isPending}
              />
            ) : null}
            {task.lines
              .filter((line) =>
                selectedLines.some(
                  (value) => value.inboundRequestItemId === line.inboundRequestItemId
                )
              )
              .map((line, index) => {
                const unitId = watch(`lines.${index}.enteredUnitId`)
                const unit = getReceiptUnit(line, unitId)
                const remaining = getRemainingReceiptQuantity(line, unitId)
                const damaged = watch(`lines.${index}.damagedQty`) ?? 0
                const received = watch(`lines.${index}.receivedQty`) ?? 0
                const refused = watch(`lines.${index}.rejectedQty`) ?? 0
                const editsRefusal = acceptanceFirst && canEditReceivedQuantity
                const classificationError = editsRefusal
                  ? errors.lines?.[index]?.rejectedQty
                  : errors.lines?.[index]?.damagedQty
                return (
                  <section key={line.inboundRequestItemId} className="border p-3">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{line.productName}</p>
                        <p className="text-muted-foreground font-mono text-xs">{line.productSKU}</p>
                      </div>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {mode === 'edit' ? (
                          <>
                            Số lượng trên phiếu {formatQuantity(received)} {unit.name}
                          </>
                        ) : (
                          <>
                            Yêu cầu {formatQuantity(line.orderedQuantity / unit.factor)} {unit.name}{' '}
                            · Đã nhận {formatQuantity(line.receivedQuantity / unit.factor)}{' '}
                            {unit.name} · Còn {formatQuantity(line.remainingQuantity / unit.factor)}{' '}
                            {unit.name}
                          </>
                        )}
                      </p>
                      {canEditReceivedQuantity && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending}
                          aria-label={`Không nhận ${line.productSKU} trong lần này`}
                          onClick={() =>
                            setValue(
                              'lines',
                              form
                                .getValues('lines')
                                .filter(
                                  (value) =>
                                    value.inboundRequestItemId !== line.inboundRequestItemId
                                ),
                              { shouldDirty: true, shouldValidate: true }
                            )
                          }
                        >
                          Không nhận dòng này
                        </Button>
                      )}
                    </div>
                    <input type="hidden" {...register(`lines.${index}.inboundRequestItemId`)} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor={`receipt-unit-${index}`}>Đơn vị nhận</FieldLabel>
                        <NativeSelect
                          id={`receipt-unit-${index}`}
                          value={unitId ?? ''}
                          disabled={isPending || !line.baseUnitId || !canEditReceivedQuantity}
                          onChange={(event) => {
                            setValue(`lines.${index}.enteredUnitId`, event.target.value, {
                              shouldDirty: true,
                            })
                            setValue(`lines.${index}.receivedQty`, 0, { shouldDirty: true })
                            setValue(`lines.${index}.damagedQty`, 0, { shouldDirty: true })
                            setValue(`lines.${index}.rejectedQty`, 0, { shouldDirty: true })
                            setValue(`lines.${index}.rejectedQty`, 0, { shouldDirty: true })
                          }}
                        >
                          {line.baseUnitId ? (
                            <NativeSelectOption value={line.baseUnitId}>
                              {line.baseUnitName}
                            </NativeSelectOption>
                          ) : (
                            <NativeSelectOption value="">—</NativeSelectOption>
                          )}
                          {line.enteredUnitId && line.enteredUnitId !== line.baseUnitId ? (
                            <NativeSelectOption value={line.enteredUnitId}>
                              {line.enteredUnitName}
                            </NativeSelectOption>
                          ) : null}
                        </NativeSelect>
                      </Field>
                      <Field data-invalid={Boolean(errors.lines?.[index]?.receivedQty)}>
                        <FieldLabel htmlFor={`received-${index}`}>
                          {acceptanceFirst
                            ? 'Số lượng chấp nhận nhận'
                            : 'Số lượng thực nhận lịch sử'}
                        </FieldLabel>
                        <Input
                          id={`received-${index}`}
                          readOnly={!canEditReceivedQuantity}
                          type="number"
                          min={0}
                          max={
                            mode === 'create'
                              ? remaining.unitId === unitId
                                ? remaining.quantity
                                : line.remainingQuantity / unit.factor
                              : undefined
                          }
                          step={10 ** -unit.precision}
                          disabled={isPending}
                          aria-invalid={Boolean(errors.lines?.[index]?.receivedQty)}
                          {...register(`lines.${index}.receivedQty`, { valueAsNumber: true })}
                        />
                        <FieldError>{errors.lines?.[index]?.receivedQty?.message}</FieldError>
                      </Field>
                      <Field data-invalid={Boolean(classificationError)}>
                        <FieldLabel htmlFor={`damaged-${index}`}>
                          {acceptanceFirst && canEditReceivedQuantity
                            ? 'Số từ chối trước nhận'
                            : 'Hỏng sau khi đã nhận'}
                        </FieldLabel>
                        <Input
                          id={`damaged-${index}`}
                          type="number"
                          min="0"
                          step={10 ** -unit.precision}
                          disabled={isPending}
                          aria-invalid={Boolean(classificationError)}
                          {...register(
                            acceptanceFirst && canEditReceivedQuantity
                              ? `lines.${index}.rejectedQty`
                              : `lines.${index}.damagedQty`,
                            { setValueAs: (value: string) => (value === '' ? 0 : Number(value)) }
                          )}
                        />
                        <FieldError>{classificationError?.message}</FieldError>
                      </Field>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
                      Phần chấp nhận: {formatQuantity(Math.max(0, received - damaged))} {unit.name}
                      {editsRefusal ? ` · Từ chối: ${formatQuantity(refused)} ${unit.name}` : ''}
                      {' · '}Quy đổi: {formatQuantity(received * unit.factor)}{' '}
                      {line.baseUnitName ?? '—'}
                    </p>
                    {mode === 'create' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={isPending}
                        onClick={() => {
                          const remaining = getRemainingReceiptQuantity(line, unitId)
                          if (remaining.unitId !== unitId) {
                            setValue(`lines.${index}.enteredUnitId`, remaining.unitId, {
                              shouldDirty: true,
                            })
                            setValue(`lines.${index}.damagedQty`, 0, { shouldDirty: true })
                          }
                          setValue(`lines.${index}.receivedQty`, remaining.quantity, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }}
                      >
                        Nhận toàn bộ còn lại
                      </Button>
                    ) : null}
                    {damaged > 0 || refused > 0 ? (
                      <Field
                        className="mt-3"
                        data-invalid={Boolean(errors.lines?.[index]?.exceptionReason)}
                      >
                        <FieldLabel htmlFor={`exception-${index}`}>
                          {editsRefusal ? 'Lý do từ chối nhận' : 'Tình trạng hàng hỏng'}
                        </FieldLabel>
                        <Input
                          id={`exception-${index}`}
                          maxLength={500}
                          aria-invalid={Boolean(errors.lines?.[index]?.exceptionReason)}
                          {...register(`lines.${index}.exceptionReason`)}
                        />
                        <FieldError>{errors.lines?.[index]?.exceptionReason?.message}</FieldError>
                      </Field>
                    ) : null}
                    {line.isLotTracked ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <Field data-invalid={Boolean(errors.lines?.[index]?.lotNumber)}>
                          <FieldLabel htmlFor={`lot-number-${index}`}>Số lô</FieldLabel>
                          <Input
                            id={`lot-number-${index}`}
                            maxLength={100}
                            aria-invalid={Boolean(errors.lines?.[index]?.lotNumber)}
                            {...register(`lines.${index}.lotNumber`)}
                          />
                          <FieldError>{errors.lines?.[index]?.lotNumber?.message}</FieldError>
                        </Field>
                        <Field data-invalid={Boolean(errors.lines?.[index]?.manufacturedDate)}>
                          <FieldLabel htmlFor={`manufactured-date-${index}`}>
                            Ngày sản xuất
                          </FieldLabel>
                          <Input
                            id={`manufactured-date-${index}`}
                            type="date"
                            aria-invalid={Boolean(errors.lines?.[index]?.manufacturedDate)}
                            {...register(`lines.${index}.manufacturedDate`)}
                          />
                          <FieldError>
                            {errors.lines?.[index]?.manufacturedDate?.message}
                          </FieldError>
                        </Field>
                        <Field data-invalid={Boolean(errors.lines?.[index]?.expiryDate)}>
                          <FieldLabel htmlFor={`expiry-date-${index}`}>Hạn sử dụng</FieldLabel>
                          <Input
                            id={`expiry-date-${index}`}
                            type="date"
                            aria-invalid={Boolean(errors.lines?.[index]?.expiryDate)}
                            {...register(`lines.${index}.expiryDate`)}
                          />
                          <FieldError>{errors.lines?.[index]?.expiryDate?.message}</FieldError>
                        </Field>
                      </div>
                    ) : null}
                  </section>
                )
              })}
            {canEditReceivedQuantity &&
              task.lines
                .filter(
                  (line) =>
                    line.remainingQuantity > 0 &&
                    !selectedLines.some(
                      (value) => value.inboundRequestItemId === line.inboundRequestItemId
                    )
                )
                .map((line) => (
                  <Button
                    key={line.inboundRequestItemId}
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      setValue(
                        'lines',
                        [
                          ...form.getValues('lines'),
                          {
                            inboundRequestItemId: line.inboundRequestItemId,
                            enteredUnitId: getRemainingReceiptQuantity(line, line.enteredUnitId)
                              .unitId,
                            receivedQty: 0,
                            damagedQty: 0,
                            exceptionReason: '',
                            isLotTracked: line.isLotTracked,
                            lotNumber: '',
                            manufacturedDate: '',
                            expiryDate: '',
                          },
                        ].sort(
                          (a, b) =>
                            task.lines.findIndex(
                              (item) => item.inboundRequestItemId === a.inboundRequestItemId
                            ) -
                            task.lines.findIndex(
                              (item) => item.inboundRequestItemId === b.inboundRequestItemId
                            )
                        ),
                        { shouldDirty: true }
                      )
                    }
                  >
                    Chọn nhận {line.productSKU}
                  </Button>
                ))}
            <FieldError>{errors.lines?.root?.message ?? errors.lines?.message}</FieldError>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={onSaveDraft}>
            <Save aria-hidden="true" />
            {saveDraftLabel}
          </Button>
          <Button type="button" disabled={isPending} onClick={onSaveAndSubmit}>
            <Send aria-hidden="true" />
            Lưu và gửi duyệt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
