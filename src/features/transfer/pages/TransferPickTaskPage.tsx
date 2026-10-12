'use client'

import { PackageCheck } from 'lucide-react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import { P } from '@/config/permissionCodes'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import {
  PickEntryDialog,
  PickEscalateDialog,
  PickLineCard,
  PickSwitchDialog,
  ReturnPickDialog,
  TransferWorkHeader,
} from '../components/TransferWork'
import {
  MissingPermissionNotice,
  TransferChangedBanner,
  TransferConfirmDialog,
} from '../components/TransferShared'
import { useTransferPickSheetQuery } from '../hooks/use-transfer-fulfillment'
import { useTransferPickActions } from '../hooks/use-transfer-pick-actions'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'

interface TransferPickTaskPageProps {
  readonly transferId: string
  readonly shipmentId: string
}

export default function TransferPickTaskPage({
  transferId,
  shipmentId,
}: TransferPickTaskPageProps) {
  const { viewer } = useTransferViewer()
  const sheetQuery = useTransferPickSheetQuery(transferId, shipmentId)
  const sheet = sheetQuery.data
  // Nhân viên có thể đang nhập số lượng dở: chỉ báo thay đổi, không tải đè lên màn hình.
  const realtime = useTransferRealtime({ transferId, autoRefresh: false })
  const actions = useTransferPickActions(transferId, shipmentId, sheet)

  const isPicking = sheet?.shipmentStatus === 'Picking'
  const hasPickPermission = viewer.permissions.includes(P.TRANSFERS_PICK)
  const canAct = hasPickPermission && isPicking
  const lines = sheet?.lines ?? []
  const blockers = {
    pendingManager: lines.filter((line) => line.status === 'PendingManager').length,
    missing: lines.filter((line) => line.remainingQuantity > 0).length,
    surplus: lines.filter((line) => line.pendingReturnQuantity > 0).length,
  }
  const canDispatch =
    canAct &&
    lines.length > 0 &&
    blockers.pendingManager === 0 &&
    blockers.missing === 0 &&
    blockers.surplus === 0
  const totalPicked = lines.reduce((total, line) => total + line.pickedQuantity, 0)

  function reload() {
    realtime.dismiss()
    void sheetQuery.refetch()
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      {sheet ? (
        <TransferWorkHeader
          heading="Lấy hàng điều chuyển"
          transferId={transferId}
          transferCode={sheet.transferCode}
          shipmentNumber={sheet.shipmentNumber}
          shipmentStatus={sheet.shipmentStatus}
          route={`${sheet.sourceWarehouseName} → ${sheet.destinationWarehouseName}`}
        />
      ) : null}
      {realtime.hasPendingChange ? (
        <TransferChangedBanner onReload={reload} onDismiss={realtime.dismiss} />
      ) : null}

      <div data-slot="transfer-scroll" className="min-h-0 flex-1 overflow-y-auto">
        {sheetQuery.isLoading ? (
          <OperationalLoadingState rows={3} />
        ) : sheetQuery.isError || !sheet ? (
          <OperationalErrorState
            title="Không thể tải phiếu lấy hàng"
            onRetry={() => void sheetQuery.refetch()}
          />
        ) : lines.length === 0 ? (
          <OperationalEmptyState
            title="Đợt xuất không còn hàng cần lấy"
            description="Quản lý có thể đã giảm hoặc hủy đợt này."
          />
        ) : (
          <div className="grid gap-3 pb-3">
            {isPicking && !hasPickPermission ? (
              <MissingPermissionNotice action="lấy hàng điều chuyển" />
            ) : null}
            {sheet?.shipmentStatus === 'ReadyToDispatch' ? (
              <p className="text-muted-foreground text-sm" role="status">
                Đã lấy xong và đang chờ xe rời kho. Quản lý kho sẽ xác nhận xuất kho.
              </p>
            ) : !isPicking ? (
              <p className="text-muted-foreground text-sm" role="status">
                Đợt này không còn ở trạng thái lấy hàng nên chỉ xem được.
              </p>
            ) : null}
            {lines.map((line) => (
              <PickLineCard
                key={line.lineId}
                line={line}
                canAct={canAct}
                onPick={actions.entry.open}
                onSwitch={(target) => actions.switch.open(target)}
                onEscalate={actions.escalate.open}
                onReturn={actions.returnPick.open}
              />
            ))}
          </div>
        )}
      </div>

      {canAct ? (
        <footer className="bg-background shrink-0 border-t pt-3">
          {!canDispatch ? (
            <p className="text-muted-foreground mb-2 text-xs" role="status">
              {blockers.pendingManager > 0
                ? `${blockers.pendingManager} dòng đang chờ quản lý xử lý. `
                : ''}
              {blockers.missing > 0 ? `${blockers.missing} dòng chưa lấy đủ. ` : ''}
              {blockers.surplus > 0 ? `${blockers.surplus} dòng lấy dư cần trả về vị trí. ` : ''}
              Hoàn tất các dòng trên để hoàn tất lấy hàng.
            </p>
          ) : null}
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={!canDispatch}
            onClick={actions.complete.open}
          >
            <PackageCheck aria-hidden="true" />
            Hoàn tất lấy hàng
          </Button>
        </footer>
      ) : null}

      <PickEntryDialog
        line={actions.entry.line}
        scan={actions.entry.scan}
        quantity={actions.entry.quantity}
        maximumQuantity={actions.entry.maximumQuantity}
        quantityError={actions.entry.quantityError}
        isPending={actions.entry.isPending}
        eachUnit={actions.entry.eachUnit}
        onScanSlot={actions.entry.scanSlot}
        onScanProduct={actions.entry.scanProduct}
        onQuantityChange={actions.entry.changeQuantity}
        onUseAlternative={actions.entry.useAlternative}
        onRescan={actions.entry.rescan}
        onConfirm={() => void actions.entry.confirm()}
        onOpenChange={actions.entry.onOpenChange}
      />
      <PickSwitchDialog
        line={actions.switch.line}
        form={actions.switch.form}
        alternatives={actions.switch.alternatives}
        isLoadingAlternatives={actions.alternativesLoading}
        isNonFefo={actions.switch.isNonFefo}
        isPending={actions.switch.isPending}
        onOpenChange={actions.switch.onOpenChange}
        onSubmit={(values) => void actions.switch.submit(values)}
      />
      <PickEscalateDialog
        line={actions.escalate.line}
        form={actions.escalate.form}
        isPending={actions.escalate.isPending}
        onOpenChange={actions.escalate.onOpenChange}
        onSubmit={(values) => void actions.escalate.submit(values)}
      />
      <ReturnPickDialog
        line={actions.returnPick.line}
        form={actions.returnPick.form}
        picks={actions.returnPick.picks}
        scannedSlotError={actions.returnPick.scanError}
        isPending={actions.returnPick.isPending}
        onScanSlot={actions.returnPick.scanSlot}
        onOpenChange={actions.returnPick.onOpenChange}
        onSubmit={(values) => void actions.returnPick.submit(values)}
      />
      <TransferConfirmDialog
        open={actions.complete.isOpen}
        title="Hoàn tất lấy hàng?"
        description={
          <p>
            Bạn đã lấy đủ <strong>{formatQuantity(totalPicked)}</strong> đơn vị (ĐVT chính) của{' '}
            {lines.length} dòng. Hàng chuyển sang trạng thái chờ xuất; tồn kho chỉ bị trừ khi quản
            lý xác nhận xe đã rời kho.
          </p>
        }
        confirmLabel="Hoàn tất lấy hàng"
        pendingLabel="Đang xử lý…"
        isPending={actions.complete.isPending}
        onOpenChange={actions.complete.onOpenChange}
        onConfirm={() => void actions.complete.confirm()}
      />
    </div>
  )
}
