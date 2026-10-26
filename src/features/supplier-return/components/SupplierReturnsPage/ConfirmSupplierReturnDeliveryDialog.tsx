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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatInventoryQuantity } from '@/features/inventory/utils/inventory-format'
import type { ConfirmSupplierReturnDeliveryFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturn } from '../../types/supplier-return.types'

export function ConfirmSupplierReturnDeliveryDialog({
  item,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  readonly item: SupplierReturn | null
  readonly form: UseFormReturn<ConfirmSupplierReturnDeliveryFormValues>
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: ConfirmSupplierReturnDeliveryFormValues) => void
}) {
  const itemsError = form.formState.errors.items
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Xác nhận đã giao hàng trả NCC</DialogTitle>
          <DialogDescription>
            {item
              ? `${item.code} · ${item.supplierName}. Phần chưa giao sẽ được hoàn lại tồn kho.`
              : 'Nhập số lượng thực tế đã giao.'}
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {item.items.map((line, index) => {
                const lineError = itemsError?.[index]?.deliveredQuantity
                return (
                  <Field
                    key={line.id}
                    className="grid gap-2 border p-3 sm:grid-cols-[1fr_10rem]"
                    data-invalid={Boolean(lineError)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{line.productName}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {line.sku} · {line.slotCode}
                        {line.lotNumber ? ` · Lô ${line.lotNumber}` : ''}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Đã duyệt: {formatInventoryQuantity(line.quantity)} {line.unit}
                      </p>
                    </div>
                    <div>
                      <FieldLabel htmlFor={`supplier-return-delivered-${index}`}>
                        Số lượng giao
                      </FieldLabel>
                      <Input
                        id={`supplier-return-delivered-${index}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={line.quantity}
                        step={10 ** -Math.min(line.quantityPrecision ?? 2, 2)}
                        aria-invalid={Boolean(lineError)}
                        {...form.register(`items.${index}.deliveredQuantity`, {
                          valueAsNumber: true,
                        })}
                      />
                      <FieldError errors={[lineError]} />
                    </div>
                  </Field>
                )
              })}
              <FieldError errors={[itemsError?.root ?? itemsError]} />
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Xác nhận đã giao
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
