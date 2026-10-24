import { useId } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferCountFormValues } from '../../schemas/transfer-receipt.schema'
import { TransferReceiptQuantityInput } from './TransferReceiptQuantityInput'
import type { TransferReceiptSheet } from '../../types/transfer-receipt.types'
import { TRANSFER_RECEIPT_REASONS } from '../../types/transfer.types'
import { RECEIPT_REASON_LABELS } from '../../utils/transfer-format'

interface Props {
  readonly form: UseFormReturn<TransferCountFormValues>
  readonly sheet: TransferReceiptSheet
  readonly disabled: boolean
}

export function TransferReceiptCountCards({ form, sheet, disabled }: Props) {
  const instanceId = useId()
  const entries = form.watch('entries')
  const errors = form.formState.errors.entries
  return (
    <div data-slot="operational-list-body" className="@container/receipt p-3">
      <div className="grid min-w-0 items-start gap-3">
        {entries.map((entry, index) => {
          const line = sheet.lines.find((line) => line.lineId === entry.lineId)
          const lot = line?.lots.find((lot) => lot.lotId === entry.lotId)
          if (!line || !lot) return null
          // Chưa kiểm đếm được giữ là NaN trong form; tổng tạm coi là 0, schema vẫn chặn nộp.
          const damaged = entry.damagedQuantity || 0
          const missing = entry.missingQuantity || 0
          const declared = (entry.goodQuantity || 0) + damaged + missing
          const matched = Math.abs(declared - lot.dispatchedQuantity) < 1e-7
          const hasDiscrepancy = damaged > 0 || missing > 0
          const prefix = instanceId + '-count-' + index
          return (
            <Card
              key={entry.lineId + '-' + (entry.lotId ?? 'no-lot')}
              size="sm"
              className="min-w-0 border ring-0 @3xl/receipt:flex-row @3xl/receipt:flex-wrap @3xl/receipt:items-start @3xl/receipt:has-data-[slot=card-footer]:pb-(--card-spacing)"
              role="group"
              aria-labelledby={prefix + '-title'}
            >
              <CardHeader className="min-w-0 gap-2 @3xl/receipt:w-60 @3xl/receipt:shrink-0">
                <CardTitle>
                  <h2 id={prefix + '-title'} className="wrap-anywhere">
                    {line.productName}
                  </h2>
                </CardTitle>
                <CardDescription className="flex min-w-0 flex-col gap-1">
                  <span className="font-mono wrap-anywhere" translate="no">
                    {line.sku}
                  </span>
                  <span className="wrap-anywhere">
                    {lot.lotNumber ? 'Lô ' + lot.lotNumber : 'Không theo lô'} · {line.baseUnitName}
                  </span>
                </CardDescription>
                <p className="tabular-nums">
                  Theo phiếu:{' '}
                  <strong>
                    {formatQuantity(lot.dispatchedQuantity)} {line.baseUnitName}
                  </strong>
                </p>
                {lot.lateReceivedQuantity > 0 ? (
                  <p className="text-primary text-xs">
                    Nhận bổ sung {formatQuantity(lot.lateReceivedQuantity)} (đã cất)
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="@3xl/receipt:w-80 @3xl/receipt:shrink-0">
                <FieldGroup className="grid grid-cols-3 gap-2">
                  {(['goodQuantity', 'damagedQuantity', 'missingQuantity'] as const).map(
                    (field) => {
                      const label =
                        field === 'goodQuantity'
                          ? 'SL thực nhận'
                          : field === 'damagedQuantity'
                            ? 'Hỏng'
                            : 'Thiếu'
                      const id = prefix + '-' + field
                      return (
                        <Field
                          key={field}
                          className="min-w-0"
                          data-invalid={Boolean(errors?.[index]?.[field])}
                          data-disabled={disabled}
                        >
                          <FieldLabel htmlFor={id}>
                            {label}
                            <span className="sr-only">
                              {' '}
                              · {line.sku} · {lot.lotNumber ?? 'Không theo lô'}
                            </span>
                          </FieldLabel>
                          <Controller
                            control={form.control}
                            name={`entries.${index}.${field}`}
                            render={({ field: quantityField }) => (
                              <TransferReceiptQuantityInput
                                {...quantityField}
                                id={id}
                                className="h-11 min-w-0 text-base md:text-xs"
                                type="text"
                                inputMode={line.baseQuantityPrecision === 0 ? 'numeric' : 'decimal'}
                                autoComplete="off"
                                placeholder={
                                  field === 'goodQuantity' ? 'Nhập số thực nhận' : undefined
                                }
                                disabled={disabled}
                                aria-invalid={Boolean(errors?.[index]?.[field])}
                                aria-describedby={
                                  errors?.[index]?.[field] ? id + '-error' : undefined
                                }
                              />
                            )}
                          />
                          <FieldError id={id + '-error'} className="wrap-anywhere">
                            {errors?.[index]?.[field]?.message}
                          </FieldError>
                        </Field>
                      )
                    }
                  )}
                </FieldGroup>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3 @3xl/receipt:min-w-[28rem] @3xl/receipt:flex-1 @3xl/receipt:flex-row @3xl/receipt:items-start @3xl/receipt:border-t-0 @3xl/receipt:py-0">
                <div className="flex flex-wrap items-center gap-2 @3xl/receipt:w-40 @3xl/receipt:shrink-0 @3xl/receipt:flex-col @3xl/receipt:items-start @3xl/receipt:pt-5">
                  <Badge
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    variant={matched ? (hasDiscrepancy ? 'outline' : 'secondary') : 'destructive'}
                  >
                    <span className="sr-only">
                      {line.sku} · {lot.lotNumber ?? 'Không theo lô'}:{' '}
                    </span>
                    {matched
                      ? hasDiscrepancy
                        ? 'Có chênh lệch'
                        : 'Khớp'
                      : 'Chưa đủ / Vượt số xuất'}
                  </Badge>
                  <span className="text-muted-foreground tabular-nums">
                    Đã kiểm: {formatQuantity(declared)}
                  </span>
                </div>
                <FieldGroup className="gap-3 @3xl/receipt:min-w-0 @3xl/receipt:flex-1 @3xl/receipt:flex-row">
                  {hasDiscrepancy ? (
                    <Field
                      className="@3xl/receipt:w-56 @3xl/receipt:shrink-0"
                      data-invalid={Boolean(errors?.[index]?.reasonCode)}
                      data-disabled={disabled}
                    >
                      <FieldLabel htmlFor={prefix + '-reason'}>Nguyên nhân hỏng/thiếu</FieldLabel>
                      <NativeSelect
                        id={prefix + '-reason'}
                        className="w-full [&_select]:h-11"
                        disabled={disabled}
                        aria-invalid={Boolean(errors?.[index]?.reasonCode)}
                        aria-describedby={
                          errors?.[index]?.reasonCode ? prefix + '-reason-error' : undefined
                        }
                        {...form.register(`entries.${index}.reasonCode`)}
                      >
                        <NativeSelectOption value="">Chọn nguyên nhân…</NativeSelectOption>
                        {TRANSFER_RECEIPT_REASONS.map((reason) => (
                          <NativeSelectOption key={reason} value={reason}>
                            {RECEIPT_REASON_LABELS[reason]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <FieldError id={prefix + '-reason-error'}>
                        {errors?.[index]?.reasonCode?.message}
                      </FieldError>
                    </Field>
                  ) : null}
                  <Field
                    className="min-w-0 @3xl/receipt:flex-1"
                    data-invalid={Boolean(errors?.[index]?.note)}
                    data-disabled={disabled}
                  >
                    <FieldLabel htmlFor={prefix + '-note'}>Ghi chú (tùy chọn)</FieldLabel>
                    <Textarea
                      id={prefix + '-note'}
                      disabled={disabled}
                      rows={2}
                      maxLength={500}
                      placeholder="Ghi chú kiểm hàng…"
                      aria-invalid={Boolean(errors?.[index]?.note)}
                      aria-describedby={errors?.[index]?.note ? prefix + '-note-error' : undefined}
                      {...form.register(`entries.${index}.note`)}
                    />
                    <FieldError id={prefix + '-note-error'}>
                      {errors?.[index]?.note?.message}
                    </FieldError>
                  </Field>
                </FieldGroup>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
