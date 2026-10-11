import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { CreateShipmentFormValues } from '../../schemas/transfer-actions.schema'

interface CreateShipmentDialogProps {
  readonly open: boolean
  readonly form: UseFormReturn<CreateShipmentFormValues>
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: CreateShipmentFormValues) => void
}

export function CreateShipmentDialog({
  open,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: CreateShipmentDialogProps) {
  const { fields } = useFieldArray({ control: form.control, name: 'lines' })
  const lines = form.watch('lines')
  const errors = form.formState.errors
  const selected = lines.filter((line) => line.selected)
  const hasInvalidQuantity = selected.some(
    (line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > line.maximum
  )
  const canSubmit = selected.length > 0 && !hasInvalidQuantity
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-2xl">
        <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Tạo đợt xuất</DialogTitle>
            <DialogDescription>
              Chọn dòng hàng và số lượng cho đợt này từ phần chưa vào đợt. Hệ thống tạo công việc
              lấy hàng chờ giao cho nhân viên.
            </DialogDescription>
          </DialogHeader>
          {errors.lines?.message ? (
            <p role="alert" className="text-destructive text-xs">
              {errors.lines.message}
            </p>
          ) : null}
          <ul className="max-h-80 divide-y overflow-y-auto border">
            {fields.map((field, index) => {
              const line = lines[index]
              if (!line) return null
              const checkboxId = `shipment-line-${index}`
              return (
                <li key={field.id} className="grid items-start gap-2 p-3 sm:grid-cols-[1fr_9rem]">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={line.selected}
                      onCheckedChange={(checked) =>
                        form.setValue(`lines.${index}.selected`, checked === true, {
                          shouldValidate: true,
                        })
                      }
                    />
                    <label htmlFor={checkboxId} className="min-w-0 text-sm">
                      <span className="block font-medium">{line.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        Chưa vào đợt: {formatQuantity(line.maximum)} {line.unitName}
                      </span>
                    </label>
                  </div>
                  <Field data-invalid={Boolean(errors.lines?.[index]?.quantity)}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      aria-label={`Số lượng đưa vào đợt của ${line.label}`}
                      disabled={!line.selected}
                      aria-invalid={Boolean(errors.lines?.[index]?.quantity)}
                      {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <FieldError>{errors.lines?.[index]?.quantity?.message}</FieldError>
                  </Field>
                </li>
              )
            })}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            {selected.length === 0 ? (
              <p role="status" className="text-muted-foreground mr-auto self-center text-xs">
                Chọn ít nhất một dòng hàng để tạo đợt xuất.
              </p>
            ) : null}
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? 'Đang tạo…' : 'Tạo đợt xuất'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
