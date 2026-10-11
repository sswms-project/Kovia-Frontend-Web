import { TriangleAlert } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import { cn } from '@/lib/utils'
import type { TransferEscalationResolutionFormValues } from '../../schemas/transfer-fulfillment.schema'
import {
  TRANSFER_ESCALATION_ACTIONS,
  type TransferPickAlternative,
  type TransferPickException,
  type TransferPickSheetLine,
} from '../../types/transfer.types'
import { ESCALATION_ACTION_LABELS, PICK_REASON_LABELS, labelOf } from '../../utils/transfer-format'
import { formatTransferLocation } from '../../utils/transfer-location'

export interface PendingEscalation {
  readonly line: TransferPickSheetLine
  readonly exception: TransferPickException
}

interface ResolveEscalationDialogProps {
  readonly open: boolean
  readonly escalations: readonly PendingEscalation[]
  readonly selectedExceptionId: string
  readonly alternatives: readonly TransferPickAlternative[]
  readonly isLoading: boolean
  readonly form: UseFormReturn<TransferEscalationResolutionFormValues>
  readonly isPending: boolean
  readonly onSelect: (escalation: PendingEscalation) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TransferEscalationResolutionFormValues) => void
}

export function ResolveEscalationDialog({
  open,
  escalations,
  selectedExceptionId,
  alternatives,
  isLoading,
  form,
  isPending,
  onSelect,
  onOpenChange,
  onSubmit,
}: ResolveEscalationDialogProps) {
  const errors = form.formState.errors
  const action = form.watch('action')
  const selected = escalations.find((entry) => entry.exception.id === selectedExceptionId)
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-xl">
        <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo lấy hàng</DialogTitle>
            <DialogDescription>
              Nhân viên tiếp tục lấy các dòng khác trong lúc chờ bạn quyết định.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Đang tải báo cáo…</p>
          ) : escalations.length === 0 ? (
            <p className="text-sm">Không còn báo cáo nào chờ xử lý.</p>
          ) : (
            <>
              <ul className="grid gap-2" aria-label="Báo cáo chờ xử lý">
                {escalations.map((entry) => (
                  <li key={entry.exception.id}>
                    <button
                      type="button"
                      aria-pressed={entry.exception.id === selectedExceptionId}
                      className={cn(
                        'focus-visible:ring-ring w-full border p-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none',
                        entry.exception.id === selectedExceptionId && 'border-primary bg-primary/5'
                      )}
                      onClick={() => onSelect(entry)}
                    >
                      <span className="block font-medium">
                        <span className="font-mono">{entry.line.sku}</span> ·{' '}
                        {entry.line.productName}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="bg-warning-container text-on-warning-container inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-semibold">
                          <TriangleAlert aria-hidden="true" className="size-4" />
                          {labelOf(PICK_REASON_LABELS, entry.exception.reasonCode)}
                        </span>
                        <span className="text-sm font-medium tabular-nums">
                          Số lượng: {formatQuantity(entry.exception.quantity)}{' '}
                          {entry.line.baseUnitName}
                        </span>
                      </span>
                      {entry.exception.note ? (
                        <span className="mt-1.5 block text-sm">
                          <span className="text-muted-foreground">Nhân viên ghi: </span>
                          {entry.exception.note}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              {selected ? (
                <>
                  <Field data-invalid={Boolean(errors.action)}>
                    <FieldLabel htmlFor="escalation-action">Cách xử lý</FieldLabel>
                    <NativeSelect
                      id="escalation-action"
                      className="w-full"
                      {...form.register('action')}
                    >
                      {TRANSFER_ESCALATION_ACTIONS.map((value) => (
                        <NativeSelectOption key={value} value={value}>
                          {ESCALATION_ACTION_LABELS[value]}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError>{errors.action?.message}</FieldError>
                  </Field>
                  {action === 'UseStock' ? (
                    <Field data-invalid={Boolean(errors.toInventoryStockId)}>
                      <FieldLabel htmlFor="escalation-stock">Vị trí/lô thay thế</FieldLabel>
                      <NativeSelect
                        id="escalation-stock"
                        className="w-full"
                        {...form.register('toInventoryStockId')}
                      >
                        <NativeSelectOption value="">Chọn vị trí/lô theo FEFO</NativeSelectOption>
                        {alternatives.map((alternative) => (
                          <NativeSelectOption
                            key={alternative.inventoryStockId}
                            value={alternative.inventoryStockId}
                          >
                            {formatTransferLocation(alternative)}
                            {alternative.lotNumber ? ` · lô ${alternative.lotNumber}` : ''}
                            {alternative.expiryDate
                              ? ` · HSD ${formatOperationalDate(alternative.expiryDate)}`
                              : ''}{' '}
                            · còn {formatQuantity(alternative.availableQuantity)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <FieldError>{errors.toInventoryStockId?.message}</FieldError>
                    </Field>
                  ) : null}
                  <Field data-invalid={Boolean(errors.quantity)}>
                    <FieldLabel htmlFor="escalation-quantity">Số lượng</FieldLabel>
                    <Input
                      id="escalation-quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      aria-invalid={Boolean(errors.quantity)}
                      {...form.register('quantity', { valueAsNumber: true })}
                    />
                    <FieldError>{errors.quantity?.message}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(errors.note)}>
                    <FieldLabel htmlFor="escalation-note">Ghi chú cho nhân viên</FieldLabel>
                    <Textarea
                      id="escalation-note"
                      rows={2}
                      maxLength={500}
                      aria-invalid={Boolean(errors.note)}
                      {...form.register('note')}
                    />
                    <FieldError>{errors.note?.message}</FieldError>
                  </Field>
                </>
              ) : null}
            </>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button type="submit" disabled={isPending || !selected}>
              {isPending ? 'Đang xử lý…' : 'Xác nhận xử lý'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
