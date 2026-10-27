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
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { PendingTaskPartAction } from '../../hooks/use-task-part-actions'
import {
  QUANTITY_ACTIONS,
  REASON_ACTIONS,
  STAFF_ACTIONS,
  type TaskPartActionFormValues,
  type TaskPartDialogAction,
} from '../../schemas/task-part-action.schema'
import type { TaskPartView, TaskSplitStaff } from '../../types/task-splitting.types'
import { formatQuantity, formatScore } from '../../utils/task-split-quantity'

const COPY: Record<TaskPartDialogAction, { title: string; description: string; submit: string }> = {
  edit: {
    title: 'Sửa phần',
    description: 'Đổi người hoặc số lượng của phần chưa bắt đầu. Số lượng 0 sẽ bỏ dòng khỏi phần.',
    submit: 'Lưu',
  },
  reassign: {
    title: 'Giao lại phần',
    description: 'Phần về hàng đợi của người mới. Lý do được gửi cho cả hai người.',
    submit: 'Giao lại',
  },
  splitRemaining: {
    title: 'Tách phần còn lại',
    description: 'Nhập lượng chưa làm muốn chuyển sang một phần mới cho người khác.',
    submit: 'Tách phần',
  },
  merge: {
    title: 'Gộp phần',
    description: 'Số lượng của phần này được cộng vào phần được chọn; phần này bị huỷ.',
    submit: 'Gộp',
  },
  cancel: {
    title: 'Huỷ phần',
    description: 'Lượng của phần trở về chưa giao.',
    submit: 'Huỷ phần',
  },
  complete: {
    title: 'Hoàn tất phần',
    description: 'Chốt phần với lượng đã làm; phần thiếu trở về chưa giao.',
    submit: 'Hoàn tất phần',
  },
  cancelSplit: {
    title: 'Huỷ chia việc',
    description: 'Huỷ mọi phần chưa bắt đầu; việc trở về hàng đợi chưa giao.',
    submit: 'Huỷ chia',
  },
}

interface TaskPartActionDialogProps {
  readonly pending: PendingTaskPartAction | null
  readonly form: UseFormReturn<TaskPartActionFormValues>
  readonly staff: readonly TaskSplitStaff[]
  readonly isLoadingStaff: boolean
  readonly mergeTargets: readonly { readonly part: TaskPartView; readonly rank: number }[]
  readonly isPending: boolean
  readonly onClose: () => void
  readonly onSubmit: () => void
}

export function TaskPartActionDialog({
  pending,
  form,
  staff,
  isLoadingStaff,
  mergeTargets,
  isPending,
  onClose,
  onSubmit,
}: TaskPartActionDialogProps) {
  const {
    register,
    formState: { errors },
  } = form
  const action = pending?.action
  const copy = action ? COPY[action] : null

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {pending && action && copy ? (
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
                {copy.title}
                {pending.part ? ` ${pending.rank} · ${pending.part.assigneeName}` : ''}
              </DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>

            {STAFF_ACTIONS.has(action) ? (
              <Field data-invalid={Boolean(errors.staffId)}>
                <FieldLabel htmlFor="task-part-staff">Nhân viên nhận phần</FieldLabel>
                <NativeSelect
                  id="task-part-staff"
                  className="w-full"
                  disabled={isPending || isLoadingStaff}
                  aria-invalid={Boolean(errors.staffId)}
                  {...register('staffId')}
                >
                  <NativeSelectOption value="">
                    {isLoadingStaff ? 'Đang tải nhân viên…' : 'Chọn nhân viên'}
                  </NativeSelectOption>
                  {staff.map((person) => (
                    <NativeSelectOption key={person.id} value={person.id}>
                      {person.fullName} · điểm tải {formatScore(person.workloadScore)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{errors.staffId?.message}</FieldError>
              </Field>
            ) : null}

            {QUANTITY_ACTIONS.has(action) && pending.part ? (
              <Field data-invalid={Boolean(errors.quantities)}>
                <FieldLabel>
                  {action === 'edit' ? 'Số lượng của phần' : 'Số lượng chuyển sang phần mới'}
                </FieldLabel>
                {pending.part.lines.map((line) => (
                  <div key={line.sourceLineId} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium">{line.label}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">
                        Đã xong {formatQuantity(line.completedQuantity)}/
                        {formatQuantity(line.quantity)}
                      </span>
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      aria-label={`Số lượng ${line.label}`}
                      className="w-28 text-right tabular-nums"
                      disabled={isPending}
                      {...register(`quantities.${line.sourceLineId}`)}
                    />
                  </div>
                ))}
                {/* A record field's error type also allows nested entries; the schema only reports at the record. */}
                <FieldError>
                  {typeof errors.quantities?.message === 'string'
                    ? errors.quantities.message
                    : null}
                </FieldError>
              </Field>
            ) : null}

            {action === 'merge' ? (
              <Field data-invalid={Boolean(errors.intoPartId)}>
                <FieldLabel htmlFor="task-part-merge-target">Gộp vào phần</FieldLabel>
                <NativeSelect
                  id="task-part-merge-target"
                  className="w-full"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.intoPartId)}
                  {...register('intoPartId')}
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
                <FieldError>{errors.intoPartId?.message}</FieldError>
              </Field>
            ) : null}

            {REASON_ACTIONS.has(action) ? (
              <Field data-invalid={Boolean(errors.reason)}>
                <FieldLabel htmlFor="task-part-reason">Lý do</FieldLabel>
                <Textarea
                  id="task-part-reason"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.reason)}
                  {...register('reason')}
                />
                <FieldDescription>Lý do được ghi vào nhật ký hoạt động.</FieldDescription>
                <FieldError>{errors.reason?.message}</FieldError>
              </Field>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                Đóng
              </Button>
              <Button
                type="submit"
                variant={
                  action === 'cancel' || action === 'cancelSplit' ? 'destructive' : 'default'
                }
                disabled={isPending}
              >
                {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {copy.submit}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
