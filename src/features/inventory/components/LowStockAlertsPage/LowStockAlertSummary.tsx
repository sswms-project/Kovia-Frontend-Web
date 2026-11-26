import { AlertTriangle, CheckCircle2, CircleHelp, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LowStockAlert } from '../../types/low-stock-alert.types'
import { LOW_STOCK_FILTER_LABELS, LOW_STOCK_INACTIVE_NOTICE } from '../../utils/low-stock-alert'
export function LowStockAlertStatus({ status }: { readonly status: string }) {
  const Icon =
    status === 'Open'
      ? AlertTriangle
      : status === 'Acknowledged'
        ? UserCheck
        : status === 'Resolved'
          ? CheckCircle2
          : CircleHelp
  return (
    <Badge
      variant={status === 'Open' ? 'destructive' : status === 'Resolved' ? 'secondary' : 'outline'}
    >
      <Icon aria-hidden="true" />
      {['Open', 'Acknowledged', 'Resolved'].includes(status)
        ? LOW_STOCK_FILTER_LABELS[status]
        : 'Không xác định'}
    </Badge>
  )
}
export function LowStockAlertProduct({ item }: { readonly item: LowStockAlert }) {
  const inactiveProduct = item.productStatus && item.productStatus !== 'Active'
  const inactiveWarehouse = item.warehouseStatus && item.warehouseStatus !== 'Active'
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium break-words">
        {item.productName ?? 'Chưa có thông tin sản phẩm'}
      </span>
      <span className="text-muted-foreground text-xs break-all">
        {item.sku ?? 'Chưa có mã sản phẩm'}
      </span>
      {inactiveProduct ? <Badge variant="outline">Sản phẩm ngừng hoạt động</Badge> : null}
      {inactiveWarehouse ? <Badge variant="outline">Kho ngừng hoạt động</Badge> : null}
      {inactiveProduct || inactiveWarehouse ? (
        <span className="text-muted-foreground text-xs whitespace-normal">
          {LOW_STOCK_INACTIVE_NOTICE}
        </span>
      ) : null}
    </div>
  )
}
