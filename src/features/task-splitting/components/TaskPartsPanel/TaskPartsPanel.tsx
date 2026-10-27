'use client'

import { Ban, RefreshCw } from 'lucide-react'
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
  SplittableTaskType,
  TaskPartExecutionStatus,
  TaskPartView,
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
  readonly sourceType: SplittableTaskType
  readonly sourceId: string
  /** Query keys of the source page to refresh after any part change. */
  readonly invalidateKeys?: readonly QueryKey[]
}

/** "Phần việc" block; renders nothing while the task is not split. */
export function TaskPartsPanel({ sourceType, sourceId, invalidateKeys }: TaskPartsPanelProps) {
  const actions = useTaskPartActions(sourceType, sourceId, invalidateKeys)
  const { stateQuery, activeParts } = actions

  if (stateQuery.isError) {
    return (
      <section className="flex flex-col items-start gap-2 border p-3 text-sm">
        <span>Không thể tải các phần việc.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={stateQuery.isFetching}
          onClick={() => void stateQuery.refetch()}
        >
          <RefreshCw aria-hidden="true" />
          Thử lại
        </Button>
      </section>
    )
  }
  if (!stateQuery.data?.isSplit) return null

  return (
    <section
      aria-labelledby="task-parts-heading"
      className="bg-card flex flex-col gap-3 border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="task-parts-heading" className="text-base font-semibold">
          Phần việc
        </h2>
        {stateQuery.data.canCancelSplit ? (
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
          {activeParts.map((part, index) => (
            <TableRow key={part.id}>
              <TableCell className="font-medium">
                Phần {index + 1}/{activeParts.length}
              </TableCell>
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
                  disabled={actions.isPending}
                  onSelect={(action) => actions.open(action, part, index + 1)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TaskPartActionDialog
        pending={actions.pending}
        form={actions.form}
        staff={actions.staffQuery.data?.staff ?? []}
        isLoadingStaff={actions.staffQuery.isFetching}
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
