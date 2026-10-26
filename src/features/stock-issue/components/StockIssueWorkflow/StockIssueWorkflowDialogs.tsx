'use client'

import { ShieldCheck, Truck } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AssignWarehouseTaskDialog } from '@/features/inbound/components/TaskAssignment'
import type { StockIssueWorkflow } from '../../hooks/use-stock-issue-workflow'
import { formatStockIssueUnitQuantity } from '../../utils/stock-issue-format'
import { formatStockIssueStagingLocation } from '../../utils/stock-issue-location'
import {
  CancelStockIssueRequestDialog,
  RecordStockPickingDialog,
  ReportPickIssueDialog,
} from '../StockIssueRequestsPage'

/** Mọi hộp thoại của luồng xuất kho; trạng thái và thao tác nằm trong `useStockIssueWorkflow`. */
export function StockIssueWorkflowDialogs({ workflow }: { readonly workflow: StockIssueWorkflow }) {
  const { picking, release, authorize, dispatch, cancel, report } = workflow

  return (
    <>
      <RecordStockPickingDialog key={`pick-${picking.order?.id ?? 'none'}`} {...picking} />
      <ReportPickIssueDialog key={`report-${report.order?.id ?? 'none'}`} {...report} />
      <CancelStockIssueRequestDialog key={`cancel-${cancel.order?.id ?? 'none'}`} {...cancel} />

      <AssignWarehouseTaskDialog
        title="Giao việc lấy hàng"
        target={
          release.order
            ? {
                kind: 'StockIssuePick',
                id: release.order.id,
                referenceCode: release.order.stockIssueRequestCode,
                warehouseId: release.order.warehouseId,
                warehouseName: release.order.warehouseName,
                currentAssigneeId: release.order.assignedStaffId,
                currentAssigneeName: release.order.assignedStaffName,
                currentPriority: 'Normal',
                currentDueAt: null,
              }
            : null
        }
        form={release.form}
        staff={workflow.pickerOptions}
        isLoadingStaff={release.isLoadingStaff}
        isErrorStaff={release.isErrorStaff}
        isFetchingStaff={release.isFetchingStaff}
        onRetryStaff={release.onRetryStaff}
        isPending={release.isPending}
        onOpenChange={(open) => {
          if (!open && !release.isPending) release.onClose()
        }}
        onSubmit={release.onConfirm}
      >
        <p className="text-muted-foreground text-sm">
          Sau khi giao việc, hệ thống giữ tồn đủ điều kiện cho yêu cầu. Nhân viên thực hiện lấy
          hàng; yêu cầu không còn chỉnh sửa được sau bước này.
        </p>
      </AssignWarehouseTaskDialog>

      <AlertDialog
        open={Boolean(authorize.order)}
        onOpenChange={(open) => {
          if (!open && !authorize.isPending) authorize.onClose()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <ShieldCheck aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Cho phép xuất kho?</AlertDialogTitle>
            <AlertDialogDescription>
              Hàng đã được lấy đủ và đang chờ ở khu chờ xuất. Sau khi bạn cho phép, nhân viên kho
              mới có thể quét và xác nhận hàng rời kho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={authorize.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={authorize.isPending}
              onClick={(event) => {
                event.preventDefault()
                authorize.onConfirm()
              }}
            >
              {authorize.isPending ? 'Đang xử lý…' : 'Cho phép xuất'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(dispatch.order)}
        onOpenChange={(open) => {
          if (!open && !dispatch.isPending) dispatch.onClose()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Truck aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận hàng đã rời kho?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này ghi giảm tồn kho thật và chuyển phiếu sang Đã xuất kho. Kiểm tra hàng rời
              kho đúng với danh sách dưới đây rồi xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-64 divide-y overflow-y-auto border text-sm">
            {(dispatch.order?.items ?? []).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-muted-foreground font-mono text-xs" translate="no">
                    {item.sku}
                    {item.pickDetails.length > 0
                      ? ` · ${[...new Set(item.pickDetails.map(formatStockIssueStagingLocation))].join(', ')}`
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatStockIssueUnitQuantity(item.enteredQuantity, item.enteredUnitName)}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dispatch.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={dispatch.isPending}
              onClick={(event) => {
                event.preventDefault()
                dispatch.onConfirm()
              }}
            >
              {dispatch.isPending ? 'Đang xác nhận…' : 'Xác nhận xuất kho'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
