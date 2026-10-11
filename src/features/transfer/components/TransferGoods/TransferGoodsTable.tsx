'use client'

import { useState } from 'react'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InboundColumnLabel } from '@/features/inbound/components/InboundWorkspace'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { cn } from '@/lib/utils'
import type { TransferDiscrepancyState, TransferGoodsRow } from '../../utils/transfer-goods-rows'

const DISCREPANCY_LABELS: Record<TransferDiscrepancyState, string> = {
  none: '—',
  open: 'Chưa xử lý',
  resolved: 'Đã xử lý',
}

const COLUMNS = [
  { label: 'SL yêu cầu', description: 'Số lượng yêu cầu điều chuyển theo ĐVT chính' },
  { label: 'Chưa vào đợt', description: 'Phần chưa được chia vào đợt xuất nào' },
  { label: 'Đã lấy', description: 'Đã lấy ra khỏi vị trí, chưa xuất khỏi kho' },
  { label: 'Đã xuất', description: 'Đã xuất khỏi kho xuất' },
  { label: 'Nhận tốt', description: 'Đã nhận tốt vào kho nhập' },
  { label: 'Hỏng', description: 'Nhận vào kho nhập dưới dạng hàng hỏng' },
  { label: 'Thiếu', description: 'Thiếu khi nhận, chờ hoặc đã được xử lý' },
  { label: 'Dừng', description: 'Phần đã dừng, không chuyển nữa' },
] as const

interface TransferGoodsTableProps {
  readonly rows: readonly TransferGoodsRow[]
  readonly selected: boolean
  readonly isLoading?: boolean
  readonly isError?: boolean
  readonly onRetry?: () => void
  /** Cột "Vị trí đến": chỉ chủ và người kho nhập. */
  readonly showDestinationSlot?: boolean
  /** Cột "Phân bổ lấy hàng": chỉ chủ và người kho xuất. */
  readonly showAllocation?: boolean
}

export function TransferGoodsTable({
  rows,
  selected,
  isLoading,
  isError,
  onRetry,
  showDestinationSlot = false,
  showAllocation = false,
}: TransferGoodsTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalCount = selected && !isLoading && !isError ? rows.length : 0
  const currentPage = Math.min(page, Math.max(1, Math.ceil(totalCount / pageSize)))
  const start = (currentPage - 1) * pageSize
  const pagination = (
    <OperationalPagination
      page={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
      isPending={!selected || isLoading || isError}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size)
        setPage(1)
      }}
    />
  )

  if (!selected || isError || (!isLoading && rows.length === 0)) {
    return (
      <>
        <div data-slot="operational-list-body">
          <Empty className="h-full border-0 p-4">
            <EmptyHeader>
              <EmptyTitle>
                {isError
                  ? 'Không thể tải chi tiết hàng hóa'
                  : selected
                    ? 'Phiếu chưa có hàng hóa'
                    : 'Chọn phiếu để xem hàng hóa'}
              </EmptyTitle>
              <EmptyDescription>
                {isError
                  ? 'Kiểm tra kết nối hoặc quyền truy cập rồi thử lại.'
                  : 'Chọn một dòng phiếu trong danh sách phía trên.'}
              </EmptyDescription>
            </EmptyHeader>
            {isError && onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Thử lại
              </Button>
            ) : null}
          </Empty>
        </div>
        {pagination}
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <div
          data-slot="operational-list-body"
          aria-label="Đang tải chi tiết hàng hóa"
          className="p-3"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        {pagination}
      </>
    )
  }

  return (
    <>
      <Table className="min-w-[1500px]">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Mã hàng</TableHead>
            <TableHead>Tên hàng</TableHead>
            <TableHead>
              <InboundColumnLabel label="ĐVT" description="Đơn vị tính chính" />
            </TableHead>
            <TableHead>
              <InboundColumnLabel label="ĐVQĐ" description="Đơn vị quy đổi người tạo đã chọn" />
            </TableHead>
            {showAllocation ? (
              <TableHead>
                <InboundColumnLabel
                  label="Phân bổ lấy hàng"
                  description="Hệ thống giữ chỗ hàng ở vị trí và lô nào của kho xuất"
                />
              </TableHead>
            ) : null}
            {showDestinationSlot ? (
              <TableHead>
                <InboundColumnLabel
                  label="Vị trí đến"
                  description="Vị trí cất hàng gợi ý ở kho nhập"
                />
              </TableHead>
            ) : null}
            {COLUMNS.map((column) => (
              <TableHead key={column.label} className="text-right">
                <InboundColumnLabel label={column.label} description={column.description} />
              </TableHead>
            ))}
            <TableHead>Chênh lệch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(start, start + pageSize).map((row, index) => (
            <TableRow key={row.id}>
              <TableCell>{start + index + 1}</TableCell>
              <TableCell className="font-mono">{row.sku}</TableCell>
              <TableCell className="whitespace-normal">{row.name}</TableCell>
              <TableCell>{row.unit}</TableCell>
              <TableCell>{row.conversion ?? '—'}</TableCell>
              {showAllocation ? (
                <TableCell className="whitespace-normal">
                  {row.allocations && row.allocations.length > 0 ? (
                    <ul className="grid gap-0.5 text-xs">
                      {row.allocations.map((allocation) => (
                        <li key={allocation}>{allocation}</li>
                      ))}
                    </ul>
                  ) : (
                    '—'
                  )}
                </TableCell>
              ) : null}
              {showDestinationSlot ? (
                <TableCell className="whitespace-normal">{row.destinationSlot ?? '—'}</TableCell>
              ) : null}
              {[
                row.requested,
                row.unbatched,
                row.picked,
                row.dispatched,
                row.receivedGood,
                row.damaged,
                row.missing,
                row.stopped,
              ].map((value, columnIndex) => (
                <TableCell
                  key={COLUMNS[columnIndex]?.label}
                  className={cn(
                    'text-right tabular-nums',
                    value === 0 && columnIndex > 0 && 'text-muted-foreground'
                  )}
                >
                  {formatQuantity(value)}
                </TableCell>
              ))}
              <TableCell className={cn(row.discrepancy === 'open' && 'text-warning font-medium')}>
                {DISCREPANCY_LABELS[row.discrepancy]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination}
    </>
  )
}
