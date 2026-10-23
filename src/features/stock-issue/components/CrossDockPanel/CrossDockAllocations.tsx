import type { z } from 'zod'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { crossDockPlanSchema } from '../../schemas/cross-dock.schema'

type Allocation = z.infer<typeof crossDockPlanSchema>['allocations'][number]

interface CrossDockAllocationsProps {
  readonly allocations: readonly Allocation[]
}

function AllocationReason({ allocation }: { readonly allocation: Allocation }) {
  return (
    <details className="mt-1 text-xs">
      <summary className="text-primary focus-visible:outline-ring cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        Chi tiết phân bổ
      </summary>
      <p className="text-muted-foreground mt-2 break-words whitespace-normal">
        {allocation.directFromReceiving ? 'Đi thẳng từ khu nhận · ' : ''}
        {allocation.reason}
      </p>
    </details>
  )
}

export function CrossDockAllocations({ allocations }: CrossDockAllocationsProps) {
  if (allocations.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        Chưa có nguồn hàng được đề xuất trong kế hoạch này.
      </p>
    )

  return (
    <>
      <ul aria-label="Nguồn hàng đề xuất trên điện thoại" className="divide-y border md:hidden">
        {allocations.map((allocation) => (
          <li
            key={`${allocation.itemId}:${allocation.inventoryStockId}`}
            className="flex min-w-0 flex-col gap-3 p-3"
          >
            <div className="min-w-0 break-words">
              <p className="text-sm font-medium">{allocation.productName}</p>
              <p className="text-muted-foreground font-mono text-xs" translate="no">
                {allocation.sku}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="min-w-0">
                <dt className="text-muted-foreground">SL đề xuất</dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {formatQuantity(allocation.quantity)} đơn vị cơ sở
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Vị trí lấy</dt>
                <dd className="mt-1 break-words">{allocation.sourcePath || 'Chưa có vị trí'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Lô</dt>
                <dd className="mt-1 break-words">{allocation.lotNumber ?? 'Không theo lô'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Hạn dùng</dt>
                <dd className="mt-1">
                  {allocation.expiryDate
                    ? formatOperationalDate(allocation.expiryDate)
                    : 'Không áp dụng'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Cách chọn</dt>
                <dd className="mt-1">
                  {allocation.expiryDate ? 'FEFO' : 'FIFO'}
                  {allocation.directFromReceiving ? ' · Đi thẳng từ khu nhận' : ''}
                </dd>
              </div>
            </dl>
            <AllocationReason allocation={allocation} />
          </li>
        ))}
      </ul>
      <div className="hidden min-w-0 border md:block [&>[data-slot=table-container]]:max-h-96 [&>[data-slot=table-container]]:overflow-auto">
        <Table aria-label="Nguồn hàng đề xuất" className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Sản phẩm</TableHead>
              <TableHead scope="col" className="text-right">
                SL đề xuất
              </TableHead>
              <TableHead scope="col">Vị trí lấy</TableHead>
              <TableHead scope="col">Lô</TableHead>
              <TableHead scope="col">Hạn dùng</TableHead>
              <TableHead scope="col">Cách chọn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow
                key={`${allocation.itemId}:${allocation.inventoryStockId}`}
                className="align-top"
              >
                <TableCell className="max-w-64 min-w-36 align-top break-words whitespace-normal">
                  <p className="font-medium">{allocation.productName}</p>
                  <p className="text-muted-foreground mt-1 font-mono" translate="no">
                    {allocation.sku}
                  </p>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  <p className="font-medium">{formatQuantity(allocation.quantity)}</p>
                  <p className="text-muted-foreground mt-1">đơn vị cơ sở</p>
                </TableCell>
                <TableCell className="max-w-56 min-w-28 align-top break-words whitespace-normal">
                  {allocation.sourcePath || 'Chưa có vị trí'}
                </TableCell>
                <TableCell className="max-w-40 align-top break-words whitespace-normal">
                  {allocation.lotNumber ?? 'Không theo lô'}
                </TableCell>
                <TableCell className="align-top">
                  {allocation.expiryDate
                    ? formatOperationalDate(allocation.expiryDate)
                    : 'Không áp dụng'}
                </TableCell>
                <TableCell className="max-w-64 min-w-36 align-top whitespace-normal">
                  <p className="font-medium">{allocation.expiryDate ? 'FEFO' : 'FIFO'}</p>
                  {allocation.directFromReceiving ? (
                    <p className="text-muted-foreground mt-1">Đi thẳng từ khu nhận</p>
                  ) : null}
                  <AllocationReason allocation={allocation} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
