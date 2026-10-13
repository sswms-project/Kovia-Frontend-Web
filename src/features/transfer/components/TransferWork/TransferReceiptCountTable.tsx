import type { UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferCountFormValues } from '../../schemas/transfer-receipt.schema'
import type { TransferReceiptSheet } from '../../types/transfer-receipt.types'
import { TRANSFER_RECEIPT_REASONS } from '../../types/transfer.types'
import { RECEIPT_REASON_LABELS } from '../../utils/transfer-format'

interface Props {
  readonly form: UseFormReturn<TransferCountFormValues>
  readonly sheet: TransferReceiptSheet
  readonly disabled: boolean
}

export function TransferReceiptCountTable({ form, sheet, disabled }: Props) {
  const entries = form.watch('entries')
  const errors = form.formState.errors.entries
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hàng hóa / Lô</TableHead>
          <TableHead className="text-right">Theo phiếu</TableHead>
          <TableHead>Thực nhận tốt</TableHead>
          <TableHead>Hỏng</TableHead>
          <TableHead>Thiếu</TableHead>
          <TableHead>Kiểm tra</TableHead>
          <TableHead>Nguyên nhân / Ghi chú</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry, index) => {
          const line = sheet.lines.find((line) => line.lineId === entry.lineId)
          const lot = line?.lots.find((lot) => lot.lotId === entry.lotId)
          if (!line || !lot) return null
          const declared = entry.goodQuantity + entry.damagedQuantity + entry.missingQuantity
          const matched =
            Number.isFinite(declared) && Math.abs(declared - lot.dispatchedQuantity) < 1e-7
          const hasDiscrepancy = entry.damagedQuantity > 0 || entry.missingQuantity > 0
          return (
            <TableRow key={`${entry.lineId}-${entry.lotId ?? 'no-lot'}`}>
              <TableCell className="max-w-80 min-w-48 break-words whitespace-normal">
                <p className="font-medium">{line.productName}</p>
                <p className="font-mono text-xs" translate="no">
                  {line.sku}
                </p>
                <p className="text-muted-foreground text-xs">
                  {lot.lotNumber ? `Lô ${lot.lotNumber}` : 'Không theo lô'} · {line.baseUnitName}
                </p>
                {lot.lateReceivedQuantity > 0 ? (
                  <p className="text-primary text-xs">
                    Nhận bổ sung {formatQuantity(lot.lateReceivedQuantity)} (đã cất)
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatQuantity(lot.dispatchedQuantity)}
              </TableCell>
              {(['goodQuantity', 'damagedQuantity', 'missingQuantity'] as const).map((field) => {
                const label =
                  field === 'goodQuantity'
                    ? 'Thực nhận tốt'
                    : field === 'damagedQuantity'
                      ? 'Hỏng'
                      : 'Thiếu'
                const id = `count-${index}-${field}`
                return (
                  <TableCell key={field} className="min-w-28 align-top">
                    <Field data-invalid={Boolean(errors?.[index]?.[field])}>
                      <FieldLabel className="sr-only" htmlFor={id}>
                        {label} · {line.sku} · {lot.lotNumber ?? 'Không theo lô'}
                      </FieldLabel>
                      <Input
                        id={id}
                        type="number"
                        min={0}
                        step={10 ** -Math.min(2, line.baseQuantityPrecision)}
                        inputMode="decimal"
                        disabled={disabled}
                        aria-invalid={Boolean(errors?.[index]?.[field])}
                        aria-describedby={errors?.[index]?.[field] ? `${id}-error` : undefined}
                        {...form.register(`entries.${index}.${field}`, { valueAsNumber: true })}
                      />
                      <FieldError id={`${id}-error`}>
                        {errors?.[index]?.[field]?.message}
                      </FieldError>
                    </Field>
                  </TableCell>
                )
              })}
              <TableCell className="whitespace-normal">
                <Badge
                  variant={matched ? (hasDiscrepancy ? 'outline' : 'secondary') : 'destructive'}
                >
                  {matched ? (hasDiscrepancy ? 'Có chênh lệch' : 'Khớp') : 'Chưa đủ / Vượt số xuất'}
                </Badge>
              </TableCell>
              <TableCell className="min-w-56 align-top whitespace-normal">
                <div className="flex flex-col gap-2">
                  {hasDiscrepancy ? (
                    <Field data-invalid={Boolean(errors?.[index]?.reasonCode)}>
                      <FieldLabel htmlFor={`count-${index}-reason`}>
                        Nguyên nhân hỏng/thiếu
                      </FieldLabel>
                      <NativeSelect
                        id={`count-${index}-reason`}
                        disabled={disabled}
                        aria-invalid={Boolean(errors?.[index]?.reasonCode)}
                        {...form.register(`entries.${index}.reasonCode`)}
                      >
                        <NativeSelectOption value="">Chọn nguyên nhân</NativeSelectOption>
                        {TRANSFER_RECEIPT_REASONS.map((reason) => (
                          <NativeSelectOption key={reason} value={reason}>
                            {RECEIPT_REASON_LABELS[reason]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <FieldError>{errors?.[index]?.reasonCode?.message}</FieldError>
                    </Field>
                  ) : null}
                  <Field data-invalid={Boolean(errors?.[index]?.note)}>
                    <FieldLabel className="sr-only" htmlFor={`count-${index}-note`}>
                      Ghi chú · {line.sku}
                    </FieldLabel>
                    <Textarea
                      id={`count-${index}-note`}
                      disabled={disabled}
                      rows={2}
                      maxLength={500}
                      placeholder="Ghi chú (tùy chọn)"
                      {...form.register(`entries.${index}.note`)}
                    />
                    <FieldError>{errors?.[index]?.note?.message}</FieldError>
                  </Field>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
