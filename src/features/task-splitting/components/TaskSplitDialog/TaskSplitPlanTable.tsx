'use client'

import type { UseFormRegisterReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { INVALID_PLAN_QUANTITY_MESSAGE } from '../../schemas/task-split-plan.schema'
import type { TaskSplitPlanColumn, TaskSplitPlanRow } from '../../types/task-splitting.types'
import { formatQuantity } from '../../utils/task-split-quantity'
import { TaskSplitPlanFooter } from './TaskSplitPlanFooter'

const INVALID_MESSAGE_ID = 'task-split-invalid-quantity'

interface TaskSplitPlanTableProps {
  readonly rows: readonly TaskSplitPlanRow[]
  readonly columns: readonly TaskSplitPlanColumn[]
  readonly idleStaffNames: readonly string[]
  readonly hasInvalidQuantity: boolean
  readonly disabled: boolean
  readonly registerQuantity: (rowIndex: number, partIndex: number) => UseFormRegisterReturn
}

export function TaskSplitPlanTable({
  rows,
  columns,
  idleStaffNames,
  hasInvalidQuantity,
  disabled,
  registerQuantity,
}: TaskSplitPlanTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dòng</TableHead>
            <TableHead>Khu</TableHead>
            <TableHead>Vị trí</TableHead>
            <TableHead className="text-right">Cần giao</TableHead>
            {columns.map((column, index) => (
              <TableHead key={index} className="min-w-28 text-right">
                <span className="block">Phần {index + 1}</span>
                <span className="text-muted-foreground block font-normal">{column.staffName}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">Chưa giao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={row.line.sourceLineId}>
              <TableCell className="font-medium">{row.line.label}</TableCell>
              <TableCell>{row.line.zoneName ?? '—'}</TableCell>
              <TableCell className="font-mono">{row.line.slotCode ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatQuantity(row.line.unassigned)}
              </TableCell>
              {columns.map((_, partIndex) => {
                const isInvalid = row.invalidQuantities[partIndex] ?? false
                return (
                  <TableCell key={partIndex} className="text-right">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      // The line view carries no unit precision; the backend rejects excess decimals per line.
                      step="any"
                      aria-label={`Số lượng ${row.line.label} cho phần ${partIndex + 1}`}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? INVALID_MESSAGE_ID : undefined}
                      className="h-7 text-right tabular-nums"
                      disabled={disabled}
                      {...registerQuantity(rowIndex, partIndex)}
                    />
                  </TableCell>
                )
              })}
              <TableCell className="text-right">
                <RemainingBadge row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TaskSplitPlanFooter rows={rows} columns={columns} />
      </Table>
      {hasInvalidQuantity ? (
        <p id={INVALID_MESSAGE_ID} role="alert" className="text-destructive text-xs">
          {INVALID_PLAN_QUANTITY_MESSAGE}
        </p>
      ) : null}
      {idleStaffNames.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Không nhận phần nào: {idleStaffNames.join(', ')}
        </p>
      ) : null}
    </div>
  )
}

interface RemainingBadgeProps {
  readonly row: TaskSplitPlanRow
}

function RemainingBadge({ row }: RemainingBadgeProps) {
  if (row.overflowMessage) return <Badge variant="destructive">{row.overflowMessage}</Badge>
  // Validation runs right after a change; the watched values already show the overflow.
  if (row.remaining < 0)
    return <Badge variant="destructive">Vượt {formatQuantity(-row.remaining)}</Badge>
  if (row.remaining > 0)
    return <Badge variant="outline">Còn {formatQuantity(row.remaining)} chưa giao</Badge>
  return <span className="text-muted-foreground">0</span>
}
