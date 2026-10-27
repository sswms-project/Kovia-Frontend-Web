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
  TaskPartActionTarget,
  TaskPartMergeTarget,
  TaskPartView,
  TaskSplitLineRequest,
  TaskSplitStateResponse,
} from '../types/task-splitting.types'
import { parseQuantity } from '../utils/task-split-quantity'
import {
  useCancelTaskSplitMutation,
  useTaskPartMutations,
  useTaskSplitSuggestionQuery,
} from './use-task-splitting'

/** Only ids are kept: the part itself is read from the latest state so a retry sends the reloaded version. */
interface OpenAction {
  readonly action: TaskPartDialogAction
  readonly partId: string | null
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
 * Parts panel workflow: one dialog at a time for a part action or "Huỷ chia". The split state is owned by the page;
 * every write carries the version of the latest state so a concurrent change is rejected instead of overwritten.
 */
export function useTaskPartActions(
  state: TaskSplitStateResponse,
  invalidateKeys: readonly QueryKey[] | undefined
) {
  const { sourceType, sourceId } = state
  const [openAction, setOpenAction] = useState<OpenAction | null>(null)
  const mutations = useTaskPartMutations(sourceType, sourceId, invalidateKeys)
  const cancelSplit = useCancelTaskSplitMutation(sourceType, sourceId, invalidateKeys)
  // Staff choices come from the backend's eligible list for this task; the frontend never filters eligibility.
  const staffQuery = useTaskSplitSuggestionQuery(
    sourceType,
    sourceId,
    null,
    openAction !== null && STAFF_ACTIONS.has(openAction.action)
  )
  const form = useForm<TaskPartActionFormValues>({
    resolver: zodResolver(taskPartActionFormSchema),
    defaultValues: defaultValues('cancelSplit', null),
  })

  const activeParts = state.parts.filter((part) => part.executionStatus !== 'Cancelled')
  const target = resolveTarget(openAction, activeParts, state.canCancelSplit)
  const mergeTargets: TaskPartMergeTarget[] = target?.part
    ? activeParts
        .map((part, index) => ({ part, rank: index + 1 }))
        .filter(({ part }) => part.id !== target.part?.id && part.allowedActions.includes('merge'))
    : []

  const open = (action: TaskPartDialogAction, part: TaskPartView | null) => {
    form.reset(defaultValues(action, part))
    setOpenAction({ action, partId: part?.id ?? null })
  }
  const close = () => setOpenAction(null)

  const callbacks = (action: TaskPartDialogAction) => ({
    onSuccess: () => {
      toast.success(SUCCESS_MESSAGES[action])
      close()
    },
    // The mutation hook already logs the error; the dialog stays open for a retry.
    onError: (error: ApiErrorResponse) => toast.error(getApiErrorMessage(error)),
  })

  const submit = form.handleSubmit((values) => {
    if (!target || target.isStale) return
    const { action, part } = target
    if (action === 'cancelSplit') {
      cancelSplit.mutate(
        { expectedVersion: state.version, reason: values.reason },
        callbacks(action)
      )
      return
    }
    if (!part) return
    const request = { partId: part.id, expectedVersion: part.version }
    switch (action) {
      case 'edit':
        mutations.update.mutate(
          { ...request, staffId: values.staffId, lines: toLines(values.quantities) },
          callbacks(action)
        )
        break
      case 'reassign':
        mutations.reassign.mutate(
          {
            ...request,
            staffId: values.staffId,
            expectedStaffId: part.assignedTo,
            reason: values.reason,
          },
          callbacks(action)
        )
        break
      case 'splitRemaining':
        mutations.splitRemaining.mutate(
          { ...request, staffId: values.staffId, lines: toLines(values.quantities) },
          callbacks(action)
        )
        break
      case 'merge':
        mutations.merge.mutate({ ...request, intoPartId: values.intoPartId }, callbacks(action))
        break
      case 'cancel':
        mutations.cancel.mutate({ ...request, reason: values.reason }, callbacks(action))
        break
      case 'complete':
        mutations.complete.mutate({ ...request, reason: values.reason }, callbacks(action))
        break
    }
  })

  const isPending =
    cancelSplit.isPending || Object.values(mutations).some((mutation) => mutation.isPending)

  return {
    activeParts,
    target,
    mergeTargets,
    staffQuery,
    form,
    isPending,
    open,
    close,
    submit,
  }
}

function resolveTarget(
  openAction: OpenAction | null,
  activeParts: readonly TaskPartView[],
  canCancelSplit: boolean
): TaskPartActionTarget | null {
  if (!openAction) return null
  const { action, partId } = openAction
  if (partId === null) return { action, part: null, rank: 0, isStale: !canCancelSplit }
  const index = activeParts.findIndex((part) => part.id === partId)
  const part = activeParts[index] ?? null
  const isAllowed =
    action !== 'cancelSplit' && part !== null && part.allowedActions.includes(action)
  return { action, part, rank: index + 1, isStale: !isAllowed }
}
