import { TriangleAlert } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import type { TransferPickSwitchFormValues } from '../../schemas/transfer-fulfillment.schema'
import type { TransferPickAlternative } from '../../types/transfer.types'
import { PICK_REASONS_SUGGESTING_COUNT } from '../../utils/transfer-format'
import { formatTransferLocation } from '../../utils/transfer-location'
import { PickLineLabel, PickReasonField, type LineScopedDialogProps } from './PickDialogParts'

interface PickSwitchDialogProps extends LineScopedDialogProps {
  readonly form: UseFormReturn<TransferPickSwitchFormValues>
  readonly alternatives: readonly TransferPickAlternative[]
  readonly isLoadingAlternatives: boolean
  readonly isNonFefo: boolean
  readonly onSubmit: (values: TransferPickSwitchFormValues) => void
}

export function PickSwitchDialog({
  line,
  form,
  alternatives,
  isLoadingAlternatives,
  isNonFefo,
  isPending,
  onOpenChange,
  onSubmit,
}: PickSwitchDialogProps) {
  const errors = form.formState.errors
  const reasonCode = form.watch('reasonCode')
  return (
    <Dialog open={Boolean(line)} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-lg">
        {line ? (
          <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Đổi vị trí hoặc lô lấy hàng</DialogTitle>
              <DialogDescription>
                <PickLineLabel line={line} />
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={Boolean(errors.toInventoryStockId)}>
              <FieldLabel htmlFor="switch-stock">Vị trí/lô thay thế</FieldLabel>
              <NativeSelect
                id="switch-stock"
                className="h-11 w-full"
                disabled={isLoadingAlternatives}
                {...form.register('toInventoryStockId')}
              >
                <NativeSelectOption value="">
                  {isLoadingAlternatives ? 'Đang tải…' : 'Chọn vị trí/lô (xếp theo FEFO)'}
                </NativeSelectOption>
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
            {isNonFefo ? (
              <Alert role="status">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>Lô này không theo FEFO</AlertTitle>
                <AlertDescription>
                  Có lô hết hạn sớm hơn đang còn hàng. Hãy chọn lý do phù hợp; việc này được ghi
                  lại.
                </AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={Boolean(errors.quantity)}>
              <FieldLabel htmlFor="switch-quantity">Số lượng chuyển</FieldLabel>
              <Input
                id="switch-quantity"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="h-11"
                aria-invalid={Boolean(errors.quantity)}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <FieldError>{errors.quantity?.message}</FieldError>
            </Field>
            <PickReasonField
              id="switch-reason"
              registration={form.register('reasonCode')}
              error={errors.reasonCode?.message}
            />
            {PICK_REASONS_SUGGESTING_COUNT.includes(reasonCode) ? (
              <p className="text-muted-foreground text-xs" role="status">
                Quản lý kho sẽ được báo và nên kiểm kê lại vị trí cũ. Hệ thống không tự điều chỉnh
                tồn hay đổi trạng thái chất lượng.
              </p>
            ) : null}
            <Field data-invalid={Boolean(errors.note)}>
              <FieldLabel htmlFor="switch-note">
                Ghi chú{reasonCode === 'Other' ? ' (bắt buộc)' : ''}
              </FieldLabel>
              <Textarea
                id="switch-note"
                rows={2}
                maxLength={500}
                aria-invalid={Boolean(errors.note)}
                {...form.register('note')}
              />
              <FieldError>{errors.note?.message}</FieldError>
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button type="submit" className="h-11" disabled={isPending}>
                {isPending ? 'Đang đổi…' : 'Xác nhận đổi'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
