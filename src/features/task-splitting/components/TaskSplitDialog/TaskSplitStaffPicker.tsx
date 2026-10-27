'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { TaskSplitStaff } from '../../types/task-splitting.types'
import { formatScore } from '../../utils/task-split-quantity'

interface TaskSplitStaffPickerProps {
  readonly staff: readonly TaskSplitStaff[]
  readonly checkedStaffIds: readonly string[]
  readonly preselectedStaffIds: readonly string[]
  readonly disabled: boolean
  readonly onToggle: (staffId: string, checked: boolean) => void
}

export function TaskSplitStaffPicker({
  staff,
  checkedStaffIds,
  preselectedStaffIds,
  disabled,
  onToggle,
}: TaskSplitStaffPickerProps) {
  if (staff.length === 0) {
    return (
      <p className="text-muted-foreground border border-dashed p-3 text-sm">
        Kho này chưa có nhân viên đủ điều kiện nhận việc.
      </p>
    )
  }

  return (
    <ul
      aria-label="Nhân viên nhận phần việc"
      data-scrollbar="slim"
      className="flex max-h-80 flex-col gap-1.5 overflow-y-auto"
    >
      {staff.map((person) => {
        const inputId = `task-split-staff-${person.id}`
        const isChecked = checkedStaffIds.includes(person.id)
        return (
          <li key={person.id}>
            <label
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer items-center gap-3 border p-3 transition-colors',
                isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <Checkbox
                id={inputId}
                checked={isChecked}
                disabled={disabled}
                onCheckedChange={(checked) => onToggle(person.id, checked === true)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{person.fullName}</span>
                <span className="text-muted-foreground block truncate text-xs">{person.email}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                {preselectedStaffIds.includes(person.id) ? <Badge>Đề xuất</Badge> : null}
                {person.hasTaskInProgress ? (
                  <Badge variant="outline">Đang làm việc khác</Badge>
                ) : null}
                <span className="font-medium tabular-nums">
                  Điểm tải {formatScore(person.workloadScore)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {person.totalOpenTasks} việc đang mở
                </span>
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
