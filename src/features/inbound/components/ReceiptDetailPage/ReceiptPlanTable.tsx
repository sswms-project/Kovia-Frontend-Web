import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptItem } from '../../types/inbound.types'

interface ReceiptPlanTableProps {
  readonly items: readonly GoodsReceiptItem[]
}

/** Vị trí quản lý đã cấu hình; số lượng là phần còn phải cất theo kế hoạch. */
export function ReceiptPlanTable({ items }: ReceiptPlanTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table className="min-w-[640px]">
        <TableHeader className="bg-card">
          <TableRow>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>Vị trí cấu hình</TableHead>
            <TableHead className="text-right">SL còn phải cất theo kế hoạch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.flatMap((item) =>
            item.putAwayPlan.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-muted-foreground font-mono text-xs">{item.productSKU}</p>
                </TableCell>
                <TableCell className="font-mono">
                  {line.isSystemDefaultSlot ? `Kệ ${line.rackCode}` : line.slotCode}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.quantity)} {item.baseUnitName}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
