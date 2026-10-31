'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Route } from 'next'
import { Check, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ReturnDocumentFrame,
  ReturnDetailField,
  ReturnDocumentHistory,
  returnHistoryEvents,
} from '@/components/operations/ReturnDocumentFrame'
import { APP_ROUTES } from '@/routes/app-routes'
import type { GoodsReturnRequestSummary } from '../../types/stock-issue.types'
import {
  RETURN_ITEM_CONDITION_LABELS,
  formatStockIssueQuantity,
  formatStockIssueDate,
} from '../../utils/stock-issue-format'
import { GoodsReturnRequestStatusBadge } from './GoodsReturnRequestStatusBadge'

interface GoodsReturnRequestDetailProps {
  readonly editingActions?: ReactNode
  readonly item: GoodsReturnRequestSummary | null
  readonly listHref: string
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly canApprove: boolean
  readonly canSelfApprove: boolean
  readonly canRestock: boolean
  readonly currentUserId: string | null
  readonly onRetry: () => void
  readonly onApprove: (item: GoodsReturnRequestSummary) => void
  readonly onReject: (item: GoodsReturnRequestSummary) => void
  readonly onRestock: (item: GoodsReturnRequestSummary) => void
}

export function GoodsReturnRequestDetail({
  editingActions,
  item,
  listHref,
  isLoading,
  isError,
  isPending,
  canApprove,
  canSelfApprove,
  canRestock,
  currentUserId,
  onRetry,
  onApprove,
  onReject,
  onRestock,
}: GoodsReturnRequestDetailProps) {
  const mayDecide =
    item?.status === 'Requested' &&
    canApprove &&
    (item.createdBy !== currentUserId || canSelfApprove)
  const events = item
    ? [
        {
          action: 'Tạo yêu cầu khách trả hàng',
          createdAt: item.createdAt,
          actorId: item.createdBy,
          actorName: item.createdByName ?? '',
          fromState: null,
          toState: null,
          reason: null,
        },
        ...(item.approvedAt
          ? [
              {
                action: 'Duyệt yêu cầu khách trả hàng',
                createdAt: item.approvedAt,
                actorId: item.approvedBy ?? '',
                actorName: item.approvedByName ?? '',
                fromState: null,
                toState: null,
                reason: null,
              },
            ]
          : []),
      ]
    : []
  return (
    <ReturnDocumentFrame
      title="Khách trả hàng"
      code={item?.goodsReturnRequestCode}
      subtitle={
        item
          ? [item.recipientName, item.warehouseName, `Yêu cầu xuất ${item.stockIssueRequestCode}`]
              .filter(Boolean)
              .join(' · ')
          : 'Thông tin hàng khách trả về kho'
      }
      listHref={listHref}
      isLoading={isLoading}
      isError={isError || (!isLoading && !item)}
      onRetry={onRetry}
      status={item ? <GoodsReturnRequestStatusBadge status={item.status} /> : null}
      actions={
        item ? (
          <>
            {editingActions}
            {mayDecide ? (
              <>
                <Button disabled={isPending} onClick={() => onApprove(item)}>
                  <Check aria-hidden="true" />
                  Duyệt yêu cầu
                </Button>
                <Button variant="outline" disabled={isPending} onClick={() => onReject(item)}>
                  <X aria-hidden="true" />
                  Từ chối
                </Button>
              </>
            ) : null}
            {canRestock && item.status === 'Approved' ? (
              <Button disabled={isPending} onClick={() => onRestock(item)}>
                <Undo2 aria-hidden="true" />
                Nhập lại kho
              </Button>
            ) : null}
          </>
        ) : null
      }
      info={
        item ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReturnDetailField label="Khách hàng">{item.recipientName}</ReturnDetailField>
            <ReturnDetailField label="Kho nhận">{item.warehouseName}</ReturnDetailField>
            <ReturnDetailField label="Yêu cầu xuất kho">
              <Link
                className="font-mono underline-offset-4 hover:underline"
                href={APP_ROUTES.stockIssueRequestDetail(item.stockIssueRequestId) as Route}
              >
                {item.stockIssueRequestCode}
              </Link>
            </ReturnDetailField>
            <ReturnDetailField label="Người lập">{item.createdByName}</ReturnDetailField>
            <ReturnDetailField label="Ngày lập">
              {formatStockIssueDate(item.createdAt)}
            </ReturnDetailField>
            <ReturnDetailField label="Lý do trả">{item.reason}</ReturnDetailField>
            {item.rejectionReason ? (
              <ReturnDetailField label="Lý do từ chối">{item.rejectionReason}</ReturnDetailField>
            ) : null}
          </dl>
        ) : null
      }
    >
      {item ? (
        <>
          <section className="bg-card min-w-0 border" aria-labelledby="return-lines-heading">
            <h2 id="return-lines-heading" className="border-b px-4 py-3 font-semibold">
              Hàng hóa trả lại{' '}
              <span className="text-muted-foreground text-sm font-normal">
                · {item.items.length} dòng
              </span>
            </h2>
            <div className="divide-y md:hidden">
              {item.items.map((line) => (
                <article className="flex flex-col gap-3 p-4" key={line.id}>
                  <div>
                    <h3 className="font-medium wrap-anywhere">{line.productName}</h3>
                    <p className="text-muted-foreground font-mono text-xs wrap-anywhere">
                      {line.sku}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3">
                    <ReturnDetailField label="Số lượng trả">
                      {formatStockIssueQuantity(line.quantity)} {line.unitName}
                    </ReturnDetailField>
                    <ReturnDetailField label="Tình trạng">
                      {RETURN_ITEM_CONDITION_LABELS[line.actualCondition ?? line.condition]}
                    </ReturnDetailField>
                    <ReturnDetailField label="Lô hàng">
                      {line.lotNumber ?? 'Không theo lô'}
                    </ReturnDetailField>
                    <ReturnDetailField label="Vị trí nhập lại">
                      {line.restockLocation}
                    </ReturnDetailField>
                  </dl>
                </article>
              ))}
            </div>
            <div className="max-md:hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hàng hóa</TableHead>
                    <TableHead>Lô hàng</TableHead>
                    <TableHead>Tình trạng</TableHead>
                    <TableHead className="text-right">Số lượng trả</TableHead>
                    <TableHead>Vị trí nhập lại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.items.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="max-w-80 wrap-anywhere whitespace-normal">
                        <p>{line.productName}</p>
                        <p className="text-muted-foreground font-mono text-xs">{line.sku}</p>
                      </TableCell>
                      <TableCell className="max-w-48 wrap-anywhere whitespace-normal">
                        {line.lotNumber ?? 'Không theo lô'}
                      </TableCell>
                      <TableCell>
                        {RETURN_ITEM_CONDITION_LABELS[line.actualCondition ?? line.condition]}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatStockIssueQuantity(line.quantity)} {line.unitName}
                      </TableCell>
                      <TableCell className="max-w-72 wrap-anywhere whitespace-normal">
                        {line.restockLocation ?? 'Chưa ghi nhận'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
          <ReturnDocumentHistory
            events={item.history ? returnHistoryEvents(item.history) : events}
          />
        </>
      ) : null}
    </ReturnDocumentFrame>
  )
}
