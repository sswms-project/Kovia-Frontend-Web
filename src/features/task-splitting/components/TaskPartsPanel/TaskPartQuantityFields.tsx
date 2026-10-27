'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { TaskPartActionFormValues } from '../../schemas/task-part-action.schema'
import type { TaskPartView } from '../../types/task-splitting.types'
import { formatQuantity, roundQuantity } from '../../utils/task-split-quantity'

interface TaskPartQuantityFieldsProps {
  readonly form: UseFormReturn<TaskPartActionFormValues>
  readonly part: TaskPartView
  /** `edit` sets the part's new quantities; `splitRemaining` moves not-yet-done quantity to a new part. */
  readonly mode: 'edit' | 'splitRemaining'
  readonly disabled: boolean
}

export function TaskPartQuantityFields({
  form,
  part,
  mode,
  disabled,
}: TaskPartQuantityFieldsProps) {
  const error = form.formState.errors.quantities
  // A record field's error type also allows nested entries; the schema only reports at the record.
  const message = typeof error?.message === 'string' ? error.message : undefined

  return (
    <Field data-invalid={Boolean(message)}>
      <FieldLabel htmlFor={`task-part-quantity-${part.lines[0]?.sourceLineId ?? ''}`}>
        {mode === 'edit' ? 'Số lượng của phần' : 'Số lượng chuyển sang phần mới'}
      </FieldLabel>
      {part.lines.map((line) => {
        const openQuantity = roundQuantity(line.quantity - line.completedQuantity)
        return (
          <div key={line.sourceLineId} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{line.label}</span>
              <span className="text-muted-foreground block text-xs tabular-nums">
                Đã xong {formatQuantity(line.completedQuantity)}/{formatQuantity(line.quantity)}
              </span>
            </span>
            <Input
              id={`task-part-quantity-${line.sourceLineId}`}
              type="number"
              inputMode="decimal"
              // The backend never lets a part drop below what is already done, nor move more than is still open.
              min={mode === 'edit' ? line.completedQuantity : 0}
              max={mode === 'splitRemaining' ? openQuantity : undefined}
              step="any"
              aria-label={`Số lượng ${line.label}`}
              aria-invalid={Boolean(message)}
              className="w-28 text-right tabular-nums"
              disabled={disabled}
              {...form.register(`quantities.${line.sourceLineId}`)}
            />
          </div>
        )
      })}
      <FieldError>{message}</FieldError>
    </Field>
  )
}
