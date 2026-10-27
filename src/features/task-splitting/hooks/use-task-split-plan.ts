import { useState } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import type {
  PlannedPart,
  SplittableTaskType,
  TaskSplitLineView,
  TaskSplitPartRequest,
} from '../types/task-splitting.types'
import { parseQuantity, roundQuantity, sumQuantities } from '../utils/task-split-quantity'
import {
  useCreateTaskSplitMutation,
  useTaskSplitQuery,
  useTaskSplitSuggestionQuery,
} from './use-task-splitting'

/** One editable part: quantities are the raw input text per source line. */
export interface TaskSplitDraftPart {
  readonly staffId: string
  readonly quantities: Readonly<Record<string, string>>
}

export interface TaskSplitPlanRow {
  readonly line: TaskSplitLineView
  /** Unassigned after this split; negative means the parts overflow the line. */
  readonly remaining: number
}

export interface TaskSplitPlanColumn {
  readonly staffId: string
  readonly staffName: string
  readonly total: number
  readonly loadAfter: number | undefined
}

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
 * Dialog workflow: pick staff (preselected by the backend) → ask the backend for a plan → edit quantities → confirm.
 * Staff and plan come only from the suggestion endpoint; the backend re-validates everything on confirm.
 */
export function useTaskSplitPlan(
  sourceType: SplittableTaskType,
  sourceId: string,
  invalidateKeys: readonly QueryKey[] | undefined,
  onDone: () => void
) {
  const [checkedOverride, setCheckedOverride] = useState<string[] | null>(null)
  const [requestedStaffIds, setRequestedStaffIds] = useState<string[] | null>(null)
  const [draftOverride, setDraftOverride] = useState<TaskSplitDraftPart[] | null>(null)

  const stateQuery = useTaskSplitQuery(sourceType, sourceId)
  const staffQuery = useTaskSplitSuggestionQuery(sourceType, sourceId, null, true)
  const planQuery = useTaskSplitSuggestionQuery(
    sourceType,
    sourceId,
    requestedStaffIds,
    requestedStaffIds !== null
  )
  const createSplit = useCreateTaskSplitMutation(sourceType, sourceId, invalidateKeys)

  const staff = staffQuery.data?.staff ?? []
  const checkedStaffIds = checkedOverride ?? staffQuery.data?.preselectedStaffIds ?? []
  const lines = (stateQuery.data?.lines ?? []).filter((line) => line.unassigned > 0)
  const draft = draftOverride ?? toDraft(planQuery.data?.parts ?? [])

  const staffNames = new Map(staff.map((person) => [person.id, person.fullName]))
  const rows: TaskSplitPlanRow[] = lines.map((line) => ({
    line,
    remaining: roundQuantity(
      line.unassigned - sumQuantities(draft.map((part) => quantityOf(part, line.sourceLineId) ?? 0))
    ),
  }))
  const columns: TaskSplitPlanColumn[] = draft.map((part) => ({
    staffId: part.staffId,
    staffName: staffNames.get(part.staffId) ?? '',
    total: sumQuantities(lines.map((line) => quantityOf(part, line.sourceLineId) ?? 0)),
    loadAfter: planQuery.data?.loadAfter[part.staffId],
  }))
  const hasInvalidQuantity = draft.some((part) =>
    lines.some((line) => quantityOf(part, line.sourceLineId) === null)
  )
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
    createSplit.mutate(
      { expectedVersion: stateQuery.data?.version ?? null, parts },
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
    code: stateQuery.data?.code,
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
    canConfirm,
    isPending: createSplit.isPending,
    toggleStaff,
    suggest,
    backToStaff,
    changeQuantity,
    confirm,
  }
}

export type TaskSplitPlan = ReturnType<typeof useTaskSplitPlan>
