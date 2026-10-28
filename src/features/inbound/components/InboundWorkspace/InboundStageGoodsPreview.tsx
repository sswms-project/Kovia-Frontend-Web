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
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import {
  INBOUND_STAGE_COLUMNS,
  type InboundGoodsStage,
  type InboundStageGoodsRow,
} from '../../utils/inbound-goods-preview'

interface InboundStageGoodsPreviewProps {
  readonly stage: InboundGoodsStage
  readonly rows: readonly InboundStageGoodsRow[]
  readonly selected: boolean
  readonly isLoading?: boolean
  readonly isError?: boolean
  readonly statusLabel?: string
  readonly onRetry?: () => void
}

function Quantity({ value }: { readonly value: number | undefined }) {
  return <>{value === undefined || !Number.isFinite(value) ? '—' : formatQuantity(value)}</>
}

function Plan({ row }: { readonly row: InboundStageGoodsRow }) {
  return (
    <div className="flex flex-col gap-1 whitespace-normal">
      {row.plan.length ? (
        row.plan.map((plan) => (
          <p key={plan.id}>
            {plan.label}: <Quantity value={plan.quantity} /> {row.unit}
          </p>
        ))
      ) : (
        <p>{row.planState}</p>
      )}
      {(row.kept ?? 0) > 0 ? (
        <p className="text-muted-foreground text-xs">
          Giữ tại khu nhận: <Quantity value={row.kept} /> {row.unit}
        </p>
      ) : null}
    </div>
  )
}

export function InboundStageGoodsPreview({
  stage,
  rows,
  selected,
  isLoading,
  isError,
  statusLabel,
  onRetry,
}: InboundStageGoodsPreviewProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const total = selected && !isLoading && !isError ? rows.length : 0
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
  const start = (currentPage - 1) * pageSize
  const visible = rows.slice(start, start + pageSize)
  const columns = INBOUND_STAGE_COLUMNS[stage]
  const ready = selected && !isLoading && !isError && rows.length > 0
  return (
    <>
      {statusLabel && selected ? (
        <p className="text-muted-foreground shrink-0 border-b px-3 py-2 text-xs" role="status">
          {statusLabel}
        </p>
      ) : null}
      {!ready ? (
        <div data-slot="operational-list-body">
          {selected && isLoading && !isError ? (
            <div className="p-3" aria-label="Đang tải hàng hóa">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="mt-2 h-12 w-full" />
            </div>
          ) : (
            <Empty className="h-full border-0 p-4">
              <EmptyHeader>
                <EmptyTitle>
                  {isError
                    ? 'Không thể tải hàng hóa'
                    : selected
                      ? 'Không có dòng hàng phù hợp'
                      : 'Chọn phiếu để xem hàng hóa'}
                </EmptyTitle>
                <EmptyDescription>
                  {isError
                    ? 'Kiểm tra kết nối hoặc quyền xem rồi thử lại.'
                    : 'Chọn dòng trong danh sách hoặc bấm Xem hàng hóa.'}
                </EmptyDescription>
              </EmptyHeader>
              {isError && onRetry ? (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Thử lại
                </Button>
              ) : null}
            </Empty>
          )}
        </div>
      ) : (
        <>
          <div data-slot="operational-list-body" className="md:hidden">
            {visible.map((row) => (
              <article
                key={row.id}
                className="flex min-w-0 flex-col gap-2 border-b p-3 last:border-b-0"
              >
                <h3 className="font-semibold wrap-anywhere">{row.name}</h3>
                <p className="font-mono text-xs" translate="no">
                  {row.sku}
                </p>
                <p className="text-muted-foreground text-xs">
                  ĐVT: {row.unit}
                  {row.conversion ? ` · ${row.conversion}` : ''}
                </p>
                {stage !== 'receiving' ? (
                  <p className="text-muted-foreground text-xs">
                    {row.lot ? `Lô ${row.lot}` : 'Không theo lô'} · HSD:{' '}
                    {row.expiry ? formatOperationalDate(row.expiry) : '—'}
                  </p>
                ) : null}
                <dl className="grid grid-cols-2 gap-2">
                  {columns.map((column) => (
                    <div key={column.key}>
                      <dt className="text-muted-foreground text-xs">{column.label}</dt>
                      <dd className="font-medium tabular-nums">
                        <Quantity value={row.quantities[column.key]} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {stage === 'putaway' ? (
                  <div className="border-t pt-2 text-sm">
                    <p className="mb-1 font-medium">Kế hoạch cất còn lại</p>
                    <Plan row={row} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <div data-slot="operational-list-body" className="hidden md:block">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Mã hàng</TableHead>
                  <TableHead>Tên hàng</TableHead>
                  <TableHead>ĐVT · Quy đổi</TableHead>
                  {stage !== 'receiving' ? <TableHead>Lô / HSD</TableHead> : null}
                  {columns.map((column) => (
                    <TableHead key={column.key} className="text-right">
                      {column.label}
                    </TableHead>
                  ))}
                  {stage === 'putaway' ? <TableHead>Kế hoạch cất còn lại</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>{start + index + 1}</TableCell>
                    <TableCell className="font-mono text-xs" translate="no">
                      {row.sku}
                    </TableCell>
                    <TableCell className="min-w-40 whitespace-normal">{row.name}</TableCell>
                    <TableCell>
                      <p>{row.unit}</p>
                      <p className="text-muted-foreground text-xs whitespace-normal">
                        {row.conversion ?? '—'}
                      </p>
                    </TableCell>
                    {stage !== 'receiving' ? (
                      <TableCell>
                        <p>{row.lot ?? 'Không theo lô'}</p>
                        <p className="text-muted-foreground text-xs">
                          {row.expiry ? formatOperationalDate(row.expiry) : '—'}
                        </p>
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell key={column.key} className="text-right tabular-nums">
                        <Quantity value={row.quantities[column.key]} />
                      </TableCell>
                    ))}
                    {stage === 'putaway' ? (
                      <TableCell className="max-w-96 min-w-64">
                        <Plan row={row} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      <OperationalPagination
        page={currentPage}
        pageSize={pageSize}
        totalCount={total}
        isPending={!selected || isLoading || isError}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </>
  )
}
