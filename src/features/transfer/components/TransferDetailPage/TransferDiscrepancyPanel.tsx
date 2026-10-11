import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferDiscrepancy } from '../../types/transfer.types'
import {
  DISCREPANCY_TYPE_LABELS,
  RECEIPT_REASON_LABELS,
  labelOf,
} from '../../utils/transfer-format'

interface TransferDiscrepancyPanelProps {
  readonly discrepancies: readonly TransferDiscrepancy[]
  readonly canResolve: boolean
  readonly onResolve: (discrepancy: TransferDiscrepancy) => void
}

const RESOLUTION_LABELS: Record<string, string> = {
  LateReceipt: 'Nhận bổ sung',
  LossAdjustment: 'Ghi nhận thất thoát',
  DamageCase: 'Chuyển xử lý hàng hỏng',
}

export function TransferDiscrepancyPanel({
  discrepancies,
  canResolve,
  onResolve,
}: TransferDiscrepancyPanelProps) {
  if (discrepancies.length === 0) {
    return (
      <Empty className="border-0 p-6">
        <EmptyHeader>
          <EmptyTitle>Chưa có chênh lệch</EmptyTitle>
          <EmptyDescription>
            Hàng hỏng hoặc thiếu khi nhận sẽ xuất hiện tại đây để kho nhập xử lý.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <Table className="min-w-[860px]">
      <TableHeader>
        <TableRow>
          <TableHead>Mã hàng</TableHead>
          <TableHead>Tên hàng</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead className="text-right">Số lượng</TableHead>
          <TableHead className="text-right">Đã xử lý</TableHead>
          <TableHead>Nguyên nhân</TableHead>
          <TableHead>Tình trạng</TableHead>
          <TableHead>
            <span className="sr-only">Thao tác</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {discrepancies.map((discrepancy) => (
          <TableRow key={discrepancy.id}>
            <TableCell className="font-mono">{discrepancy.sku}</TableCell>
            <TableCell className="whitespace-normal">{discrepancy.productName}</TableCell>
            <TableCell>{DISCREPANCY_TYPE_LABELS[discrepancy.type]}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatQuantity(discrepancy.quantity)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatQuantity(discrepancy.resolvedQuantity)}
            </TableCell>
            <TableCell className="whitespace-normal">
              {labelOf(RECEIPT_REASON_LABELS, discrepancy.reasonCode)}
              {discrepancy.note ? ` · ${discrepancy.note}` : ''}
            </TableCell>
            <TableCell>
              {discrepancy.isOpen ? (
                <Badge variant="outline" className="text-warning">
                  Chưa xử lý
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {labelOf(RESOLUTION_LABELS, discrepancy.resolution, 'Đã xử lý')}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {canResolve && discrepancy.isOpen ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(discrepancy)}
                >
                  Xử lý
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
