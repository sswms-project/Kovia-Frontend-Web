import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { useState } from 'react'
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { AssignableWarehouseStaff } from '@/features/inbound/types/inbound.types'
import { Input } from '@/components/ui/input'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { CreateShipmentFormValues } from '../../schemas/transfer-actions.schema'

interface CreateShipmentDialogProps {
  readonly open: boolean
  readonly form: UseFormReturn<CreateShipmentFormValues>
  readonly isPending: boolean
  readonly uncertain?: boolean
  readonly staff?: readonly AssignableWarehouseStaff[]
  readonly canAssign?: boolean
  readonly currentUserId?: string | null
  readonly isLoadingStaff?: boolean
  readonly isErrorStaff?: boolean
  readonly onRetryStaff?: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: CreateShipmentFormValues) => void
}

export function CreateShipmentDialog({
  open,
  form,
  isPending,
  uncertain = false,
  staff = [],
  canAssign = false,
  currentUserId,
  isLoadingStaff,
  isErrorStaff,
  onRetryStaff,
  onOpenChange,
  onSubmit,
}: CreateShipmentDialogProps) {
  const [split, setSplit] = useState(false)
  if (!open && split && !uncertain) setSplit(false)
  const { fields } = useFieldArray({ control: form.control, name: 'lines' })
  const lines = form.watch('lines')
  const errors = form.formState.errors
  const selected = lines.filter((line) => line.selected)
  const hasInvalidQuantity = selected.some(
    (line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > line.maximum
  )
  const canSubmit = selected.length > 0 && !hasInvalidQuantity
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return
        if (!next && !uncertain) setSplit(false)
        onOpenChange(next)
      }}
    >
      <DialogContent size="lg" className="sm:max-w-2xl">
        <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Chuẩn bị xuất</DialogTitle>
            <DialogDescription>
              Mặc định xuất toàn bộ hàng còn lại trong một chuyến. Chỉ chia đợt khi cần giao nhiều
              chuyến.
            </DialogDescription>
          </DialogHeader>
          {uncertain ? (
            <p role="alert" className="text-destructive text-sm">
              Chưa xác định kết quả do mất kết nối. Giữ nguyên nội dung và kiểm tra lại đúng thao
              tác để tránh tạo trùng đợt.
            </p>
          ) : null}
          <fieldset disabled={isPending || uncertain} className="grid min-w-0 gap-3">
            {canAssign ? (
              <Field data-invalid={Boolean(errors.staffId)}>
                <FieldLabel htmlFor="shipment-staff">Người lấy hàng</FieldLabel>
                <NativeSelect
                  id="shipment-staff"
                  disabled={isLoadingStaff || isErrorStaff}
                  value={form.watch('staffId') ?? ''}
                  onChange={(event) =>
                    form.setValue('staffId', event.target.value, { shouldValidate: true })
                  }
                >
                  <NativeSelectOption value="">Giao việc sau</NativeSelectOption>
                  {staff.map((person) => (
                    <NativeSelectOption key={person.id} value={person.id}>
                      {person.id === currentUserId
                        ? `Tôi thực hiện · ${person.fullName}`
                        : person.fullName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Chỉ hiển thị người thuộc kho xuất và đủ quyền lấy hàng. Tạo đợt và giao việc được
                  lưu cùng lúc.
                </FieldDescription>
                {isErrorStaff ? (
                  <Button type="button" variant="outline" size="sm" onClick={onRetryStaff}>
                    Tải lại người lấy hàng
                  </Button>
                ) : null}
                <FieldError>{errors.staffId?.message}</FieldError>
              </Field>
            ) : null}
            <Field orientation="horizontal">
              <Checkbox
                id="shipment-split"
                checked={split}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setSplit(next)
                  if (!next)
                    lines.forEach((line, index) => {
                      form.setValue(`lines.${index}.selected`, true)
                      form.setValue(`lines.${index}.quantity`, line.maximum, {
                        shouldValidate: true,
                      })
                    })
                }}
              />
              <FieldLabel htmlFor="shipment-split">Chia hàng thành nhiều chuyến</FieldLabel>
            </Field>
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
                      {split ? (
                        <Checkbox
                          id={checkboxId}
                          checked={line.selected}
                          onCheckedChange={(checked) =>
                            form.setValue(`lines.${index}.selected`, checked === true, {
                              shouldValidate: true,
                            })
                          }
                        />
                      ) : null}
                      <label htmlFor={split ? checkboxId : undefined} className="min-w-0 text-sm">
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
                        disabled={!split || !line.selected}
                        aria-invalid={Boolean(errors.lines?.[index]?.quantity)}
                        {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                      />
                      <FieldError>{errors.lines?.[index]?.quantity?.message}</FieldError>
                    </Field>
                  </li>
                )
              })}
            </ul>
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                if (!uncertain) setSplit(false)
                onOpenChange(false)
              }}
            >
              Đóng
            </Button>
            {selected.length === 0 ? (
              <p role="status" className="text-muted-foreground mr-auto self-center text-xs">
                Chọn ít nhất một dòng hàng để tạo đợt xuất.
              </p>
            ) : null}
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending
                ? 'Đang xử lý…'
                : uncertain
                  ? 'Kiểm tra lại thao tác'
                  : 'Xác nhận chuẩn bị xuất'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
