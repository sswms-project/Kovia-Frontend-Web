import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatInventoryDate } from '@/features/inventory/utils/inventory-format'
import {
  formatStockMovementQuantity,
  formatStockMovementType,
} from '@/features/inventory/utils/stock-movement-format'
import { cn } from '@/lib/utils'
import type { InventoryAnomaly } from '../../types/inventory-anomaly.types'
import { formatAnomalyReason } from '../../utils/anomaly-reasons'
import { AnomalyReviewBadge, AnomalySeverityBadge } from './AnomalyBadges'

interface InventoryAnomalyResultsProps {
  readonly items: readonly InventoryAnomaly[]
  readonly onSelect: (anomaly: InventoryAnomaly) => void
}

function Quantity({ anomaly }: { readonly anomaly: InventoryAnomaly }) {
  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        anomaly.quantityChange < 0 ? 'text-destructive' : 'text-foreground'
      )}
    >
      {formatStockMovementQuantity(anomaly.quantityChange)} {anomaly.unitName ?? ''}
    </span>
  )
}

function mainReason(anomaly: InventoryAnomaly) {
  const reason = anomaly.reasons[0]
  return reason ? formatAnomalyReason(reason, anomaly) : 'Không có lý do kèm theo.'
}

export function InventoryAnomalyMobileList({ items, onSelect }: InventoryAnomalyResultsProps) {
  return (
    <ItemGroup data-slot="operational-list-body" className="gap-0 md:hidden">
      {items.map((anomaly) => (
        <Item key={anomaly.id} asChild className="border-b last:border-b-0">
          <button type="button" className="text-left" onClick={() => onSelect(anomaly)}>
            <ItemContent className="min-w-0">
              <ItemTitle className="flex w-full items-center justify-between gap-3">
                <span className="truncate">{anomaly.productName || anomaly.sku}</span>
                <AnomalySeverityBadge severity={anomaly.severity} />
              </ItemTitle>
              <ItemDescription>
                {formatStockMovementType(anomaly.movementType)} · <Quantity anomaly={anomaly} /> ·{' '}
                {formatInventoryDate(anomaly.occurredAt)}
              </ItemDescription>
              <ItemDescription className="line-clamp-2">{mainReason(anomaly)}</ItemDescription>
              <AnomalyReviewBadge status={anomaly.reviewStatus} />
            </ItemContent>
          </button>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function InventoryAnomalyDesktopTable({ items, onSelect }: InventoryAnomalyResultsProps) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
      <Table className="min-w-[1080px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 w-28">Mức độ</TableHead>
            <TableHead className="sticky top-0 z-10 w-40">Thời gian</TableHead>
            <TableHead className="sticky top-0 z-10 w-60">Sản phẩm</TableHead>
            <TableHead className="sticky top-0 z-10 w-48">Giao dịch</TableHead>
            <TableHead className="sticky top-0 z-10 w-40">Người thực hiện</TableHead>
            <TableHead className="sticky top-0 z-10">Lý do chính</TableHead>
            <TableHead className="sticky top-0 z-10 w-44">Xem xét</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((anomaly) => (
            <TableRow
              key={anomaly.id}
              className="hover:bg-muted cursor-pointer"
              onClick={() => onSelect(anomaly)}
            >
              <TableCell>
                <AnomalySeverityBadge severity={anomaly.severity} />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatInventoryDate(anomaly.occurredAt)}
              </TableCell>
              <TableCell className="min-w-0">
                {/* The row opens the detail sheet; this button keeps it reachable by keyboard. */}
                <button
                  type="button"
                  className="focus-visible:ring-ring block w-full min-w-0 text-left focus-visible:ring-2 focus-visible:outline-none"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect(anomaly)
                  }}
                >
                  <span className="block truncate font-medium">
                    {anomaly.productName || 'Sản phẩm chưa xác định'}
                  </span>
                  <span
                    className="text-muted-foreground block truncate font-mono text-xs"
                    translate="no"
                  >
                    {anomaly.sku}
                  </span>
                </button>
              </TableCell>
              <TableCell className="text-xs">
                <p className="truncate">{formatStockMovementType(anomaly.movementType)}</p>
                <Quantity anomaly={anomaly} />
              </TableCell>
              <TableCell className="truncate" title={anomaly.performedByName ?? undefined}>
                {anomaly.performedByName || 'Chưa xác định'}
              </TableCell>
              <TableCell className="text-sm">
                <p className="line-clamp-2" title={mainReason(anomaly)}>
                  {mainReason(anomaly)}
                </p>
              </TableCell>
              <TableCell>
                <AnomalyReviewBadge status={anomaly.reviewStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
