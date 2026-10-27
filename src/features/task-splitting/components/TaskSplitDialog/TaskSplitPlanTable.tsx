'use client'

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
import type {
  TaskSplitDraftPart,
  TaskSplitPlanColumn,
  TaskSplitPlanRow,
} from '../../types/task-splitting.types'
import { formatQuantity, parseQuantity } from '../../utils/task-split-quantity'
import { TaskSplitPlanFooter } from './TaskSplitPlanFooter'

const INVALID_MESSAGE_ID = 'task-split-invalid-quantity'

interface TaskSplitPlanTableProps {
  readonly rows: readonly TaskSplitPlanRow[]
  readonly columns: readonly TaskSplitPlanColumn[]
  readonly draft: readonly TaskSplitDraftPart[]
  readonly idleStaffNames: readonly string[]
  readonly hasInvalidQuantity: boolean
  readonly disabled: boolean
  readonly onChangeQuantity: (partIndex: number, lineId: string, value: string) => void
}

export function TaskSplitPlanTable({
  rows,
  columns,
  draft,
  idleStaffNames,
  hasInvalidQuantity,
  disabled,
  onChangeQuantity,
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
          {rows.map(({ line, remaining }) => (
            <TableRow key={line.sourceLineId}>
              <TableCell className="font-medium">{line.label}</TableCell>
              <TableCell>{line.zoneName ?? '—'}</TableCell>
              <TableCell className="font-mono">{line.slotCode ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatQuantity(line.unassigned)}
              </TableCell>
              {draft.map((part, index) => {
                const value = part.quantities[line.sourceLineId] ?? ''
                const isInvalid = parseQuantity(value) === null
                return (
                  <TableCell key={index} className="text-right">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      // The line view carries no unit precision; the backend rejects excess decimals per line.
                      step="any"
                      aria-label={`Số lượng ${line.label} cho phần ${index + 1}`}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? INVALID_MESSAGE_ID : undefined}
                      className="h-7 text-right tabular-nums"
                      disabled={disabled}
                      value={value}
                      onChange={(event) =>
                        onChangeQuantity(index, line.sourceLineId, event.target.value)
                      }
                    />
                  </TableCell>
                )
              })}
              <TableCell className="text-right">
                <RemainingBadge remaining={remaining} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TaskSplitPlanFooter rows={rows} columns={columns} />
      </Table>
      {hasInvalidQuantity ? (
        <p id={INVALID_MESSAGE_ID} role="alert" className="text-destructive text-xs">
          Số lượng không hợp lệ
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
  readonly remaining: number
}

function RemainingBadge({ remaining }: RemainingBadgeProps) {
  if (remaining < 0) return <Badge variant="destructive">Vượt {formatQuantity(-remaining)}</Badge>
  if (remaining > 0)
    return <Badge variant="outline">Còn {formatQuantity(remaining)} chưa giao</Badge>
  return <span className="text-muted-foreground">0</span>
}
