'use client'

import { useId, useState, type ReactNode } from 'react'
import { OperationalMasterDetail } from '@/components/operations/OperationalMasterDetail'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalEmptyState,
  OperationalErrorState,
} from '@/components/operations/OperationalState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import {
  formatStockIssueQuantity,
  stockIssueItemFactor,
  stockIssuePickedEntered,
} from '../../utils/stock-issue-format'
import { formatStockIssueLocation } from '../../utils/stock-issue-location'

interface StockIssueGoodsWorkspaceProps {
  readonly children: ReactNode
  readonly detail: ReactNode
  readonly referenceCode?: string
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

export function StockIssueGoodsWorkspace({
  children,
  detail,
  referenceCode,
  expanded,
  onExpandedChange,
}: StockIssueGoodsWorkspaceProps) {
  const detailId = useId()
  return (
    <OperationalMasterDetail
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      detailId={detailId}
      detail={
        <OperationalListPanel id={detailId} aria-label="Chi tiết hàng hóa" hidden={!expanded}>
          <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2">
            <h2 className="text-sm font-semibold">Chi tiết hàng hóa</h2>
            {referenceCode ? (
              <span className="text-muted-foreground font-mono text-xs" translate="no">
                {referenceCode}
              </span>
            ) : null}
          </header>
          {detail}
        </OperationalListPanel>
      }
    >
      {children}
    </OperationalMasterDetail>
  )
}

interface StockIssueGoodsPreviewProps {
  readonly order?: StockIssueRequestSummary
  readonly selected: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
}

export function StockIssueGoodsPreview({
  order,
  selected,
  isLoading,
  isError,
  onRetry,
}: StockIssueGoodsPreviewProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const items = selected && !isLoading && !isError ? (order?.items ?? []) : []
  const currentPage = Math.min(page, Math.max(1, Math.ceil(items.length / pageSize)))
  const start = (currentPage - 1) * pageSize
  return (
    <>
      {!selected ? (
        <div data-slot="operational-list-body">
          <OperationalEmptyState
            title="Chọn phiếu để xem hàng hóa"
            description="Chọn một dòng phiếu trong danh sách phía trên."
          />
        </div>
      ) : isError ? (
        <div data-slot="operational-list-body">
          <OperationalErrorState title="Không thể tải chi tiết hàng hóa" onRetry={onRetry} />
        </div>
      ) : isLoading ? (
        <div
          data-slot="operational-list-body"
          aria-label="Đang tải chi tiết hàng hóa"
          className="p-3"
        >
          <Skeleton className="h-10 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div data-slot="operational-list-body">
          <OperationalEmptyState
            title="Phiếu chưa có hàng hóa"
            description="Phiếu được chọn chưa có dòng hàng."
          />
        </div>
      ) : (
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              {[
                '#',
                'Mã hàng',
                'Tên hàng',
                'Đơn vị yêu cầu',
                'Quy đổi về ĐVT cơ sở',
                'SL yêu cầu',
                'Đã lấy',
                'Chưa lấy',
                'Nguồn lấy · Lô',
              ].map((label, index) => (
                <TableHead
                  key={label}
                  className={index >= 5 && index <= 7 ? 'text-right' : undefined}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(start, start + pageSize).map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>{start + index + 1}</TableCell>
                <TableCell className="font-mono" translate="no">
                  {item.sku}
                </TableCell>
                <TableCell className="max-w-64 wrap-anywhere whitespace-normal">
                  {item.productName}
                </TableCell>
                <TableCell>{item.enteredUnitName}</TableCell>
                <TableCell>
                  1 {item.enteredUnitName} = {formatStockIssueQuantity(item.conversionFactor)} đơn
                  vị cơ sở
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatStockIssueQuantity(item.enteredQuantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatStockIssueQuantity(stockIssuePickedEntered(item))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatStockIssueQuantity(
                    Math.max(0, item.quantity - item.pickedQuantity) / stockIssueItemFactor(item)
                  )}
                </TableCell>
                <TableCell className="max-w-80 wrap-anywhere whitespace-normal">
                  {item.pickLocations.length ? (
                    <ul className="grid gap-1 text-xs">
                      {item.pickLocations.map((location, locationIndex) => (
                        <li key={`${location.inventoryStockId}-${locationIndex}`}>
                          <span translate="no">{formatStockIssueLocation(location)}</span>
                          {location.lotNumber ? ` · Lô ${location.lotNumber}` : ''} ·{' '}
                          {formatStockIssueQuantity(location.reservedQuantity)} đơn vị cơ sở còn giữ
                        </li>
                      ))}
                    </ul>
                  ) : item.pickDetails.length ? (
                    <ul className="grid gap-1 text-xs">
                      {item.pickDetails.map((pick) => (
                        <li key={pick.id}>
                          <span translate="no">{formatStockIssueLocation(pick)}</span>
                          {pick.lotNumber ? ` · Lô ${pick.lotNumber}` : ''} · Đã lấy{' '}
                          {formatStockIssueQuantity(pick.pickedQuantity)} đơn vị cơ sở
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Chưa có nguồn lấy được giữ chỗ'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <OperationalPagination
        page={currentPage}
        pageSize={pageSize}
        totalCount={items.length}
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
