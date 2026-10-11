import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { APP_ROUTES } from '@/routes/app-routes'
import type { ReplenishmentSuggestion } from '../../types/inventory.types'
import { formatInventoryQuantity } from '../../utils/inventory-format'

export function ReplenishmentList({
  items,
  onReview,
  canReview,
  canViewInbound,
}: {
  readonly items: readonly ReplenishmentSuggestion[]
  readonly onReview: (item: ReplenishmentSuggestion) => void
  readonly canReview: boolean
  readonly canViewInbound: boolean
}) {
  const [newCount, acceptedCount] = [
    items.filter((item) => item.status === 'New').length,
    items.filter((item) => item.status === 'Accepted').length,
  ]
  return (
    <>
      <p className="text-muted-foreground mb-2 shrink-0 text-xs">
        {newCount} chờ kiểm tra · {acceptedCount} đã chấp nhận. Nháp chưa làm thay đổi tồn kho.
      </p>
      <OperationalListPanel>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Mặt hàng / căn cứ',
                'Khả dụng',
                'Đang nhập',
                'Chờ cất',
                'Đã lên kế hoạch',
                'Mục tiêu',
                'Đề xuất',
                'Trạng thái / nháp',
              ].map((label) => (
                <TableHead key={label} className="bg-card sticky top-0 z-10 whitespace-nowrap">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-12 text-center">
                  Không có lượng thiếu cần lập nháp. Kiểm tra tồn, chính sách và kế hoạch nhập tại
                  tab Nhu cầu & sai số.
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="min-w-56">
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start px-0 text-left"
                    onClick={() => onReview(item)}
                  >
                    <span>
                      <span className="block font-medium">
                        {item.sku} · {item.productName}
                      </span>
                      <span className="text-muted-foreground block text-xs font-normal">
                        {item.explanation?.basis === 'Forecast'
                          ? 'Theo nhu cầu xuất'
                          : item.explanation
                            ? 'Theo chính sách tồn'
                            : 'Phiên cũ'}{' '}
                        · {item.explanation?.unitName || 'ĐVT cơ sở'}
                      </span>
                    </span>
                  </Button>
                </TableCell>
                {[
                  item.explanation?.availableQuantity,
                  item.explanation?.incomingQuantity,
                  item.explanation?.awaitingPutawayQuantity,
                  item.explanation?.plannedQuantity,
                  item.explanation?.targetQuantity,
                ].map((value, index) => (
                  <TableCell className="text-right tabular-nums" key={index}>
                    {value == null ? '—' : formatInventoryQuantity(value)}
                  </TableCell>
                ))}
                <TableCell className="text-primary text-right font-semibold tabular-nums">
                  {formatInventoryQuantity(item.adjustedQuantity ?? item.suggestedQuantity)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={item.status === 'Accepted' ? 'default' : 'outline'}>
                      {item.status === 'New'
                        ? 'Chờ kiểm tra'
                        : item.status === 'Accepted'
                          ? 'Đã kiểm tra'
                          : item.status === 'Rejected'
                            ? 'Đã từ chối'
                            : 'Hết hiệu lực'}
                    </Badge>
                    {item.status === 'New' && canReview ? (
                      <Button size="sm" variant="outline" onClick={() => onReview(item)}>
                        Kiểm tra nháp
                      </Button>
                    ) : null}
                    {item.inboundRequestId && canViewInbound ? (
                      <Button size="sm" variant="link" asChild>
                        <Link
                          href={{
                            pathname: APP_ROUTES.inboundRequestDetail(item.inboundRequestId),
                          }}
                        >
                          Mở nháp <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </OperationalListPanel>
    </>
  )
}
