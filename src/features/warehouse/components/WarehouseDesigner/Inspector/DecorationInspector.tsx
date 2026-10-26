import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  warehouseLayoutDecorationSchema,
  type WarehouseLayoutDecorationFormValues,
} from '../../../schemas/warehouse-layout-scene.schema'
import type { WarehouseLayoutEditorDecoration } from '../../../types/warehouse-layout-scene.types'
import { DECORATION_OPTIONS, getDecorationLabel } from '../../../utils/layout-decoration-options'
import { InspectorHeader } from './InspectorHeader'

export function DecorationInspector({
  decoration,
  canConfigure,
  onChange,
}: {
  readonly decoration: WarehouseLayoutEditorDecoration
  readonly canConfigure: boolean
  readonly onChange: (
    decoration: Omit<WarehouseLayoutEditorDecoration, 'clientKey' | 'id' | 'color'>
  ) => void
}) {
  const form = useForm<WarehouseLayoutDecorationFormValues>({
    resolver: zodResolver(warehouseLayoutDecorationSchema),
    values: decoration,
  })
  const { errors } = form.formState

  return (
    <>
      <InspectorHeader title="Khu chức năng" code={decoration.label} />
      <form className="flex flex-col gap-3 px-4 py-3" onSubmit={form.handleSubmit(onChange)}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.label)}>
            <FieldLabel htmlFor="decoration-label">Tên hiển thị</FieldLabel>
            <Input
              id="decoration-label"
              disabled={!canConfigure}
              autoComplete="off"
              aria-invalid={Boolean(errors.label)}
              {...form.register('label')}
            />
            <FieldError errors={[errors.label]} />
          </Field>
          <Field data-invalid={Boolean(errors.type)}>
            <FieldLabel htmlFor="decoration-type">Loại khu vực</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} disabled={!canConfigure} onValueChange={field.onChange}>
                  <SelectTrigger id="decoration-type" className="w-full">
                    <SelectValue>{getDecorationLabel(field.value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DECORATION_OPTIONS.map((option) => (
                        <SelectItem key={option.type} value={option.type}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.type]} />
          </Field>
        </FieldGroup>
        <Button type="submit" size="sm" className="w-full" disabled={!canConfigure}>
          <Save data-icon="inline-start" aria-hidden="true" />
          Áp dụng thuộc tính
        </Button>
      </form>
      <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
        Di chuyển, đổi màu, xoay, nhân bản hoặc xóa biểu tượng bằng toolbar nổi trên sơ đồ.
      </p>
    </>
  )
}
