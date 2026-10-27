'use client'

import { TableCell, TableFooter, TableRow } from '@/components/ui/table'
import type { TaskSplitPlanColumn, TaskSplitPlanRow } from '../../types/task-splitting.types'
import { formatQuantity, formatScore, sumQuantities } from '../../utils/task-split-quantity'

interface TaskSplitPlanFooterProps {
  readonly rows: readonly TaskSplitPlanRow[]
  readonly columns: readonly TaskSplitPlanColumn[]
}

const formatOptionalScore = (value: number | undefined) =>
  value === undefined ? '—' : formatScore(value)

/** Totals per column, then the suggestion's points per part and load per person after the split. */
export function TaskSplitPlanFooter({ rows, columns }: TaskSplitPlanFooterProps) {
  return (
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
              column.emptyMessage ? 'text-destructive text-right' : 'text-right tabular-nums'
            }
          >
            {column.emptyMessage ?? formatQuantity(column.total)}
          </TableCell>
        ))}
        <TableCell className="text-right tabular-nums">
          {formatQuantity(sumQuantities(rows.map((row) => Math.max(0, row.remaining))))}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4}>Điểm mỗi phần (theo gợi ý)</TableCell>
        {columns.map((column, index) => (
          <TableCell key={index} className="text-right tabular-nums">
            {formatOptionalScore(column.points)}
          </TableCell>
        ))}
        <TableCell />
      </TableRow>
      <TableRow>
        <TableCell colSpan={4}>Tải mỗi người sau chia (theo gợi ý)</TableCell>
        {columns.map((column, index) => (
          <TableCell key={index} className="text-right tabular-nums">
            {formatOptionalScore(column.loadAfter)}
          </TableCell>
        ))}
        <TableCell />
      </TableRow>
    </TableFooter>
  )
}
