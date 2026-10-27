'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { TaskPartActionFormValues } from '../../schemas/task-part-action.schema'
import type { TaskPartMergeTarget } from '../../types/task-splitting.types'

interface TaskPartMergeTargetFieldProps {
  readonly form: UseFormReturn<TaskPartActionFormValues>
  readonly mergeTargets: readonly TaskPartMergeTarget[]
  readonly disabled: boolean
}

export function TaskPartMergeTargetField({
  form,
  mergeTargets,
  disabled,
}: TaskPartMergeTargetFieldProps) {
  const error = form.formState.errors.intoPartId

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="task-part-merge-target">Gộp vào phần</FieldLabel>
      <NativeSelect
        id="task-part-merge-target"
        className="w-full"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...form.register('intoPartId')}
      >
        <NativeSelectOption value="">
          {mergeTargets.length ? 'Chọn phần' : 'Không có phần nào gộp được'}
        </NativeSelectOption>
        {mergeTargets.map(({ part, rank }) => (
          <NativeSelectOption key={part.id} value={part.id}>
            Phần {rank} · {part.assigneeName}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldError>{error?.message}</FieldError>
    </Field>
  )
}
