'use client'

import { useState } from 'react'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { InboundGoodsPreviewRow } from '../../utils/inbound-goods-preview'

interface InboundGoodsPreviewProps {
  readonly rows: readonly InboundGoodsPreviewRow[]
  readonly selected: boolean
  readonly isLoading?: boolean
  readonly isError?: boolean
  readonly isReceipt?: boolean
  readonly onRetry?: () => void
}

export function InboundGoodsPreview({
  rows,
  selected,
  isLoading,
  isError,
  isReceipt,
  onRetry,
}: InboundGoodsPreviewProps) {
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
                    ? 'Chứng từ chưa có hàng hóa'
                    : 'Chọn chứng từ để xem hàng hóa'}
              </EmptyTitle>
              <EmptyDescription>
                {isError
                  ? 'Kiểm tra kết nối hoặc quyền truy cập rồi thử lại.'
                  : 'Chọn một dòng chứng từ trong danh sách phía trên.'}
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
  if (isLoading)
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
  return (
    <>
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Mã hàng</TableHead>
            <TableHead>Tên hàng</TableHead>
            <TooltipProvider>
              {[
                { label: 'ĐVT', fullName: 'Đơn vị tính chính', numeric: false },
                { label: 'ĐVQĐ', fullName: 'Đơn vị quy đổi', numeric: false },
                { label: 'SL yêu cầu', fullName: 'Số lượng yêu cầu', numeric: true },
                { label: 'SL thực nhận', fullName: 'Số lượng thực nhận', numeric: true },
              ].map(({ label, fullName, numeric }) => (
                <TableHead key={label} className={cn(numeric && 'text-right')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-label={fullName}
                        className="focus-visible:outline-ring cursor-help focus-visible:outline-1"
                      >
                        {label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{fullName}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TooltipProvider>
            {!isReceipt ? (
              <>
                <TableHead className="text-right">Đã đóng</TableHead>
                <TableHead className="text-right">Còn chờ nhận</TableHead>
              </>
            ) : (
              <>
                <TableHead>Vị trí cất</TableHead>
                <TableHead>Số lô</TableHead>
                <TableHead>Hạn sử dụng</TableHead>
              </>
            )}
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
              <TableCell className="text-right tabular-nums">
                {formatQuantity(row.requested)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatQuantity(row.received)}
              </TableCell>
              {!isReceipt ? (
                <>
                  <TableCell className="text-right tabular-nums">
                    {row.closed === undefined ? '—' : formatQuantity(row.closed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.remaining === undefined ? '—' : formatQuantity(row.remaining)}
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>
                    {row.locations.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {row.locations.map((location) => (
                          <li key={location.id}>
                            {location.label} · {formatQuantity(location.quantity)} {row.unit}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">Chưa cất hàng</span>
                    )}
                  </TableCell>
                  <TableCell>{row.lotNumber || '-'}</TableCell>
                  <TableCell>
                    {row.expiryDate ? formatOperationalDate(row.expiryDate) : '-'}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination}
    </>
  )
}
