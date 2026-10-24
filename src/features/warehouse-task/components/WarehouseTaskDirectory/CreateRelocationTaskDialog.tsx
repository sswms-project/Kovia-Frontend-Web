import { Plus, Trash2 } from 'lucide-react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
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
import { formatInventoryLocation } from '@/features/inventory/utils/inventory-format'
import type {
  InventoryStock,
  InventoryWarehouseOption,
} from '@/features/inventory/types/inventory.types'
import type { LocationSearchResponse } from '@/features/warehouse/types/warehouse.types'
import type { CreateWarehouseRelocationFormValues } from '../../schemas/warehouse-relocation.schema'

interface CreateRelocationTaskDialogProps {
  readonly open: boolean
  readonly form: UseFormReturn<CreateWarehouseRelocationFormValues>
  readonly fields: readonly FieldArrayWithId<CreateWarehouseRelocationFormValues, 'lines', 'id'>[]
  readonly warehouseOptions: readonly InventoryWarehouseOption[]
  readonly inventoryOptions: readonly InventoryStock[]
  readonly slotOptions: readonly LocationSearchResponse[]
  readonly sourceSearch: string
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onWarehouseChange: (warehouseId: string) => void
  readonly onSourceChange: (index: number, stockId: string) => void
  readonly onSourceSearchChange: (value: string) => void
  readonly onAddLine: () => void
  readonly onRemoveLine: (index: number) => void
  readonly onSubmit: (values: CreateWarehouseRelocationFormValues) => void
}

export function CreateRelocationTaskDialog(props: CreateRelocationTaskDialogProps) {
  const errors = props.form.formState.errors
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo công việc điều chuyển vị trí</DialogTitle>
          <DialogDescription>
            Chọn tồn khả dụng trong cùng một kho. Việc tạo task chưa làm thay đổi số lượng tồn.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={props.form.handleSubmit(props.onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={Boolean(errors.warehouseId)}>
              <FieldLabel htmlFor="relocation-warehouse">Kho</FieldLabel>
              <NativeSelect
                id="relocation-warehouse"
                value={props.form.watch('warehouseId')}
                onChange={(event) => props.onWarehouseChange(event.target.value)}
              >
                <NativeSelectOption value="">Chọn kho</NativeSelectOption>
                {props.warehouseOptions
                  .filter((warehouse) => warehouse.canManageWarehouse)
                  .map((warehouse) => (
                    <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouseCode} · {warehouse.warehouseName}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <FieldError errors={[errors.warehouseId]} />
            </Field>
            <Field data-invalid={Boolean(errors.priority)}>
              <FieldLabel htmlFor="relocation-priority">Ưu tiên</FieldLabel>
              <NativeSelect id="relocation-priority" {...props.form.register('priority')}>
                <NativeSelectOption value="Normal">Bình thường</NativeSelectOption>
                <NativeSelectOption value="Urgent">Khẩn</NativeSelectOption>
              </NativeSelect>
              <FieldError errors={[errors.priority]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="relocation-due-at">Hạn hoàn thành</FieldLabel>
              <Input
                id="relocation-due-at"
                type="datetime-local"
                {...props.form.register('dueAt')}
              />
            </Field>
          </div>
          <Field data-invalid={Boolean(errors.reason)}>
            <FieldLabel htmlFor="relocation-reason">Lý do điều chuyển</FieldLabel>
            <Textarea id="relocation-reason" maxLength={500} {...props.form.register('reason')} />
            <FieldError errors={[errors.reason]} />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Tồn kho cần điều chuyển</p>
                <p className="text-muted-foreground text-sm">
                  Chỉ hiển thị hàng tốt, khả dụng và còn số lượng chưa được giữ chỗ.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={props.onAddLine}>
                <Plus aria-hidden="true" /> Thêm dòng
              </Button>
            </div>
            <Input
              aria-label="Tìm tồn kho nguồn"
              placeholder="Tìm theo SKU, tên hàng hoặc vị trí…"
              value={props.sourceSearch}
              disabled={!props.form.watch('warehouseId')}
              onChange={(event) => props.onSourceSearchChange(event.target.value)}
            />
            {props.fields.map((field, index) => {
              const lineErrors = errors.lines?.[index]
              const sourceSlotId = props.form.watch(`lines.${index}.sourceSlotId`)
              return (
                <div
                  key={field.id}
                  className="grid gap-3 border p-3 lg:grid-cols-[2fr_1fr_2fr_auto]"
                >
                  <Field data-invalid={Boolean(lineErrors?.sourceInventoryStockId)}>
                    <FieldLabel htmlFor={`relocation-source-${index}`}>Tồn kho nguồn</FieldLabel>
                    <NativeSelect
                      id={`relocation-source-${index}`}
                      value={props.form.watch(`lines.${index}.sourceInventoryStockId`)}
                      disabled={!props.form.watch('warehouseId')}
                      onChange={(event) => props.onSourceChange(index, event.target.value)}
                    >
                      <NativeSelectOption value="">Chọn tồn kho</NativeSelectOption>
                      {props.inventoryOptions.map((stock) => (
                        <NativeSelectOption key={stock.id} value={stock.id}>
                          {stock.sku} · {stock.productName} · {formatInventoryLocation(stock)} · còn{' '}
                          {stock.availableQuantity}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[lineErrors?.sourceInventoryStockId]} />
                  </Field>
                  <Field data-invalid={Boolean(lineErrors?.quantity)}>
                    <FieldLabel htmlFor={`relocation-quantity-${index}`}>Số lượng</FieldLabel>
                    <Input
                      id={`relocation-quantity-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      {...props.form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <FieldError errors={[lineErrors?.quantity]} />
                  </Field>
                  <Field data-invalid={Boolean(lineErrors?.proposedDestinationSlotId)}>
                    <FieldLabel htmlFor={`relocation-destination-${index}`}>
                      Vị trí đích đề xuất
                    </FieldLabel>
                    <NativeSelect
                      id={`relocation-destination-${index}`}
                      value={props.form.watch(`lines.${index}.proposedDestinationSlotId`) ?? ''}
                      onChange={(event) =>
                        props.form.setValue(
                          `lines.${index}.proposedDestinationSlotId`,
                          event.target.value || null,
                          { shouldValidate: true }
                        )
                      }
                    >
                      <NativeSelectOption value="">
                        Để hệ thống gợi ý khi thực hiện
                      </NativeSelectOption>
                      {props.slotOptions
                        .filter((slot) => slot.id !== sourceSlotId && !slot.isOutboundStaging)
                        .map((slot) => (
                          <NativeSelectOption key={slot.id} value={slot.id}>
                            {slot.code} · {slot.name ?? 'Không tên'}
                          </NativeSelectOption>
                        ))}
                    </NativeSelect>
                    <FieldError errors={[lineErrors?.proposedDestinationSlotId]} />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    disabled={props.fields.length === 1}
                    onClick={() => props.onRemoveLine(index)}
                    aria-label={`Xóa dòng ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={props.isPending}
              onClick={() => props.onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={props.isPending}>
              {props.isPending ? 'Đang tạo…' : 'Tạo công việc'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
