'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
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
    <OperationalListPanel
      aria-label="Dòng hàng phiếu điều chỉnh tồn"
      className="max-md:[&>[data-slot=table-container]]:hidden"
    >
      <ul data-slot="operational-list-body" className="divide-y md:hidden">
        {lines.map((line, index) => {
          const excluded = excludedLineIds.includes(line.id)
          return (
            <li
              key={line.id}
              className={cn('flex items-start gap-3 p-4', excluded && 'opacity-50')}
            >
              {canExclude ? (
                <Checkbox
                  className="mt-0.5"
                  checked={!excluded}
                  onCheckedChange={(value) => onToggleExclude(line.id, value !== true)}
                  aria-label={`Giữ dòng ${line.productSku}`}
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 font-medium break-words">
                    <span className="text-muted-foreground">{index + 1}. </span>
                    {line.productName}
                  </p>
                  <StockAdjustmentStatusBadge status={line.status} />
                </div>
                <p className="text-muted-foreground font-mono text-xs">
                  {line.productSku} · {formatStockLocation(line)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Lô {line.lotNumber ?? 'theo số lượng'} ·{' '}
                  {CYCLE_COUNT_QUALITY_LABELS[line.qualityStatus] ?? line.qualityStatus}
                  {line.unitName ? ` · ${line.unitName}` : ''}
                </p>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Sổ sách</dt>
                    <dd className="font-mono">{formatCount(line.systemQuantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Kiểm đếm</dt>
                    <dd className="font-mono">{formatCount(line.countedQuantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Chênh lệch</dt>
                    <dd
                      className={cn(
                        'font-mono font-semibold',
                        line.quantityChange < 0 ? 'text-destructive' : 'text-primary'
                      )}
                    >
                      {line.quantityChange > 0 ? '+' : ''}
                      {formatCount(line.quantityChange)}
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          )
        })}
      </ul>
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
    </OperationalListPanel>
  )
}
