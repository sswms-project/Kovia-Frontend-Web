'use client'

import { Ban } from 'lucide-react'
import type { QueryKey } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTaskPartActions } from '../../hooks/use-task-part-actions'
import type {
  TaskPartExecutionStatus,
  TaskPartView,
  TaskSplitStateResponse,
} from '../../types/task-splitting.types'
import { formatQuantity, sumQuantities } from '../../utils/task-split-quantity'
import { TaskPartActionDialog } from './TaskPartActionDialog'
import { TaskPartActions } from './TaskPartActions'

const STATUS_LABELS: Record<TaskPartExecutionStatus, string> = {
  Queued: 'Chờ bắt đầu',
  InProgress: 'Đang làm',
  Paused: 'Tạm dừng',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã huỷ',
}

export interface TaskPartsPanelProps {
  /** Split state owned by the page (`useTaskSplitQuery`); the panel renders nothing until the task is split. */
  readonly state: TaskSplitStateResponse
  /** Query keys of the source page to refresh after any part change. */
  readonly invalidateKeys?: readonly QueryKey[]
}

/** "Phần việc" block. Orchestrator for part actions: owns their dialog, staff list and mutations. */
export function TaskPartsPanel({ state, invalidateKeys }: TaskPartsPanelProps) {
  const actions = useTaskPartActions(state, invalidateKeys)
  if (!state.isSplit) return null
  const { activeParts, staffQuery } = actions

  return (
    <section
      aria-labelledby="task-parts-heading"
      className="bg-card flex flex-col gap-3 border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="task-parts-heading" className="text-base font-semibold">
          Phần việc
        </h2>
        {state.canCancelSplit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={actions.isPending}
            onClick={() => actions.open('cancelSplit', null)}
          >
            <Ban aria-hidden="true" />
            Huỷ chia
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phần</TableHead>
            <TableHead>Người làm</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Tiến độ</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeParts.map((part, index) => {
            const partLabel = `Phần ${index + 1}/${activeParts.length}`
            return (
              <TableRow key={part.id}>
                <TableCell className="font-medium">{partLabel}</TableCell>
                <TableCell>{part.assigneeName}</TableCell>
                <TableCell>
                  <Badge variant={part.executionStatus === 'InProgress' ? 'default' : 'outline'}>
                    {STATUS_LABELS[part.executionStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{describeProgress(part)}</TableCell>
                <TableCell className="text-right">
                  <TaskPartActions
                    allowedActions={part.allowedActions}
                    partLabel={partLabel}
                    disabled={actions.isPending}
                    onSelect={(action) => actions.open(action, part)}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <TaskPartActionDialog
        target={actions.target}
        form={actions.form}
        staff={staffQuery.data?.staff ?? []}
        isLoadingStaff={staffQuery.isFetching}
        isStaffError={staffQuery.isError}
        onRetryStaff={() => void staffQuery.refetch()}
        mergeTargets={actions.mergeTargets}
        isPending={actions.isPending}
        onClose={actions.close}
        onSubmit={() => void actions.submit()}
      />
    </section>
  )
}

/** "đã xong/được giao" across the part's lines. */
function describeProgress(part: TaskPartView) {
  const done = sumQuantities(part.lines.map((line) => line.completedQuantity))
  const assigned = sumQuantities(part.lines.map((line) => line.quantity))
  return `${formatQuantity(done)}/${formatQuantity(assigned)}`
}
