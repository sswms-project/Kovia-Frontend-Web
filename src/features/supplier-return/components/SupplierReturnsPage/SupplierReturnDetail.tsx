'use client'

import { Check, PackageCheck, X } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import { useId, useState, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ReturnDocumentSecondaryActions } from '@/components/operations/ReturnDocumentActions'
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
import {
  formatEligibilityStatus,
  formatInventoryLocation,
  formatInventoryQuantity,
  formatQualityStatus,
} from '@/features/inventory/utils/inventory-format'
import { formatStockIssueDate } from '@/features/stock-issue/utils/stock-issue-format'
import type { SupplierReturn } from '../../types/supplier-return.types'
import { SupplierReturnStatusBadge } from './SupplierReturnStatusBadge'

interface SupplierReturnDetailProps {
  readonly workPanel?: ReactNode
  readonly workStarted?: boolean
  readonly editingActions?: ReactNode
  readonly item: SupplierReturn | null
  readonly listHref: string
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly canApprove: boolean
  readonly canSelfApprove?: boolean
  readonly canDispatch: boolean
  readonly canViewSourceReceipt?: boolean
  readonly currentUserId: string | null
  readonly onRetry: () => void
  readonly onApprove: (item: SupplierReturn, selfApprovalAcknowledged?: boolean) => void
  readonly onReject: (item: SupplierReturn) => void
  readonly onCancel: (item: SupplierReturn) => void
  readonly onDeliver: (item: SupplierReturn) => void
}

export function SupplierReturnDetail({
  workPanel,
  workStarted = false,
  editingActions,
  item,
  listHref,
  isLoading,
  isError,
  isPending,
  canApprove,
  canSelfApprove = false,
  canDispatch,
  canViewSourceReceipt = false,
  currentUserId,
  onRetry,
  onApprove,
  onReject,
  onCancel,
  onDeliver,
}: SupplierReturnDetailProps) {
  const acknowledgementId = useId()
  const [acknowledgedVersion, setAcknowledgedVersion] = useState<string | null>(null)
  const versionKey = item?.version ? `${item.id}:${item.version}` : null
  const acknowledged = versionKey !== null && acknowledgedVersion === versionKey
  const isCreator = Boolean(item && currentUserId && item.createdById === currentUserId)
  const canCancel =
    !workStarted &&
    (item?.status === 'Pending' || item?.status === 'Approved') &&
    (canApprove || isCreator)
  const canDecide = canApprove && item?.status === 'Pending'
  const canDeliver = canDispatch && item?.status === 'Approved'
  const showDelivered = item?.status === 'Completed'
  const events = item
    ? [
        {
          action: 'Lập phiếu trả NCC',
          createdAt: item.createdAt,
          actorId: item.createdById,
          actorName: item.createdByName,
          fromState: null,
          toState: null,
          reason: null,
        },
        ...(item.approvedAt
          ? [
              {
                action: 'Duyệt phiếu trả NCC',
                createdAt: item.approvedAt,
                actorId: '',
                actorName: item.approvedByName ?? '',
                fromState: null,
                toState: null,
                reason: null,
              },
            ]
          : []),
        ...(item.deliveredAt
          ? [
              {
                action: 'Giao hàng trả NCC',
                createdAt: item.deliveredAt,
                actorId: '',
                actorName: item.deliveredByName ?? '',
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
      title="Trả hàng nhà cung cấp"
      code={item?.code}
      subtitle={
        item ? `${item.supplierName} · ${item.warehouseName}` : 'Thông tin hàng trả nhà cung cấp'
      }
      listHref={listHref}
      isLoading={isLoading}
      isError={isError || (!isLoading && !item)}
      onRetry={onRetry}
      status={item ? <SupplierReturnStatusBadge status={item.status} /> : null}
      actions={
        item ? (
          <>
            {editingActions}
            {canDecide && (!isCreator || canSelfApprove) ? (
              <Button
                disabled={isPending || (isCreator && !acknowledged)}
                onClick={() => {
                  setAcknowledgedVersion(null)
                  onApprove(item, isCreator && acknowledged)
                }}
              >
                <Check aria-hidden="true" />
                {isCreator ? 'Tự duyệt' : 'Duyệt'}
              </Button>
            ) : null}
            {canDecide ? (
              <Button variant="outline" disabled={isPending} onClick={() => onReject(item)}>
                <X aria-hidden="true" />
                Từ chối
              </Button>
            ) : null}
            {canDeliver ? (
              <Button disabled={isPending} onClick={() => onDeliver(item)}>
                <PackageCheck aria-hidden="true" />
                Xác nhận đã giao
              </Button>
            ) : null}
            {canCancel ? (
              <ReturnDocumentSecondaryActions disabled={isPending || isError}>
                <DropdownMenuItem variant="destructive" onSelect={() => onCancel(item)}>
                  <X aria-hidden="true" />
                  Huỷ phiếu
                </DropdownMenuItem>
              </ReturnDocumentSecondaryActions>
            ) : null}
          </>
        ) : null
      }
      info={
        item ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReturnDetailField label="Nhà cung cấp">{item.supplierName}</ReturnDetailField>
            <ReturnDetailField label="Kho xuất trả">{item.warehouseName}</ReturnDetailField>
            <ReturnDetailField label="Phiếu nhận hàng nguồn">
              {canViewSourceReceipt && item.sourceGoodsReceiptId ? (
                // The centralized helper builds a dynamic route; Next cannot infer its literal type.
                <Link
                  className="underline underline-offset-4"
                  href={APP_ROUTES.goodsReceiptDetail(item.sourceGoodsReceiptId) as Route}
                >
                  {item.sourceGoodsReceiptCode ?? 'Xem phiếu nhận hàng'}
                </Link>
              ) : (
                (item.sourceGoodsReceiptCode ?? 'Phiếu cũ/chưa gắn nguồn')
              )}
            </ReturnDetailField>
            <ReturnDetailField label="Người lập">{item.createdByName}</ReturnDetailField>
            <ReturnDetailField label="Ngày lập">
              {formatStockIssueDate(item.createdAt)}
            </ReturnDetailField>
            <ReturnDetailField label="Lý do trả">{item.reason}</ReturnDetailField>
            <ReturnDetailField label="Ghi chú thương lượng">
              {item.negotiationNote ?? 'Không có'}
            </ReturnDetailField>
            {item.rejectionReason ? (
              <ReturnDetailField label="Lý do từ chối">{item.rejectionReason}</ReturnDetailField>
            ) : null}
            {item.cancellationReason ? (
              <ReturnDetailField label="Lý do hủy">{item.cancellationReason}</ReturnDetailField>
            ) : null}
          </dl>
        ) : null
      }
    >
      {item ? (
        <>
          {workPanel}
          {isCreator && canDecide && canSelfApprove ? (
            <label
              htmlFor={acknowledgementId}
              className="bg-card flex items-start gap-3 border p-3 text-sm"
            >
              <Checkbox
                className="mt-0.5 shrink-0"
                id={acknowledgementId}
                checked={acknowledged}
                disabled={!versionKey || isPending}
                onCheckedChange={(checked) =>
                  setAcknowledgedVersion(checked === true ? versionKey : null)
                }
              />
              {versionKey
                ? 'Tôi xác nhận tự duyệt phiên bản phiếu này và chịu trách nhiệm về quyết định.'
                : 'Vui lòng tải lại phiếu để xác nhận tự duyệt phiên bản mới nhất.'}
            </label>
          ) : null}
          <section
            className="bg-card min-w-0 border"
            aria-labelledby="supplier-return-lines-heading"
          >
            <h2 id="supplier-return-lines-heading" className="border-b px-4 py-3 font-semibold">
              Hàng hóa trả NCC{' '}
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
                  <p className="text-sm wrap-anywhere">{formatInventoryLocation(line)}</p>
                  <dl className="grid grid-cols-2 gap-3">
                    <ReturnDetailField label="Số lượng trả">
                      {formatInventoryQuantity(line.quantity)} {line.unit}
                    </ReturnDetailField>
                    <ReturnDetailField label="Lô hàng">
                      {line.lotNumber ?? 'Không theo lô'}
                    </ReturnDetailField>
                    <ReturnDetailField label="Chất lượng">
                      {formatQualityStatus(line.qualityStatus)}
                    </ReturnDetailField>
                    <ReturnDetailField label="Tình trạng tồn">
                      {formatEligibilityStatus(line.eligibilityStatus)}
                    </ReturnDetailField>
                    {showDelivered ? (
                      <ReturnDetailField label="Đã giao">
                        {formatInventoryQuantity(line.deliveredQuantity ?? 0)} {line.unit}
                      </ReturnDetailField>
                    ) : null}
                  </dl>
                </article>
              ))}
            </div>
            <div className="max-md:hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hàng hóa</TableHead>
                    <TableHead>Vị trí / Lô hàng</TableHead>
                    <TableHead>Tình trạng</TableHead>
                    <TableHead className="text-right">Số lượng trả</TableHead>
                    {showDelivered ? <TableHead className="text-right">Đã giao</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.items.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="max-w-80 wrap-anywhere whitespace-normal">
                        <p>{line.productName}</p>
                        <p className="text-muted-foreground font-mono text-xs">{line.sku}</p>
                      </TableCell>
                      <TableCell className="max-w-72 wrap-anywhere whitespace-normal">
                        <p>{formatInventoryLocation(line)}</p>
                        <p className="text-muted-foreground text-xs">
                          {line.lotNumber ?? 'Không theo lô'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{formatQualityStatus(line.qualityStatus)}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatEligibilityStatus(line.eligibilityStatus)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatInventoryQuantity(line.quantity)} {line.unit}
                      </TableCell>
                      {showDelivered ? (
                        <TableCell className="text-right">
                          {formatInventoryQuantity(line.deliveredQuantity ?? 0)} {line.unit}
                        </TableCell>
                      ) : null}
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
