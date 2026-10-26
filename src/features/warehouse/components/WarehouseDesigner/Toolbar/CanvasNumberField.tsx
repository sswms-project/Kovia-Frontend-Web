'use client'

import type { useForm } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { WarehouseLayoutCanvasFormValues } from '../../../schemas/warehouse-layout-scene.schema'

export function CanvasNumberField({
  id,
  label,
  error,
  registration,
}: {
  readonly id: string
  readonly label: string
  readonly error: ReturnType<
    ReturnType<typeof useForm<WarehouseLayoutCanvasFormValues>>['getFieldState']
  >['error']
  readonly registration: ReturnType<
    ReturnType<typeof useForm<WarehouseLayoutCanvasFormValues>>['register']
  >
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        {...registration}
      />
      <FieldError errors={[error]} />
    </Field>
  )
}
