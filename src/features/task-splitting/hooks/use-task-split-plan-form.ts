import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  buildTaskSplitPlanSchema,
  parsePlanQuantity,
  type TaskSplitPlanFormValues,
} from '../schemas/task-split-plan.schema'
import type {
  TaskSplitPartRequest,
  TaskSplitPlanColumn,
  TaskSplitPlanRow,
  TaskSplitStaff,
  TaskSplitStateResponse,
  TaskSplitSuggestionResponse,
} from '../types/task-splitting.types'
import { roundQuantity, sumQuantities } from '../utils/task-split-quantity'
import type { useCreateTaskSplitMutation } from './use-task-splitting'

type CreateTaskSplitMutation = ReturnType<typeof useCreateTaskSplitMutation>

function toFormValues(
  state: TaskSplitStateResponse,
  suggestion: TaskSplitSuggestionResponse
): TaskSplitPlanFormValues {
  const planned = suggestion.parts.map(
    (part) => new Map(part.lines.map((line) => [line.sourceLineId, line.quantity]))
  )
  return {
    parts: suggestion.parts.map((part) => ({ staffId: part.staffId })),
    rows: state.lines
      .filter((line) => line.unassigned > 0)
      .map((line) => ({
        sourceLineId: line.sourceLineId,
        quantities: planned.map((quantities) => String(quantities.get(line.sourceLineId) ?? 0)),
      })),
  }
}

/**
 * The editable split plan, validated by the plan schema against the latest unassigned quantities. Mounted once per
 * suggestion; the values survive a failed confirm so the manager can fix them and retry.
 */
export function useTaskSplitPlanForm(
  state: TaskSplitStateResponse,
  suggestion: TaskSplitSuggestionResponse,
  staff: readonly TaskSplitStaff[],
  createSplit: CreateTaskSplitMutation,
  onDone: () => void
) {
  const form = useForm<TaskSplitPlanFormValues>({
    resolver: zodResolver(buildTaskSplitPlanSchema(state.lines)),
    defaultValues: toFormValues(state, suggestion),
    mode: 'onChange',
  })
  const values = useWatch({ control: form.control })
  const { errors, isValid } = form.formState

  const lines = new Map(state.lines.map((line) => [line.sourceLineId, line]))
  const staffNames = new Map(staff.map((person) => [person.id, person.fullName]))
  const cell = (rowIndex: number, partIndex: number) =>
    parsePlanQuantity(values.rows?.[rowIndex]?.quantities?.[partIndex]) ?? 0

  const rows: TaskSplitPlanRow[] = (values.rows ?? []).flatMap((row, rowIndex) => {
    const line = row.sourceLineId ? lines.get(row.sourceLineId) : undefined
    if (!line) return []
    const partCount = row.quantities?.length ?? 0
    return [
      {
        line,
        remaining: roundQuantity(
          line.unassigned -
            sumQuantities(Array.from({ length: partCount }, (_, part) => cell(rowIndex, part)))
        ),
        overflowMessage: errors.rows?.[rowIndex]?.sourceLineId?.message,
        invalidQuantities: Array.from({ length: partCount }, (_, part) =>
          Boolean(errors.rows?.[rowIndex]?.quantities?.[part])
        ),
      },
    ]
  })
  const columns: TaskSplitPlanColumn[] = (values.parts ?? []).map((part, partIndex) => ({
    staffId: part.staffId ?? '',
    staffName: staffNames.get(part.staffId ?? '') ?? '',
    total: sumQuantities((values.rows ?? []).map((_, rowIndex) => cell(rowIndex, partIndex))),
    emptyMessage: errors.parts?.[partIndex]?.staffId?.message,
    points: suggestion.parts[partIndex]?.points,
    loadAfter: part.staffId ? suggestion.loadAfter[part.staffId] : undefined,
  }))

  // Overflow and empty-part rules span several cells, so every edit re-validates the whole grid.
  const registerQuantity = (rowIndex: number, partIndex: number) =>
    form.register(`rows.${rowIndex}.quantities.${partIndex}`, {
      onChange: () => void form.trigger(),
    })

  const confirm = form.handleSubmit((submitted) => {
    const parts: TaskSplitPartRequest[] = submitted.parts.map((part, partIndex) => ({
      staffId: part.staffId,
      lines: submitted.rows
        .map((row) => ({
          sourceLineId: row.sourceLineId,
          quantity: parsePlanQuantity(row.quantities[partIndex]) ?? 0,
        }))
        .filter((line) => line.quantity > 0),
    }))
    // The mutation hook logs the error; the manager only needs the message.
    createSplit.mutate(
      { expectedVersion: state.version, parts },
      {
        onSuccess: () => {
          toast.success('Đã chia việc.')
          onDone()
        },
        // The form keeps what was typed so the manager can fix it and retry.
        onError: (error) => toast.error(getApiErrorMessage(error)),
      }
    )
  })

  return {
    rows,
    columns,
    idleStaffNames: suggestion.idleStaffIds.map((staffId) => staffNames.get(staffId) ?? staffId),
    hasInvalidQuantity: rows.some((row) => row.invalidQuantities.some(Boolean)),
    canConfirm: isValid && !createSplit.isPending,
    isPending: createSplit.isPending,
    registerQuantity,
    confirm,
  }
}
