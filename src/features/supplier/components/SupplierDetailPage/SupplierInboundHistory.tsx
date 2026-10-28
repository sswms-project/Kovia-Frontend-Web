'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalQuantityProgress } from '@/components/operations/OperationalCells'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InboundRequestStatusBadge } from '@/features/inbound-request/components/InboundRequestsPage/InboundRequestStatusBadge'
import type { InboundRequestSummary } from '@/features/inbound-request/types/inbound-request.types'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import { formatOperationalOptionalTime } from '@/lib/operational-date-time'
import { APP_ROUTES } from '@/routes/app-routes'

interface SupplierInboundHistoryProps {
  readonly items: readonly InboundRequestSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (size: number) => void
}

export function SupplierInboundHistory({
  items,
  totalCount,
  page,
  pageSize,
  isLoading,
  isFetching,
  isError,
  onRetry,
  onPageChange,
  onPageSizeChange,
}: SupplierInboundHistoryProps) {
  const ready = !isLoading && !isError
  return (
    <OperationalListPanel
      aria-label="Lịch sử yêu cầu nhập kho"
      className="min-h-80 shrink-0 rounded-none [&>[data-slot=table-container]]:max-h-96 max-md:[&>[data-slot=table-container]]:hidden"
      aria-busy={isLoading}
    >
      <h2 className="shrink-0 border-b p-3 text-sm font-semibold">Lịch sử yêu cầu nhập kho</h2>
      {isLoading ? (
        <OperationalLoadingState rows={3} />
      ) : isError ? (
        <OperationalErrorState title="Không thể tải lịch sử nhập kho" onRetry={onRetry} />
      ) : items.length === 0 ? (
        <OperationalEmptyState
          title="Nhà cung cấp chưa có yêu cầu nhập kho phù hợp"
          description="Danh sách chỉ hiển thị các yêu cầu bạn có quyền xem tại kho được phân công."
        />
      ) : (
        <>
          <div data-slot="operational-list-body" className="divide-y md:hidden">
            {items.map((item) => (
              <article key={item.id} className="flex flex-col gap-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    className="min-w-0 font-mono text-sm wrap-anywhere underline-offset-4 hover:underline focus-visible:underline"
                    href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
                  >
                    {item.inboundRequestCode}
                  </Link>
                  <InboundRequestStatusBadge status={item.status} />
                </div>
                <p className="text-sm wrap-anywhere">
                  Kho nhận: {item.warehouseName || 'Chưa xác định'}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Ngày tạo</dt>
                    <dd className="wrap-anywhere">{formatOperationalDateTime(item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ngày/giờ dự kiến</dt>
                    <dd className="wrap-anywhere">
                      {formatOperationalOptionalTime(item.expectedDate)}
                    </dd>
                  </div>
                </dl>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">Tiến độ nhận</p>
                  <OperationalQuantityProgress
                    done={item.receivedQuantity}
                    total={item.orderedQuantity}
                    doneText={formatQuantity(item.receivedQuantity)}
                    totalText={formatQuantity(item.orderedQuantity)}
                  />
                </div>
              </article>
            ))}
          </div>
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow>
                <TableHead>Mã yêu cầu</TableHead>
                <TableHead>Kho nhận</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tiến độ nhận</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Ngày/giờ dự kiến</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      className="font-mono underline-offset-4 hover:underline focus-visible:underline"
                      href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
                    >
                      {item.inboundRequestCode}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-60 wrap-anywhere whitespace-normal">
                    {item.warehouseName || 'Chưa xác định'}
                  </TableCell>
                  <TableCell>
                    <InboundRequestStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <OperationalQuantityProgress
                      done={item.receivedQuantity}
                      total={item.orderedQuantity}
                      doneText={formatQuantity(item.receivedQuantity)}
                      totalText={formatQuantity(item.orderedQuantity)}
                    />
                  </TableCell>
                  <TableCell>{formatOperationalDateTime(item.createdAt)}</TableCell>
                  <TableCell>{formatOperationalOptionalTime(item.expectedDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <OperationalPagination
        page={page}
        pageSize={pageSize}
        totalCount={ready ? totalCount : 0}
        isPending={isFetching || !ready}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </OperationalListPanel>
  )
}
