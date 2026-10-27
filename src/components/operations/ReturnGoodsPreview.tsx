'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OperationalListPanel } from './OperationalListPanel'
import { OperationalPagination } from './OperationalPagination'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from './OperationalState'

export interface ReturnGoodsPreviewRow {
  readonly id: string
  readonly cells: readonly string[]
}

interface ReturnGoodsPreviewProps {
  readonly id: string
  readonly anchorId: string
  readonly expanded: boolean
  readonly selected: boolean
  readonly referenceCode?: string
  readonly description?: string
  readonly columns: readonly string[]
  readonly rows: readonly ReturnGoodsPreviewRow[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
}

export function ReturnGoodsPreview({
  id,
  anchorId,
  expanded,
  selected,
  referenceCode,
  description,
  columns,
  rows,
  isLoading,
  isError,
  onRetry,
}: ReturnGoodsPreviewProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const total = selected && !isLoading && !isError ? rows.length : 0
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
  const start = (currentPage - 1) * pageSize
  const visible = rows.slice(start, start + pageSize)
  return (
    <OperationalListPanel
      id={id}
      aria-label="Chi tiết hàng hóa trả lại"
      aria-busy={selected && isLoading && !isError}
      hidden={!expanded}
      className="max-md:[&>[data-slot=table-container]]:hidden"
    >
      <header
        id={anchorId}
        className="flex shrink-0 scroll-mt-20 flex-col gap-1 border-b px-3 py-2"
      >
        <div className="flex min-h-7 flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold">Chi tiết hàng hóa trả lại</h2>
          {referenceCode ? (
            <span className="text-muted-foreground font-mono text-xs">{referenceCode}</span>
          ) : null}
        </div>
        {description ? (
          <p className="text-muted-foreground text-xs wrap-anywhere">{description}</p>
        ) : null}
      </header>
      <p role="status" className="sr-only">
        {!selected
          ? 'Chưa chọn phiếu'
          : isError
            ? 'Không thể tải chi tiết hàng hóa'
            : isLoading
              ? 'Đang tải hàng hóa…'
              : `${referenceCode ?? ''}: ${rows.length} dòng hàng`}
      </p>
      {!selected ? (
        <OperationalEmptyState
          title="Chọn phiếu để xem hàng hóa"
          description="Chọn một dòng phiếu trong danh sách phía trên."
        />
      ) : isError ? (
        <OperationalErrorState title="Không thể tải chi tiết hàng hóa" onRetry={onRetry} />
      ) : isLoading ? (
        <OperationalLoadingState rows={2} />
      ) : rows.length === 0 ? (
        <OperationalEmptyState
          title="Phiếu chưa có hàng hóa"
          description="Không có dòng hàng để hiển thị."
        />
      ) : (
        <>
          <div data-slot="operational-list-body" className="divide-y md:hidden">
            {visible.map((row) => (
              <article key={row.id} className="flex flex-col gap-3 p-3">
                <div>
                  <h3 className="font-medium wrap-anywhere">{row.cells[1]}</h3>
                  <p className="text-muted-foreground font-mono text-xs wrap-anywhere">
                    {row.cells[0]}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  {columns.slice(2).map((column, index) => (
                    <div key={column} className="min-w-0">
                      <dt className="text-muted-foreground text-xs">{column}</dt>
                      <dd className="text-sm wrap-anywhere">{row.cells[index + 2]}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{start + index + 1}</TableCell>
                  {row.cells.map((cell, cellIndex) => (
                    <TableCell
                      key={columns[cellIndex]}
                      className="max-w-72 wrap-anywhere whitespace-normal tabular-nums"
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </OperationalListPanel>
  )
}
