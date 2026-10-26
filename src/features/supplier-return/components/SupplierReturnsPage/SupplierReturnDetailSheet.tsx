'use client'

import { Check, PackageCheck, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatEligibilityStatus,
  formatInventoryQuantity,
  formatQualityStatus,
} from '@/features/inventory/utils/inventory-format'
import { formatStockIssueDate } from '@/features/stock-issue/utils/stock-issue-format'
import type { SupplierReturn } from '../../types/supplier-return.types'
import { SupplierReturnStatusBadge } from './SupplierReturnStatusBadge'

interface SupplierReturnDetailSheetProps {
  readonly item: SupplierReturn | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly canApprove: boolean
  readonly canSelfApprove?: boolean
  readonly canDispatch: boolean
  readonly currentUserId: string | null
  readonly onRetry: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly onApprove: (item: SupplierReturn, selfApprovalAcknowledged?: boolean) => void
  readonly onReject: (item: SupplierReturn) => void
  readonly onCancel: (item: SupplierReturn) => void
  readonly onDeliver: (item: SupplierReturn) => void
}

function Detail({ label, value }: { readonly label: string; readonly value: string | null }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  )
}

export function SupplierReturnDetailSheet({
  item,
  isLoading,
  isError,
  canApprove,
  canSelfApprove = false,
  canDispatch,
  currentUserId,
  onRetry,
  onOpenChange,
  onApprove,
  onReject,
  onCancel,
  onDeliver,
}: SupplierReturnDetailSheetProps) {
  const acknowledgementId = useId()
  const [acknowledgedVersion, setAcknowledgedVersion] = useState<string | null>(null)
  const versionKey = item?.version ? `${item.id}:${item.version}` : null
  const acknowledged = versionKey !== null && acknowledgedVersion === versionKey
  const isOpenStatus = item?.status === 'Pending' || item?.status === 'Approved'
  const isCreator = Boolean(item && currentUserId && item.createdById === currentUserId)
  const canCancel = isOpenStatus && (canApprove || isCreator)
  const canDecide = canApprove && item?.status === 'Pending'
  const canDeliver = canDispatch && item?.status === 'Approved'
  const showDelivered = item?.status === 'Completed'

  return (
    <Sheet
      open={Boolean(item) || isLoading || isError}
      onOpenChange={(open) => {
        if (!open) setAcknowledgedVersion(null)
        onOpenChange(open)
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{item?.code ?? 'Chi tiết phiếu trả hàng NCC'}</SheetTitle>
          <SheetDescription>
            {item
              ? `${item.supplierName} · ${item.warehouseName}`
              : 'Thông tin phiếu trả hàng NCC.'}
          </SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <OperationalLoadingState />
        ) : isError ? (
          <OperationalErrorState
            title="Không thể tải chi tiết phiếu trả hàng NCC"
            onRetry={onRetry}
          />
        ) : item ? (
          <div className="flex flex-col gap-4 px-4 pb-6">
            {isCreator && canApprove && canSelfApprove && item.status === 'Pending' ? (
              <label htmlFor={acknowledgementId} className="flex items-start gap-2 text-sm">
                <Checkbox
                  id={acknowledgementId}
                  checked={acknowledged}
                  disabled={!versionKey}
                  onCheckedChange={(checked) =>
                    setAcknowledgedVersion(checked === true ? versionKey : null)
                  }
                />
                {versionKey
                  ? 'Tôi xác nhận tự duyệt phiên bản phiếu này và chịu trách nhiệm về quyết định.'
                  : 'Vui lòng tải lại phiếu để xác nhận tự duyệt phiên bản mới nhất.'}
              </label>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <SupplierReturnStatusBadge status={item.status} />
              {canDecide || canCancel || canDeliver ? (
                <div className="ml-auto flex flex-wrap gap-2">
                  {canDecide ? (
                    <>
                      {!isCreator || canSelfApprove ? (
                        <Button
                          size="sm"
                          disabled={isCreator && !acknowledged}
                          onClick={() => {
                            setAcknowledgedVersion(null)
                            onApprove(item, isCreator && acknowledged)
                          }}
                        >
                          <Check data-icon="inline-start" />
                          {isCreator ? 'Tự duyệt' : 'Duyệt'}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="destructive" onClick={() => onReject(item)}>
                        <X data-icon="inline-start" />
                        Từ chối
                      </Button>
                    </>
                  ) : null}
                  {canDeliver ? (
                    <Button size="sm" onClick={() => onDeliver(item)}>
                      <PackageCheck data-icon="inline-start" />
                      Xác nhận đã giao
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button size="sm" variant="outline" onClick={() => onCancel(item)}>
                      Huỷ phiếu
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Lý do trả hàng" value={item.reason} />
              <Detail label="Ghi chú thương lượng" value={item.negotiationNote} />
              <Detail
                label="Người lập"
                value={`${item.createdByName} · ${formatStockIssueDate(item.createdAt)}`}
              />
              <Detail
                label="Người duyệt"
                value={
                  item.approvedByName && item.approvedAt
                    ? `${item.approvedByName} · ${formatStockIssueDate(item.approvedAt)}`
                    : null
                }
              />
              <Detail
                label="Người giao"
                value={
                  item.deliveredByName && item.deliveredAt
                    ? `${item.deliveredByName} · ${formatStockIssueDate(item.deliveredAt)}`
                    : null
                }
              />
              <Detail label="Lý do từ chối" value={item.rejectionReason} />
              <Detail label="Lý do huỷ" value={item.cancellationReason} />
            </dl>
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Vị trí / lô</TableHead>
                  <TableHead>Tình trạng</TableHead>
                  <TableHead className="text-right">Số lượng trả</TableHead>
                  {showDelivered ? <TableHead className="text-right">Đã giao</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.items.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <p>{line.productName}</p>
                      <p className="text-muted-foreground font-mono text-xs">{line.sku}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{line.slotCode}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {line.lotNumber ? `Lô ${line.lotNumber}` : 'Theo số lượng'}
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
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
