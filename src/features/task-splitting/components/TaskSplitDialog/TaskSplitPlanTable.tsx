'use client'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  TaskSplitDraftPart,
  TaskSplitPlanColumn,
  TaskSplitPlanRow,
} from '../../hooks/use-task-split-plan'
import { formatQuantity, formatScore, sumQuantities } from '../../utils/task-split-quantity'

interface TaskSplitPlanTableProps {
  readonly rows: readonly TaskSplitPlanRow[]
  readonly columns: readonly TaskSplitPlanColumn[]
  readonly draft: readonly TaskSplitDraftPart[]
  readonly disabled: boolean
  readonly onChangeQuantity: (partIndex: number, lineId: string, value: string) => void
}

export function TaskSplitPlanTable({
  rows,
  columns,
  draft,
  disabled,
  onChangeQuantity,
}: TaskSplitPlanTableProps) {
  return (
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
            {draft.map((part, index) => (
              <TableCell key={index} className="text-right">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  // The line view carries no unit precision; the backend rejects excess decimals per line.
                  step="any"
                  aria-label={`Số lượng ${line.label} cho phần ${index + 1}`}
                  className="h-7 text-right tabular-nums"
                  disabled={disabled}
                  value={part.quantities[line.sourceLineId] ?? ''}
                  onChange={(event) =>
                    onChangeQuantity(index, line.sourceLineId, event.target.value)
                  }
                />
              </TableCell>
            ))}
            <TableCell className="text-right">
              <RemainingBadge remaining={remaining} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Tổng</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatQuantity(sumQuantities(rows.map((row) => row.line.unassigned)))}
          </TableCell>
          {columns.map((column, index) => (
            <TableCell
              key={index}
              className={
                column.total > 0 ? 'text-right tabular-nums' : 'text-destructive text-right'
              }
            >
              {column.total > 0 ? formatQuantity(column.total) : 'Phần trống'}
            </TableCell>
          ))}
          <TableCell className="text-right tabular-nums">
            {formatQuantity(sumQuantities(rows.map((row) => Math.max(0, row.remaining))))}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={4}>Tải mỗi người sau chia (theo gợi ý)</TableCell>
          {columns.map((column, index) => (
            <TableCell key={index} className="text-right tabular-nums">
              {column.loadAfter === undefined ? '—' : formatScore(column.loadAfter)}
            </TableCell>
          ))}
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}

function RemainingBadge({ remaining }: { readonly remaining: number }) {
  if (remaining < 0) return <Badge variant="destructive">Vượt {formatQuantity(-remaining)}</Badge>
  if (remaining > 0)
    return <Badge variant="outline">Còn {formatQuantity(remaining)} chưa giao</Badge>
  return <span className="text-muted-foreground">0</span>
}
