import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StockMovement } from '../../types/inventory.types'
import {
  formatInventoryDate,
  formatInventoryLocation,
  formatQualityStatus,
} from '../../utils/inventory-format'
import {
  formatReferenceId,
  formatStockMovementQuantity,
  formatStockMovementType,
  formatStockMovementReference,
} from '../../utils/stock-movement-format'

function QuantityChange({
  value,
  unitName,
}: {
  readonly value: number
  readonly unitName?: string | null
}) {
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus
  return (
    <span
      className={
        value > 0
          ? 'text-emerald-700 dark:text-emerald-400'
          : value < 0
            ? 'text-destructive'
            : 'text-muted-foreground'
      }
    >
      <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">
        <Icon className="size-3.5" aria-hidden="true" />
        {formatStockMovementQuantity(value)} {unitName ?? '—'}
      </span>
    </span>
  )
}

function MovementBadge({ value }: { readonly value: string }) {
  return <Badge variant="outline">{formatStockMovementType(value)}</Badge>
}

function MovementLocation({ item }: { readonly item: StockMovement }) {
  const zone = [item.zoneCode, item.zoneName?.trim()].filter(Boolean).join(' - ')
  const rack = [item.rackCode, item.rackName?.trim()].filter(Boolean).join(' - ')
  const showSlot = !item.isSystemDefaultSlot && item.slotCode !== '__SYSTEM_DEFAULT__'

  return (
    <div className="min-w-0 space-y-1 text-xs wrap-anywhere whitespace-normal">
      <p className="font-medium">{item.warehouseName || 'Kho chưa xác định'}</p>
      {zone || rack ? (
        <div className="text-muted-foreground space-y-1">
          {zone && <p>Khu vực {zone}</p>}
          {rack && <p>Kệ {rack}</p>}
          {showSlot && item.slotCode && <p>Vị trí {item.slotCode}</p>}
        </div>
      ) : (
        <p className="text-muted-foreground">{formatInventoryLocation(item)}</p>
      )}
    </div>
  )
}

export function StockMovementMobileList({ items }: { readonly items: readonly StockMovement[] }) {
  return (
    <ItemGroup className="gap-0 md:hidden">
      {items.map((item) => (
        <Item key={item.id} className="border-b last:border-b-0">
          <ItemContent className="min-w-0">
            <ItemTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{item.productName || 'Sản phẩm chưa xác định'}</span>
              <QuantityChange value={item.quantityChange} unitName={item.unitName} />
            </ItemTitle>
            <ItemDescription>
              <span className="font-mono" translate="no">
                {item.sku || item.productId}
              </span>{' '}
              · {item.lotNumber ? `Lô ${item.lotNumber}` : 'Không theo lô'} ·{' '}
              {formatQualityStatus(item.qualityStatus)}
            </ItemDescription>
            <MovementLocation item={item} />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <MovementBadge value={item.movementType} />
              <span className="text-muted-foreground">{formatInventoryDate(item.occurredAt)}</span>
            </div>
            <ItemDescription>
              {item.performedByName || 'Người dùng chưa xác định'} ·{' '}
              {formatStockMovementReference(item.referenceType)} ·{' '}
              {item.referenceCode || formatReferenceId(item.referenceId)}
            </ItemDescription>
            <ItemDescription>
              Sau biến động: {formatStockMovementQuantity(item.balanceAfter).replace('+', '')}{' '}
              {item.unitName ?? '—'}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function StockMovementDesktopTable({ items }: { readonly items: readonly StockMovement[] }) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
      <Table className="min-w-[1080px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 w-40">Thời gian</TableHead>
            <TableHead className="sticky top-0 z-10 w-36">Loại</TableHead>
            <TableHead className="sticky top-0 z-10 w-64">Sản phẩm</TableHead>
            <TableHead className="sticky top-0 z-10 w-72">Kho / Vị trí</TableHead>
            <TableHead className="sticky top-0 z-10 w-36">Lô / Chất lượng</TableHead>
            <TableHead className="sticky top-0 z-10 w-36 text-right">Biến động</TableHead>
            <TableHead className="sticky top-0 z-10 w-36 text-right">Sau biến động</TableHead>
            <TableHead className="sticky top-0 z-10 w-48">Chứng từ</TableHead>
            <TableHead className="sticky top-0 z-10 w-48">Người thực hiện</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground text-xs">
                {formatInventoryDate(item.occurredAt)}
              </TableCell>
              <TableCell>
                <MovementBadge value={item.movementType} />
              </TableCell>
              <TableCell className="min-w-0">
                <p className="truncate font-medium">
                  {item.productName || 'Sản phẩm chưa xác định'}
                </p>
                <p className="text-muted-foreground truncate font-mono text-xs" translate="no">
                  {item.sku || item.productId}
                </p>
              </TableCell>
              <TableCell className="min-w-0 text-xs">
                <MovementLocation item={item} />
              </TableCell>
              <TableCell>
                <p className="truncate font-mono text-xs">{item.lotNumber ?? 'Không theo lô'}</p>
                <p className="text-muted-foreground text-xs">
                  {formatQualityStatus(item.qualityStatus)}
                </p>
              </TableCell>
              <TableCell className="text-right">
                <QuantityChange value={item.quantityChange} unitName={item.unitName} />
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatStockMovementQuantity(item.balanceAfter).replace('+', '')}{' '}
                {item.unitName ?? '—'}
              </TableCell>
              <TableCell className="min-w-0">
                <p className="truncate">{formatStockMovementReference(item.referenceType)}</p>
                <p
                  className="text-muted-foreground truncate font-mono text-xs"
                  title={item.referenceCode || item.referenceId}
                >
                  {item.referenceCode || formatReferenceId(item.referenceId)}
                </p>
              </TableCell>
              <TableCell
                className="truncate"
                title={item.performedByName || item.performedByUserId}
              >
                {item.performedByName || 'Người dùng chưa xác định'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
