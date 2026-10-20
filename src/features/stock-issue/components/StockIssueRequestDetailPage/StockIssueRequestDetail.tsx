'use client'

import {
  ArrowLeft,
  Ban,
  Edit3,
  PackageX,
  Printer,
  ScanBarcode,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type {
  StockIssueCapabilities,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../../types/stock-issue.types'
import {
  canCancelStockIssueRequest,
  canEditStockIssueRequest,
  canRecordStockPicking,
} from '../../utils/stock-issue-format'
import {
  StockIssueAttachmentList,
  StockIssueAuditTimeline,
  StockIssuePickerAssignment,
  StockIssueRequestStatusBadge,
  StockIssueStatusStepper,
  type PickerOption,
} from '../StockIssueRequestsPage'
import { StockIssueRequestLines } from './StockIssueRequestLines'
import { StockIssueRequestOverview } from './StockIssueRequestOverview'

interface StockIssueRequestDetailProps {
  readonly order: StockIssueRequestSummary
  readonly capabilities: StockIssueCapabilities
  readonly handlers: StockIssueRowActionHandlers
  readonly pickerOptions: readonly PickerOption[]
  readonly isAssigningPicker: boolean
  readonly isRemovingPick: boolean
  readonly onAssignPicker: (staffId: string) => void
  readonly onRemovePickDetail: (pickDetailId: string) => void
}

export function StockIssueRequestDetail({
  order,
  capabilities,
  handlers,
  pickerOptions,
  isAssigningPicker,
  isRemovingPick,
  onAssignPicker,
  onRemovePickDetail,
}: StockIssueRequestDetailProps) {
  const canPickNow = capabilities.canPick && canRecordStockPicking(order.status)
  const canReassignPicker =
    capabilities.canAssignPicker &&
    (order.status === 'Pending' ||
      order.status === 'ReleasedForPicking' ||
      order.status === 'Picking')
  const canRemovePick =
    capabilities.canPick &&
    (order.status === 'ReleasedForPicking' ||
      order.status === 'Picking' ||
      order.status === 'Picked')

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href={APP_ROUTES.stockIssueRequests as Route} aria-label="Quay lại danh sách">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-semibold break-all" translate="no">
                {order.stockIssueRequestCode}
              </h1>
              <StockIssueRequestStatusBadge status={order.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Hàng từ {order.warehouseName} đến {order.recipientName}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {capabilities.canCreate && canEditStockIssueRequest(order.status) ? (
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.stockIssueRequestEdit(order.id) as Route}>
                <Edit3 aria-hidden="true" />
                Chỉnh sửa
              </Link>
            </Button>
          ) : null}
          {capabilities.canAssignPicker && order.status === 'Pending' ? (
            <Button type="button" onClick={() => handlers.onReleaseForPicking(order)}>
              <Send aria-hidden="true" />
              Giao việc lấy hàng
            </Button>
          ) : null}
          {order.items.some((item) => item.pickLocations.length > 0) ? (
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.stockIssueRequestPrint(order.id) as Route}>
                <Printer aria-hidden="true" />
                In phiếu lấy hàng
              </Link>
            </Button>
          ) : null}
          {canPickNow ? (
            <Button type="button" onClick={() => handlers.onRecordStockPicking(order)}>
              <ScanBarcode aria-hidden="true" />
              Quét &amp; lấy hàng
            </Button>
          ) : null}
          {canPickNow ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handlers.onReportPickIssue(order)}
            >
              <PackageX aria-hidden="true" />
              Báo hàng lỗi
            </Button>
          ) : null}
          {capabilities.canAuthorizeDispatch && order.status === 'Picked' ? (
            <Button type="button" onClick={() => handlers.onAuthorizeDispatch(order)}>
              <ShieldCheck aria-hidden="true" />
              Cho phép xuất kho
            </Button>
          ) : null}
          {capabilities.canDispatch && order.status === 'AuthorizedForDispatch' ? (
            <Button type="button" onClick={() => handlers.onConfirmDispatch(order)}>
              <Truck aria-hidden="true" />
              Xác nhận hàng rời kho
            </Button>
          ) : null}
          {capabilities.canCancel && canCancelStockIssueRequest(order.status) ? (
            <Button type="button" variant="destructive" onClick={() => handlers.onCancel(order)}>
              <Ban aria-hidden="true" />
              Huỷ phiếu
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <StockIssueRequestOverview order={order} />
          <StockIssueRequestLines
            items={order.items}
            canRemovePick={canRemovePick}
            isRemovingPick={isRemovingPick}
            onRemovePickDetail={onRemovePickDetail}
          />
          <section className="bg-card border" aria-labelledby="stock-issue-request-attachments">
            <div className="border-b p-4">
              <h2 id="stock-issue-request-attachments" className="text-sm font-semibold">
                Đính kèm
              </h2>
              <p className="text-muted-foreground text-xs">{order.attachments.length} tệp</p>
            </div>
            <div className="p-4">
              <StockIssueAttachmentList
                stockIssueRequestId={order.id}
                attachments={order.attachments}
                canEdit={order.status !== 'Cancelled' && order.status !== 'Dispatched'}
              />
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <section className="bg-card border" aria-labelledby="stock-issue-request-progress">
            <div className="border-b p-4">
              <h2 id="stock-issue-request-progress" className="text-sm font-semibold">
                Tiến trình xuất kho
              </h2>
            </div>
            <div className="p-4">
              <StockIssueStatusStepper
                status={order.status}
                hasAssignedPicker={Boolean(order.assignedStaffId)}
              />
            </div>
          </section>
          <section className="bg-card border" aria-labelledby="stock-issue-request-picker">
            <div className="border-b p-4">
              <h2 id="stock-issue-request-picker" className="text-sm font-semibold">
                Người lấy hàng
              </h2>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm">
                {order.assignedStaffName ?? (
                  <span className="text-muted-foreground">
                    Chưa giao — chờ quản lý kho giao việc.
                  </span>
                )}
              </p>
              {canReassignPicker ? (
                <StockIssuePickerAssignment
                  key={`${order.id}:${order.assignedStaffId ?? ''}`}
                  options={pickerOptions}
                  currentStaffId={order.assignedStaffId}
                  isPending={isAssigningPicker}
                  onAssign={onAssignPicker}
                />
              ) : null}
            </div>
          </section>
          <section className="bg-card border" aria-labelledby="stock-issue-request-audit">
            <div className="border-b p-4">
              <h2 id="stock-issue-request-audit" className="text-sm font-semibold">
                Nhật ký thao tác
              </h2>
            </div>
            <div className="p-4">
              <StockIssueAuditTimeline stockIssueRequestId={order.id} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
