'use client'

import { CircleCheck, Combine, Pencil, Scissors, UserRoundPen, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { taskPartActionSchema } from '../../schemas/task-splitting.schema'
import type { TaskPartAction } from '../../types/task-splitting.types'

export const TASK_PART_ACTION_LABELS: Record<TaskPartAction, string> = {
  edit: 'Sửa',
  reassign: 'Giao lại',
  splitRemaining: 'Tách phần còn lại',
  merge: 'Gộp vào…',
  cancel: 'Huỷ',
  complete: 'Hoàn tất phần',
}

const ACTION_ICONS: Record<TaskPartAction, LucideIcon> = {
  edit: Pencil,
  reassign: UserRoundPen,
  splitRemaining: Scissors,
  merge: Combine,
  cancel: X,
  complete: CircleCheck,
}

interface TaskPartActionsProps {
  /** Exactly what the backend allows for this part; nothing else is offered. */
  readonly allowedActions: readonly TaskPartAction[]
  /** e.g. "Phần 2/3"; names each button for screen readers since every row repeats the same labels. */
  readonly partLabel: string
  readonly disabled: boolean
  readonly onSelect: (action: TaskPartAction) => void
}

export function TaskPartActions({
  allowedActions,
  partLabel,
  disabled,
  onSelect,
}: TaskPartActionsProps) {
  const actions = taskPartActionSchema.options.filter((action) => allowedActions.includes(action))
  if (actions.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {actions.map((action) => {
        const Icon = ACTION_ICONS[action]
        return (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={action === 'cancel' ? 'ghost' : 'outline'}
            className={action === 'cancel' ? 'text-destructive' : undefined}
            aria-label={`${TASK_PART_ACTION_LABELS[action]} (${partLabel})`}
            disabled={disabled}
            onClick={() => onSelect(action)}
          >
            <Icon aria-hidden="true" />
            {TASK_PART_ACTION_LABELS[action]}
          </Button>
        )
      })}
    </div>
  )
}
