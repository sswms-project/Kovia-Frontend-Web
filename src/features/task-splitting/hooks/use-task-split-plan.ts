import { useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import type {
  PlannedPart,
  TaskSplitDraftPart,
  TaskSplitPartRequest,
  TaskSplitPlanColumn,
  TaskSplitPlanRow,
  TaskSplitStateResponse,
} from '../types/task-splitting.types'
import { parseQuantity, roundQuantity, sumQuantities } from '../utils/task-split-quantity'
import { useCreateTaskSplitMutation, useTaskSplitSuggestionQuery } from './use-task-splitting'

type CreateTaskSplitMutation = ReturnType<typeof useCreateTaskSplitMutation>

// The plan must not be swapped under a manager who is editing it after switching windows.
const KEEP_ON_FOCUS = { refetchOnWindowFocus: false }

function toDraft(parts: readonly PlannedPart[]): TaskSplitDraftPart[] {
  return parts.map((part) => ({
    staffId: part.staffId,
    quantities: Object.fromEntries(
      part.lines.map((line) => [line.sourceLineId, String(line.quantity)])
    ),
  }))
}

const quantityOf = (part: TaskSplitDraftPart, lineId: string) =>
  parseQuantity(part.quantities[lineId] ?? '')

/**
 * Split dialog workflow: pick staff (preselected by the backend) → ask the backend for a plan → edit quantities →
 * confirm. Staff and plan come only from the suggestion endpoint; the backend re-validates everything on confirm.
 * The create mutation is owned by the dialog shell so a pending request keeps the dialog (and its callbacks) alive.
 */
export function useTaskSplitPlan(
  state: TaskSplitStateResponse,
  createSplit: CreateTaskSplitMutation,
  onDone: () => void
) {
  const [checkedOverride, setCheckedOverride] = useState<string[] | null>(null)
  const [requestedStaffIds, setRequestedStaffIds] = useState<string[] | null>(null)
  const [draftOverride, setDraftOverride] = useState<TaskSplitDraftPart[] | null>(null)

  const { sourceType, sourceId } = state
  const staffQuery = useTaskSplitSuggestionQuery(sourceType, sourceId, null, true, KEEP_ON_FOCUS)
  const planQuery = useTaskSplitSuggestionQuery(
    sourceType,
    sourceId,
    requestedStaffIds,
    requestedStaffIds !== null,
    KEEP_ON_FOCUS
  )

  const staff = staffQuery.data?.staff ?? []
  const checkedStaffIds = checkedOverride ?? staffQuery.data?.preselectedStaffIds ?? []
  const lines = state.lines.filter((line) => line.unassigned > 0)
  const plannedParts = planQuery.data?.parts ?? []
  const draft = draftOverride ?? toDraft(plannedParts)

  const staffNames = new Map(staff.map((person) => [person.id, person.fullName]))
  const rows: TaskSplitPlanRow[] = lines.map((line) => ({
    line,
    remaining: roundQuantity(
      line.unassigned - sumQuantities(draft.map((part) => quantityOf(part, line.sourceLineId) ?? 0))
    ),
  }))
  const columns: TaskSplitPlanColumn[] = draft.map((part, index) => ({
    staffId: part.staffId,
    staffName: staffNames.get(part.staffId) ?? '',
    total: sumQuantities(lines.map((line) => quantityOf(part, line.sourceLineId) ?? 0)),
    hasInvalidQuantity: lines.some((line) => quantityOf(part, line.sourceLineId) === null),
    points: plannedParts[index]?.points,
    loadAfter: planQuery.data?.loadAfter[part.staffId],
  }))
  const idleStaffNames = (planQuery.data?.idleStaffIds ?? []).map(
    (staffId) => staffNames.get(staffId) ?? staffId
  )
  const hasInvalidQuantity = columns.some((column) => column.hasInvalidQuantity)
  const canConfirm =
    draft.length > 0 &&
    !hasInvalidQuantity &&
    rows.every((row) => row.remaining >= 0) &&
    columns.every((column) => column.total > 0) &&
    !createSplit.isPending

  const toggleStaff = (staffId: string, checked: boolean) =>
    setCheckedOverride(
      checked ? [...checkedStaffIds, staffId] : checkedStaffIds.filter((id) => id !== staffId)
    )

  const suggest = () => {
    setDraftOverride(null)
    // Keep the backend's staff order so the request is stable no matter the click order.
    setRequestedStaffIds(
      staff.filter((person) => checkedStaffIds.includes(person.id)).map((person) => person.id)
    )
  }

  const backToStaff = () => {
    setRequestedStaffIds(null)
    setDraftOverride(null)
  }

  const changeQuantity = (partIndex: number, lineId: string, value: string) =>
    setDraftOverride(
      draft.map((part, index) =>
        index === partIndex
          ? { ...part, quantities: { ...part.quantities, [lineId]: value } }
          : part
      )
    )

  const confirm = () => {
    if (!canConfirm) return
    const parts: TaskSplitPartRequest[] = draft.map((part) => ({
      staffId: part.staffId,
      lines: lines
        .map((line) => ({
          sourceLineId: line.sourceLineId,
          quantity: quantityOf(part, line.sourceLineId) ?? 0,
        }))
        .filter((line) => line.quantity > 0),
    }))
    // The mutation hook logs the error; here the manager only needs the message.
    createSplit.mutate(
      { expectedVersion: state.version, parts },
      {
        onSuccess: () => {
          toast.success('Đã chia việc.')
          onDone()
        },
        // The draft stays as typed so the manager can fix it and retry.
        onError: (error) => toast.error(getApiErrorMessage(error)),
      }
    )
  }

  return {
    step: requestedStaffIds === null ? ('staff' as const) : ('plan' as const),
    staffQuery,
    planQuery,
    staff,
    preselectedStaffIds: staffQuery.data?.preselectedStaffIds ?? [],
    recommendedPeople: staffQuery.data?.recommendedPeople,
    checkedStaffIds,
    rows,
    columns,
    draft,
    idleStaffNames,
    hasInvalidQuantity,
    canConfirm,
    isPending: createSplit.isPending,
    toggleStaff,
    suggest,
    backToStaff,
    changeQuantity,
    confirm,
  }
}
