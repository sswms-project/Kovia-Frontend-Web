import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import type { ApiErrorResponse } from '@/types/api'
import {
  taskPartActionFormSchema,
  type TaskPartActionFormValues,
  type TaskPartDialogAction,
  STAFF_ACTIONS,
} from '../schemas/task-part-action.schema'
import type {
  SplittableTaskType,
  TaskPartView,
  TaskSplitLineRequest,
} from '../types/task-splitting.types'
import { parseQuantity } from '../utils/task-split-quantity'
import {
  useCancelTaskSplitMutation,
  useTaskPartMutations,
  useTaskSplitQuery,
  useTaskSplitSuggestionQuery,
} from './use-task-splitting'

export interface PendingTaskPartAction {
  readonly action: TaskPartDialogAction
  /** `null` only for `cancelSplit`, which acts on the whole split. */
  readonly part: TaskPartView | null
  readonly rank: number
}

const SUCCESS_MESSAGES: Record<TaskPartDialogAction, string> = {
  edit: 'Đã cập nhật phần việc.',
  reassign: 'Đã giao lại phần việc.',
  splitRemaining: 'Đã tách phần việc.',
  merge: 'Đã gộp phần việc.',
  cancel: 'Đã huỷ phần việc.',
  complete: 'Đã hoàn tất phần việc.',
  cancelSplit: 'Đã huỷ chia việc.',
}

function defaultValues(action: TaskPartDialogAction, part: TaskPartView | null) {
  return {
    action,
    staffId: action === 'edit' && part ? part.assignedTo : '',
    intoPartId: '',
    reason: '',
    quantities: Object.fromEntries(
      (part?.lines ?? []).map((line) => [
        line.sourceLineId,
        action === 'edit' ? String(line.quantity) : '',
      ])
    ),
  } satisfies TaskPartActionFormValues
}

function toLines(quantities: Record<string, string>): TaskSplitLineRequest[] {
  return Object.entries(quantities)
    .map(([sourceLineId, text]) => ({ sourceLineId, quantity: parseQuantity(text) ?? 0 }))
    .filter((line) => line.quantity > 0)
}

/**
 * Parts panel workflow: one dialog at a time for a part action or "Huỷ chia". Every write carries the version the
 * screen was rendered from so a concurrent change is rejected instead of overwritten.
 */
export function useTaskPartActions(
  sourceType: SplittableTaskType,
  sourceId: string,
  invalidateKeys: readonly QueryKey[] | undefined
) {
  const [pending, setPending] = useState<PendingTaskPartAction | null>(null)
  const stateQuery = useTaskSplitQuery(sourceType, sourceId)
  const mutations = useTaskPartMutations(sourceType, sourceId, invalidateKeys)
  const cancelSplit = useCancelTaskSplitMutation(sourceType, sourceId, invalidateKeys)
  // Staff choices come from the backend's eligible list for this task; the frontend never filters it.
  const staffQuery = useTaskSplitSuggestionQuery(
    sourceType,
    sourceId,
    null,
    pending !== null && STAFF_ACTIONS.has(pending.action)
  )
  const form = useForm<TaskPartActionFormValues>({
    resolver: zodResolver(taskPartActionFormSchema),
    defaultValues: defaultValues('cancelSplit', null),
  })

  const activeParts = (stateQuery.data?.parts ?? []).filter(
    (part) => part.executionStatus !== 'Cancelled'
  )
  const mergeTargets = pending?.part
    ? activeParts
        .map((part, index) => ({ part, rank: index + 1 }))
        .filter(({ part }) => part.id !== pending.part?.id && part.allowedActions.includes('merge'))
    : []

  const open = (action: TaskPartDialogAction, part: TaskPartView | null, rank = 0) => {
    form.reset(defaultValues(action, part))
    setPending({ action, part, rank })
  }
  const close = () => setPending(null)

  const callbacks = (action: TaskPartDialogAction) => ({
    onSuccess: () => {
      toast.success(SUCCESS_MESSAGES[action])
      close()
    },
    onError: (error: ApiErrorResponse) => toast.error(getApiErrorMessage(error)),
  })

  const submit = form.handleSubmit((values) => {
    if (!pending) return
    const { action, part } = pending
    if (action === 'cancelSplit') {
      cancelSplit.mutate(
        { expectedVersion: stateQuery.data?.version ?? null, reason: values.reason },
        callbacks(action)
      )
      return
    }
    if (!part) return
    const target = { partId: part.id, expectedVersion: part.version }
    switch (action) {
      case 'edit':
        mutations.update.mutate(
          { ...target, staffId: values.staffId, lines: toLines(values.quantities) },
          callbacks(action)
        )
        break
      case 'reassign':
        mutations.reassign.mutate(
          {
            ...target,
            staffId: values.staffId,
            expectedStaffId: part.assignedTo,
            reason: values.reason,
          },
          callbacks(action)
        )
        break
      case 'splitRemaining':
        mutations.splitRemaining.mutate(
          { ...target, staffId: values.staffId, lines: toLines(values.quantities) },
          callbacks(action)
        )
        break
      case 'merge':
        mutations.merge.mutate({ ...target, intoPartId: values.intoPartId }, callbacks(action))
        break
      case 'cancel':
        mutations.cancel.mutate({ ...target, reason: values.reason }, callbacks(action))
        break
      case 'complete':
        mutations.complete.mutate({ ...target, reason: values.reason }, callbacks(action))
        break
    }
  })

  const isPending =
    cancelSplit.isPending || Object.values(mutations).some((mutation) => mutation.isPending)

  return {
    stateQuery,
    activeParts,
    pending,
    mergeTargets,
    staffQuery,
    form,
    isPending,
    open,
    close,
    submit,
  }
}
