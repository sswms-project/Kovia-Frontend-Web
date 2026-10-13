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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferDiscrepancyFormValues } from '../../schemas/transfer-fulfillment.schema'
import type { TransferDiscrepancy, TransferDiscrepancyAction } from '../../types/transfer.types'
import { DISCREPANCY_ACTION_LABELS, DISCREPANCY_TYPE_LABELS } from '../../utils/transfer-format'

export interface DiscrepancyLotOption {
  readonly id: string
  readonly label: string
}

interface ResolveDiscrepancyDialogProps {
  readonly unknownResult?: boolean
  readonly discrepancy: TransferDiscrepancy | null
  readonly form: UseFormReturn<TransferDiscrepancyFormValues>
  readonly lotOptions: readonly DiscrepancyLotOption[]
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TransferDiscrepancyFormValues) => void
}

function actionsFor(discrepancy: TransferDiscrepancy): TransferDiscrepancyAction[] {
  return discrepancy.type === 'Missing' ? ['LateReceipt', 'ConfirmLoss'] : ['AcknowledgeDamage']
}

export function ResolveDiscrepancyDialog({
  discrepancy,
  form,
  lotOptions,
  isPending,
  onOpenChange,
  onSubmit,
  unknownResult = false,
}: ResolveDiscrepancyDialogProps) {
  const errors = form.formState.errors
  const action = form.watch('action')
  const remaining = discrepancy ? discrepancy.quantity - discrepancy.resolvedQuantity : 0
  return (
    <Dialog open={Boolean(discrepancy)} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-lg">
        {discrepancy ? (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={
              unknownResult
                ? (event) => {
                    event.preventDefault()
                    onSubmit(form.getValues())
                  }
                : form.handleSubmit(onSubmit)
            }
          >
            <DialogHeader>
              <DialogTitle>Xử lý chênh lệch</DialogTitle>
              <DialogDescription>
                <span className="font-mono">{discrepancy.sku}</span> ·{' '}
                {DISCREPANCY_TYPE_LABELS[discrepancy.type]} · còn {formatQuantity(remaining)} chưa
                xử lý
              </DialogDescription>
            </DialogHeader>
            {unknownResult ? (
              <p role="status" className="text-sm">
                Chưa rõ kết quả nhận bổ sung/xử lý. Chỉ kiểm tra lại đúng thao tác trước, không gửi
                một khai báo mới.
              </p>
            ) : null}
            <fieldset disabled={isPending || unknownResult} className="grid gap-4">
              <Field data-invalid={Boolean(errors.action)}>
                <FieldLabel htmlFor="discrepancy-action">Cách xử lý</FieldLabel>
                <NativeSelect
                  id="discrepancy-action"
                  className="w-full"
                  {...form.register('action')}
                >
                  {actionsFor(discrepancy).map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {DISCREPANCY_ACTION_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{errors.action?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.quantity)}>
                <FieldLabel htmlFor="discrepancy-quantity">Số lượng xử lý</FieldLabel>
                <Input
                  id="discrepancy-quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  aria-invalid={Boolean(errors.quantity)}
                  {...form.register('quantity', { valueAsNumber: true })}
                />
                <FieldError>{errors.quantity?.message}</FieldError>
              </Field>
              {action === 'LateReceipt' ? (
                <>
                  {lotOptions.length > 0 ? (
                    <Field>
                      <FieldLabel htmlFor="discrepancy-lot">Lô nhận bổ sung</FieldLabel>
                      <NativeSelect
                        id="discrepancy-lot"
                        className="w-full"
                        {...form.register('lotId')}
                      >
                        {lotOptions.map((lot) => (
                          <NativeSelectOption key={lot.id} value={lot.id}>
                            {lot.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  ) : null}
                  <Field data-invalid={Boolean(errors.scannedSlotCode)}>
                    <FieldLabel htmlFor="discrepancy-slot">
                      Quét mã vị trí nhận hàng bổ sung
                    </FieldLabel>
                    <Input
                      id="discrepancy-slot"
                      autoComplete="off"
                      autoCapitalize="characters"
                      aria-invalid={Boolean(errors.scannedSlotCode)}
                      {...form.register('scannedSlotCode')}
                    />
                    <FieldDescription>
                      Nhập hoặc quét mã vị trí thuộc kho nhập; hàng được nhập thành tồn tốt.
                    </FieldDescription>
                    <FieldError>{errors.scannedSlotCode?.message}</FieldError>
                  </Field>
                </>
              ) : null}
              <Field data-invalid={Boolean(errors.note)}>
                <FieldLabel htmlFor="discrepancy-note">
                  {action === 'LateReceipt' ? 'Ghi chú' : 'Lý do và bằng chứng'}
                </FieldLabel>
                <Textarea
                  id="discrepancy-note"
                  rows={3}
                  maxLength={500}
                  aria-invalid={Boolean(errors.note)}
                  {...form.register('note')}
                />
                <FieldError>{errors.note?.message}</FieldError>
              </Field>
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || unknownResult}
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Đang xử lý…'
                  : unknownResult
                    ? 'Kiểm tra lại đúng thao tác trước'
                    : 'Xác nhận xử lý'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
