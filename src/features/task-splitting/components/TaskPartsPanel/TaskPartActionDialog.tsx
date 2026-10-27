'use client'

import { LoaderCircle } from 'lucide-react'
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import {
  REASON_ACTIONS,
  STAFF_ACTIONS,
  type TaskPartActionFormValues,
} from '../../schemas/task-part-action.schema'
import type {
  TaskPartActionTarget,
  TaskPartMergeTarget,
  TaskSplitStaff,
} from '../../types/task-splitting.types'
import { TASK_PART_ACTION_COPY } from './task-part-action-copy'
import { TaskPartMergeTargetField } from './TaskPartMergeTargetField'
import { TaskPartQuantityFields } from './TaskPartQuantityFields'
import { TaskPartStaffField } from './TaskPartStaffField'

const STALE_MESSAGE = 'Phần việc đã thay đổi, thao tác này không còn thực hiện được.'

interface TaskPartActionDialogProps {
  readonly target: TaskPartActionTarget | null
  readonly form: UseFormReturn<TaskPartActionFormValues>
  readonly staff: readonly TaskSplitStaff[]
  readonly isLoadingStaff: boolean
  readonly isStaffError: boolean
  readonly onRetryStaff: () => void
  readonly mergeTargets: readonly TaskPartMergeTarget[]
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onSubmit: () => void
}

export function TaskPartActionDialog({
  target,
  form,
  staff,
  isLoadingStaff,
  isStaffError,
  onRetryStaff,
  mergeTargets,
  isPending,
  onClose,
  onSubmit,
}: TaskPartActionDialogProps) {
  const reasonError = form.formState.errors.reason

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {target ? (
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {TASK_PART_ACTION_COPY[target.action].title}
                {target.part ? ` ${target.rank} · ${target.part.assigneeName}` : ''}
              </DialogTitle>
              <DialogDescription>
                {target.isStale ? STALE_MESSAGE : TASK_PART_ACTION_COPY[target.action].description}
              </DialogDescription>
            </DialogHeader>

            {target.isStale ? null : (
              <>
                {STAFF_ACTIONS.has(target.action) ? (
                  <TaskPartStaffField
                    form={form}
                    staff={staff}
                    excludedStaffId={
                      target.action === 'reassign' ? target.part?.assignedTo : undefined
                    }
                    isLoading={isLoadingStaff}
                    isError={isStaffError}
                    onRetry={onRetryStaff}
                    disabled={isPending}
                  />
                ) : null}

                {(target.action === 'edit' || target.action === 'splitRemaining') && target.part ? (
                  <TaskPartQuantityFields
                    form={form}
                    part={target.part}
                    mode={target.action}
                    disabled={isPending}
                  />
                ) : null}

                {target.action === 'merge' ? (
                  <TaskPartMergeTargetField
                    form={form}
                    mergeTargets={mergeTargets}
                    disabled={isPending}
                  />
                ) : null}

                {REASON_ACTIONS.has(target.action) ? (
                  <Field data-invalid={Boolean(reasonError)}>
                    <FieldLabel htmlFor="task-part-reason">Lý do</FieldLabel>
                    <Textarea
                      id="task-part-reason"
                      rows={3}
                      maxLength={500}
                      disabled={isPending}
                      aria-invalid={Boolean(reasonError)}
                      {...form.register('reason')}
                    />
                    <FieldDescription>Lý do được ghi vào nhật ký hoạt động.</FieldDescription>
                    <FieldError>{reasonError?.message}</FieldError>
                  </Field>
                ) : null}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                Đóng
              </Button>
              {target.isStale ? null : (
                <Button
                  type="submit"
                  variant={
                    target.action === 'cancel' || target.action === 'cancelSplit'
                      ? 'destructive'
                      : 'default'
                  }
                  disabled={isPending}
                >
                  {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                  {TASK_PART_ACTION_COPY[target.action].submit}
                </Button>
              )}
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
