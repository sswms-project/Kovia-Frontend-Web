import type { UseFormReturn } from 'react-hook-form'
import { TriangleAlert } from 'lucide-react'
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
import { quantityStep } from '@/lib/quantity-rules'
import type { ReportDamagedStockFormValues } from '../../schemas/report-damaged-stock.schema'
import type { InventoryStock } from '../../types/inventory.types'
import { formatInventoryQuantity } from '../../utils/inventory-format'

interface ReportDamagedStockDialogProps {
  readonly item: InventoryStock | null
  readonly form: UseFormReturn<ReportDamagedStockFormValues>
  readonly isPending: boolean
  readonly canLinkTask: boolean
  readonly taskOptions: readonly { value: string; label: string }[]
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: ReportDamagedStockFormValues) => Promise<void>
}

export function ReportDamagedStockDialog({
  item,
  form,
  isPending,
  canLinkTask,
  taskOptions,
  onOpenChange,
  onSubmit,
}: ReportDamagedStockDialogProps) {
  const quantityError = form.formState.errors.quantity
  const reasonError = form.formState.errors.reason
  const evidenceError = form.formState.errors.evidenceFile
  const reportMode = form.watch('reportMode')
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo hàng hỏng</DialogTitle>
          <DialogDescription>
            Chọn báo số lượng đã xác nhận hoặc chỉ ghi nhận quan sát để kiểm tra thêm.
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="border-destructive/25 bg-destructive/5 flex items-start gap-3 border p-3">
              <TriangleAlert className="text-destructive mt-0.5 size-4" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.productName || 'Sản phẩm chưa xác định'}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  <span className="font-mono">{item.sku || item.productId}</span> ·{' '}
                  {item.warehouseName || item.warehouseId} / {item.slotCode || item.slotId}
                </p>
                <p className="mt-1 text-xs">
                  Có thể báo hỏng:{' '}
                  <strong className="font-mono tabular-nums">
                    {formatInventoryQuantity(item.availableQuantity)}
                  </strong>
                </p>
              </div>
            </div>
            <Field>
              <FieldLabel htmlFor="damage-report-mode">Mức độ xác nhận</FieldLabel>
              <NativeSelect
                id="damage-report-mode"
                disabled={isPending}
                {...form.register('reportMode')}
              >
                <NativeSelectOption value="Confirmed">Đã xác nhận số lượng hỏng</NativeSelectOption>
                <NativeSelectOption value="Observation">
                  Chỉ ghi nhận quan sát, chưa chốt số lượng
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            {reportMode === 'Confirmed' ? (
              <Field data-invalid={Boolean(quantityError)}>
                <FieldLabel htmlFor="damaged-quantity">Số lượng hàng hỏng</FieldLabel>
                <Input
                  id="damaged-quantity"
                  type="number"
                  inputMode="decimal"
                  min={quantityStep(item.quantityPrecision)}
                  step="any"
                  max={item.availableQuantity}
                  aria-invalid={Boolean(quantityError)}
                  disabled={isPending}
                  {...form.register('quantity', { valueAsNumber: true })}
                />
                <FieldError errors={quantityError ? [quantityError] : undefined} />
              </Field>
            ) : (
              <p className="text-muted-foreground text-xs">
                Quan sát này chưa làm thay đổi tồn kho. Người duyệt có thể yêu cầu kiểm tra và bổ
                sung số lượng sau.
              </p>
            )}
            <Field data-invalid={Boolean(reasonError)}>
              <FieldLabel htmlFor="damaged-reason">Lý do</FieldLabel>
              <Textarea
                id="damaged-reason"
                rows={4}
                placeholder="Mô tả tình trạng và nguyên nhân"
                aria-invalid={Boolean(reasonError)}
                disabled={isPending}
                {...form.register('reason')}
              />
              <FieldError errors={reasonError ? [reasonError] : undefined} />
            </Field>
            {canLinkTask ? (
              <Field>
                <FieldLabel htmlFor="damage-related-task">
                  Công việc liên quan (không bắt buộc)
                </FieldLabel>
                <NativeSelect
                  id="damage-related-task"
                  disabled={isPending}
                  {...form.register('relatedTaskKey')}
                >
                  <NativeSelectOption value="">Không liên kết công việc</NativeSelectOption>
                  {taskOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            <Field data-invalid={Boolean(evidenceError)}>
              <FieldLabel htmlFor="damaged-evidence">Tệp bằng chứng</FieldLabel>
              <Input
                id="damaged-evidence"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
                aria-invalid={Boolean(evidenceError)}
                disabled={isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file)
                    form.setValue('evidenceFile', file, { shouldValidate: true, shouldDirty: true })
                  else form.resetField('evidenceFile')
                }}
              />
              <FieldError errors={evidenceError ? [evidenceError] : undefined} />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? 'Đang ghi nhận...' : 'Xác nhận hàng hỏng'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
