import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import {
  warehousePendingPlacementSchema,
  type WarehousePendingPlacementValues,
} from '../../schemas/warehouse-layout-scene.schema'
import type { WarehouseLayoutGeometry } from '../../types/warehouse-layout-scene.types'
import { MAX_LAYOUT_EXTENT, MIN_LAYOUT_OBJECT_SIZE } from '../../utils/layout-grid'

export function WarehousePendingPlacementDialog({
  initialGeometry,
  label,
  disabled,
  onPlace,
  onClose,
}: {
  readonly initialGeometry: WarehouseLayoutGeometry
  readonly label: string
  readonly disabled: boolean
  readonly onPlace: (geometry: WarehouseLayoutGeometry) => string | null
  readonly onClose: () => void
}) {
  const form = useForm<WarehousePendingPlacementValues>({
    resolver: zodResolver(warehousePendingPlacementSchema),
    defaultValues: initialGeometry,
  })
  const fields = [
    ['x', 'Vị trí ngang (X)'],
    ['y', 'Vị trí dọc (Y)'],
    ['width', 'Chiều rộng trên sơ đồ'],
    ['height', 'Chiều cao trên sơ đồ'],
    ['rotation', 'Góc xoay (độ)'],
  ] as const
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !disabled) onClose()
      }}
    >
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-md"
        showCloseButton={!disabled}
      >
        <DialogHeader>
          <DialogTitle>Đặt lên sơ đồ</DialogTitle>
          <DialogDescription className="break-words">{label}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((geometry) => {
            if (disabled) return
            const error = onPlace(geometry)
            if (error) form.setError('root', { message: error })
          })}
        >
          <p className="text-muted-foreground text-xs">
            Điều chỉnh vị trí vẽ và góc xoay; kích thước vật lý, sức chứa giữ nguyên. Sau khi đặt,
            bạn có thể kéo chỉnh rồi bấm Lưu sơ đồ.
          </p>
          <fieldset disabled={disabled} className="grid grid-cols-2 gap-3">
            {fields.map(([name, title]) => (
              <Field key={name} data-invalid={Boolean(form.formState.errors[name])}>
                <FieldLabel htmlFor={`placement-${name}`}>{title}</FieldLabel>
                <Input
                  id={`placement-${name}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={name === 'width' || name === 'height' ? MIN_LAYOUT_OBJECT_SIZE : 0}
                  max={name === 'rotation' ? 359 : MAX_LAYOUT_EXTENT}
                  aria-invalid={Boolean(form.formState.errors[name])}
                  {...form.register(name, { valueAsNumber: true })}
                />
                <FieldError>{form.formState.errors[name]?.message}</FieldError>
              </Field>
            ))}
          </fieldset>
          {form.formState.errors.root?.message ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={disabled} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={disabled}>
              Đặt vào bản nháp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
