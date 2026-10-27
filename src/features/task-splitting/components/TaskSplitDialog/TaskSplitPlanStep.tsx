'use client'

import { ArrowLeft, Check, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { useTaskSplitPlanForm } from '../../hooks/use-task-split-plan-form'
import type { useCreateTaskSplitMutation } from '../../hooks/use-task-splitting'
import type {
  TaskSplitStaff,
  TaskSplitStateResponse,
  TaskSplitSuggestionResponse,
} from '../../types/task-splitting.types'
import { TaskSplitPlanTable } from './TaskSplitPlanTable'

interface TaskSplitPlanStepProps {
  readonly state: TaskSplitStateResponse
  readonly suggestion: TaskSplitSuggestionResponse
  readonly staff: readonly TaskSplitStaff[]
  readonly createSplit: ReturnType<typeof useCreateTaskSplitMutation>
  readonly onBack: () => void
  readonly onDone: () => void
}

/** Orchestrator for the plan form: owns it for one suggestion and confirms the split. */
export function TaskSplitPlanStep({
  state,
  suggestion,
  staff,
  createSplit,
  onBack,
  onDone,
}: TaskSplitPlanStepProps) {
  const plan = useTaskSplitPlanForm(state, suggestion, staff, createSplit, onDone)

  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-4"
      onSubmit={(event) => void plan.confirm(event)}
    >
      <div className="max-h-[60vh] min-w-0 overflow-y-auto" data-scrollbar="slim">
        <TaskSplitPlanTable
          rows={plan.rows}
          columns={plan.columns}
          idleStaffNames={plan.idleStaffNames}
          hasInvalidQuantity={plan.hasInvalidQuantity}
          disabled={plan.isPending}
          registerQuantity={plan.registerQuantity}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={plan.isPending} onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Quay lại
        </Button>
        <Button type="submit" disabled={!plan.canConfirm}>
          {plan.isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Xác nhận
        </Button>
      </DialogFooter>
    </form>
  )
}
