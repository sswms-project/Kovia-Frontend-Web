import { useState } from 'react'
import type { TaskSplitStateResponse } from '../types/task-splitting.types'
import { useTaskSplitSuggestionQuery } from './use-task-splitting'

// The plan must not be swapped under a manager who is editing it after switching windows.
const KEEP_ON_FOCUS = { refetchOnWindowFocus: false }

/**
 * Split dialog workflow before editing: pick staff (preselected by the backend) → ask the backend for a plan.
 * Staff and plan come only from the suggestion endpoint; the frontend never filters eligibility.
 */
export function useTaskSplitPlan(state: TaskSplitStateResponse) {
  const [checkedOverride, setCheckedOverride] = useState<string[] | null>(null)
  const [requestedStaffIds, setRequestedStaffIds] = useState<string[] | null>(null)
  // Bumped on every "Gợi ý chia" so the plan form starts from the new suggestion.
  const [suggestionCount, setSuggestionCount] = useState(0)

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

  const toggleStaff = (staffId: string, checked: boolean) =>
    setCheckedOverride(
      checked ? [...checkedStaffIds, staffId] : checkedStaffIds.filter((id) => id !== staffId)
    )

  const suggest = () => {
    setSuggestionCount((count) => count + 1)
    // Keep the backend's staff order so the request is stable no matter the click order.
    setRequestedStaffIds(
      staff.filter((person) => checkedStaffIds.includes(person.id)).map((person) => person.id)
    )
  }

  return {
    step: requestedStaffIds === null ? ('staff' as const) : ('plan' as const),
    suggestionCount,
    staffQuery,
    planQuery,
    staff,
    preselectedStaffIds: staffQuery.data?.preselectedStaffIds ?? [],
    recommendedPeople: staffQuery.data?.recommendedPeople,
    checkedStaffIds,
    toggleStaff,
    suggest,
    backToStaff: () => setRequestedStaffIds(null),
  }
}
