'use client'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StockAdjustment } from '../../types/cycle-count.types'
import { CYCLE_COUNT_QUALITY_LABELS, formatCount } from '../../utils/cycle-count-format'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { StockAdjustmentStatusBadge } from '../CycleCountStatusBadge'

interface StockAdjustmentVoucherLinesTableProps {
  readonly lines: readonly StockAdjustment[]
  readonly canExclude: boolean
  readonly excludedLineIds: readonly string[]
  readonly onToggleExclude: (lineId: string, excluded: boolean) => void
}

export function StockAdjustmentVoucherLinesTable({
  lines,
  canExclude,
  excludedLineIds,
  onToggleExclude,
}: StockAdjustmentVoucherLinesTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto border">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            {canExclude ? <TableHead className="w-10">Giữ</TableHead> : null}
            <TableHead className="w-10">#</TableHead>
            <TableHead>Mã VTHH</TableHead>
            <TableHead>Tên VTHH</TableHead>
            <TableHead>ĐVT</TableHead>
            <TableHead>Vị trí</TableHead>
            <TableHead>Lô</TableHead>
            <TableHead>Chất lượng</TableHead>
            <TableHead className="text-right">Tồn sổ sách</TableHead>
            <TableHead className="text-right">Số kiểm đếm</TableHead>
            <TableHead className="text-right">Chênh lệch</TableHead>
            <TableHead>Trạng thái dòng</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => {
            const excluded = excludedLineIds.includes(line.id)
            return (
              <TableRow key={line.id} className={excluded ? 'opacity-50' : undefined}>
                {canExclude ? (
                  <TableCell>
                    <Checkbox
                      checked={!excluded}
                      onCheckedChange={(value) => onToggleExclude(line.id, value !== true)}
                      aria-label={`Giữ dòng ${line.productSku}`}
                    />
                  </TableCell>
                ) : null}
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{line.productSku}</TableCell>
                <TableCell className="font-medium">{line.productName}</TableCell>
                <TableCell>{line.unitName ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{formatStockLocation(line)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {line.lotNumber ?? 'Theo số lượng'}
                </TableCell>
                <TableCell>
                  {CYCLE_COUNT_QUALITY_LABELS[line.qualityStatus] ?? line.qualityStatus}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCount(line.systemQuantity)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCount(line.countedQuantity)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-semibold ${
                    line.quantityChange < 0 ? 'text-destructive' : 'text-primary'
                  }`}
                >
                  {line.quantityChange > 0 ? '+' : ''}
                  {formatCount(line.quantityChange)}
                </TableCell>
                <TableCell>
                  <StockAdjustmentStatusBadge status={line.status} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
