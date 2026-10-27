'use client'

import { RefreshCw } from 'lucide-react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { TaskPartActionFormValues } from '../../schemas/task-part-action.schema'
import type { TaskSplitStaff } from '../../types/task-splitting.types'
import { formatScore } from '../../utils/task-split-quantity'

interface TaskPartStaffFieldProps {
  readonly form: UseFormReturn<TaskPartActionFormValues>
  readonly staff: readonly TaskSplitStaff[]
  /** Not offered because choosing them would change nothing (the part's current holder on reassign). */
  readonly excludedStaffId?: string
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly disabled: boolean
}

export function TaskPartStaffField({
  form,
  staff,
  excludedStaffId,
  isLoading,
  isError,
  onRetry,
  disabled,
}: TaskPartStaffFieldProps) {
  const error = form.formState.errors.staffId
  const options = staff.filter((person) => person.id !== excludedStaffId)

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="task-part-staff">Nhân viên nhận phần</FieldLabel>
      {isError ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Không thể tải danh sách nhân viên.</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Thử lại
          </Button>
        </div>
      ) : (
        // Controlled: options arrive after the dialog opens and must still show the current value.
        <Controller
          control={form.control}
          name="staffId"
          render={({ field }) => (
            <NativeSelect
              id="task-part-staff"
              className="w-full"
              disabled={disabled || isLoading}
              aria-invalid={Boolean(error)}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            >
              <NativeSelectOption value="">
                {isLoading ? 'Đang tải nhân viên…' : 'Chọn nhân viên'}
              </NativeSelectOption>
              {options.map((person) => (
                <NativeSelectOption key={person.id} value={person.id}>
                  {person.fullName} · điểm tải {formatScore(person.workloadScore)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        />
      )}
      <FieldError>{error?.message}</FieldError>
    </Field>
  )
}
