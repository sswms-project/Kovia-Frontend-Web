'use client'

import { Send, ShieldCheck, Truck } from 'lucide-react'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { StockIssueWorkflow } from '../../hooks/use-stock-issue-workflow'
import { formatStockIssueUnitQuantity } from '../../utils/stock-issue-format'
import {
  CancelStockIssueRequestDialog,
  CreateGoodsReturnRequestDialog,
  RecordStockPickingDialog,
  ReportPickIssueDialog,
} from '../StockIssueRequestsPage'

/** Mọi hộp thoại của luồng xuất kho; trạng thái và thao tác nằm trong `useStockIssueWorkflow`. */
export function StockIssueWorkflowDialogs({ workflow }: { readonly workflow: StockIssueWorkflow }) {
  const { picking, goodsReturn, release, authorize, dispatch, cancel, report } = workflow
  const allowableByPickDetail = Object.fromEntries(
    (goodsReturn.order?.items ?? []).flatMap((item) =>
      item.pickDetails.map((detail) => [detail.id, Math.max(0, detail.returnableQuantity)])
    )
  )

  return (
    <>
      <RecordStockPickingDialog key={`pick-${picking.order?.id ?? 'none'}`} {...picking} />
      <ReportPickIssueDialog key={`report-${report.order?.id ?? 'none'}`} {...report} />
      <CancelStockIssueRequestDialog key={`cancel-${cancel.order?.id ?? 'none'}`} {...cancel} />
      <CreateGoodsReturnRequestDialog
        {...goodsReturn}
        allowableByPickDetail={allowableByPickDetail}
      />

      <AlertDialog
        open={Boolean(release.order)}
        onOpenChange={(open) => {
          if (!open && !release.isPending) release.onClose()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Send aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Giao việc lấy hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Chọn nhân viên kho phụ trách. Hệ thống sẽ giữ tồn đủ điều kiện cho phiếu trước khi
              nhân viên lấy hàng; sau bước này phiếu không còn chỉnh sửa được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <NativeSelect
            aria-label="Giao cho nhân viên lấy hàng"
            className="w-full"
            value={release.staffId}
            disabled={release.isPending}
            onChange={(event) => release.onStaffChange(event.target.value)}
          >
            <NativeSelectOption value="">Chọn nhân viên lấy hàng…</NativeSelectOption>
            {workflow.pickerOptions.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={release.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={release.isPending || !release.staffId}
              onClick={(event) => {
                event.preventDefault()
                release.onConfirm()
              }}
            >
              {release.isPending ? 'Đang xử lý…' : 'Giao việc'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      ? ` · ${[...new Set(item.pickDetails.map((detail) => detail.stagingSlotCode))].join(', ')}`
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
