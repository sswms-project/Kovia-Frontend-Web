'use client'

import { Camera, CameraOff, PackageCheck } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import { P } from '@/config/permissionCodes'
import {
  formatOperationalDate,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import {
  InlineCameraScanner,
  ReceiveEntryCard,
  ScanPreferencesBar,
  TransferWorkHeader,
} from '../components/TransferWork'
import {
  MissingPermissionNotice,
  TransferChangedBanner,
  TransferConfirmDialog,
} from '../components/TransferShared'
import { useTransferReceiveSheetQuery } from '../hooks/use-transfer-fulfillment'
import { useTransferReceiveForm } from '../hooks/use-transfer-receive-form'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import { isCameraScanSupported } from '../utils/camera-scan'
import { playScanFeedback } from '../utils/scan-feedback'
import { useScanPreferences } from '../utils/scan-preferences'
import { formatTransferLocation } from '../utils/transfer-location'
import { nextReceiveScanTarget } from '../utils/transfer-receive'

interface TransferReceiveTaskPageProps {
  readonly transferId: string
  readonly shipmentId: string
}

const subscribeNothing = () => () => undefined

export default function TransferReceiveTaskPage({
  transferId,
  shipmentId,
}: TransferReceiveTaskPageProps) {
  const { viewer } = useTransferViewer()
  const sheetQuery = useTransferReceiveSheetQuery(transferId, shipmentId)
  const sheet = sheetQuery.data
  const realtime = useTransferRealtime({ transferId, autoRefresh: false })
  const receive = useTransferReceiveForm(transferId, shipmentId, sheet)

  const isReceivable =
    sheet?.shipmentStatus === 'InTransit' || sheet?.shipmentStatus === 'Receiving'
  const hasReceivePermission = viewer.permissions.includes(P.TRANSFERS_RECEIVE)
  const canAct = hasReceivePermission && isReceivable
  const values = receive.form.watch('entries')
  const totals = values.reduce(
    (sum, entry) => ({
      good: sum.good + (entry.goodQuantity || 0),
      damaged: sum.damaged + (entry.damagedQuantity || 0),
      missing: sum.missing + (entry.missingQuantity || 0),
    }),
    { good: 0, damaged: 0, missing: 0 }
  )

  // Camera dùng chung cho cả trang: mã đọc được đi vào khai báo đang chờ quét (vị trí trước, mã hàng sau).
  const [preferences] = useScanPreferences()
  const canUseCamera = useSyncExternalStore(subscribeNothing, isCameraScanSupported, () => false)
  const [cameraOn, setCameraOn] = useState(false)
  const scanTarget = nextReceiveScanTarget(values)
  const cameraActive = cameraOn && canAct && !receive.isReceiving && scanTarget !== null
  const latest = useRef({ scanTarget, receive, feedback: preferences.feedback })
  useEffect(() => {
    latest.current = { scanTarget, receive, feedback: preferences.feedback }
  })
  function handleCameraCode(code: string) {
    const { scanTarget: target, receive: current, feedback } = latest.current
    if (!target) return
    const result =
      target.step === 'slot'
        ? current.scanSlot(target.index, code)
        : current.scanProduct(target.index, code)
    if (!feedback) return
    void Promise.resolve(result).then((ok) => {
      if (typeof ok === 'boolean') playScanFeedback(ok ? 'success' : 'error')
    })
  }
  const targetEntry = scanTarget ? values[scanTarget.index] : undefined
  const targetLine = targetEntry ? receive.lineById.get(targetEntry.lineId) : undefined

  function reload() {
    realtime.dismiss()
    receive.reset()
    void sheetQuery.refetch()
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      {sheet ? (
        <TransferWorkHeader
          heading="Nhận hàng điều chuyển"
          transferId={transferId}
          transferCode={sheet.transferCode}
          shipmentNumber={sheet.shipmentNumber}
          shipmentStatus={sheet.shipmentStatus}
          route={`Nhận tại ${sheet.destinationWarehouseName}`}
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
            title="Không thể tải phiếu nhận hàng"
            onRetry={() => void sheetQuery.refetch()}
          />
        ) : sheet.lines.length === 0 ? (
          <OperationalEmptyState
            title="Đợt này chưa có hàng để nhận"
            description="Đợt cần được xuất khỏi kho xuất trước khi nhận."
          />
        ) : (
          <form
            className="grid gap-3 pb-3"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void receive.requestConfirm()
            }}
          >
            {isReceivable && !hasReceivePermission ? (
              <MissingPermissionNotice action="nhận hàng điều chuyển" />
            ) : null}
            {!isReceivable ? (
              <p className="text-muted-foreground text-sm" role="status">
                Đợt này không còn ở trạng thái chờ nhận nên chỉ xem được.
              </p>
            ) : null}
            {canAct ? <ScanPreferencesBar /> : null}
            {canAct && canUseCamera ? (
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={receive.isReceiving}
                  aria-pressed={cameraOn}
                  onClick={() => setCameraOn((current) => !current)}
                >
                  {cameraOn ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
                  {cameraOn ? 'Tắt camera quét' : 'Bật camera quét'}
                </Button>
                <InlineCameraScanner active={cameraActive} onCode={handleCameraCode} />
                {cameraOn ? (
                  <p className="text-muted-foreground text-xs" role="status">
                    {scanTarget && targetLine
                      ? `Đang chờ quét ${scanTarget.step === 'slot' ? 'vị trí cất' : 'mã hàng'} cho ${targetLine.sku} (khai báo ${scanTarget.index + 1}).`
                      : 'Đã quét đủ. Camera tạm dừng; kiểm tra số lượng rồi xác nhận nhận hàng.'}
                  </p>
                ) : null}
              </div>
            ) : null}
            {receive.fields.map((field, index) => {
              const entry = values[index]
              const line = entry ? receive.lineById.get(entry.lineId) : undefined
              const lot = line?.lots.find((candidate) => candidate.lotId === (entry?.lotId ?? null))
              if (!entry || !line) return null
              return (
                <ReceiveEntryCard
                  key={field.id}
                  index={index}
                  form={receive.form}
                  heading={`${line.sku} · ${line.productName}`}
                  lotLabel={
                    lot?.lotNumber
                      ? `Lô ${lot.lotNumber}${lot.expiryDate ? ` · HSD ${formatOperationalDate(lot.expiryDate)}` : ''}`
                      : 'Không theo lô'
                  }
                  dispatchedQuantity={lot?.dispatchedQuantity ?? 0}
                  baseUnitName={line.baseUnitName}
                  canRemove={receive.countEntriesOf(index) > 1}
                  slotLabel={receive.slotPathById[entry.destinationSlotId]}
                  suggestedSlotId={line.suggestedSlotId ?? undefined}
                  suggestedSlotLabel={
                    line.suggestedSlotCode
                      ? formatTransferLocation({
                          slotCode: line.suggestedSlotCode,
                          rackCode: line.suggestedRackCode,
                          zoneCode: line.suggestedZoneCode,
                          isSystemDefaultSlot: line.suggestedIsSystemDefaultSlot,
                        })
                      : undefined
                  }
                  disabled={!canAct || receive.isReceiving}
                  isFindingSlot={receive.isFindingSlot}
                  onScanSlot={receive.scanSlot}
                  onScanProduct={receive.scanProduct}
                  onSplit={receive.splitEntry}
                  onRemove={receive.removeEntry}
                />
              )
            })}
          </form>
        )}
      </div>

      {canAct && sheet && sheet.lines.length > 0 ? (
        <footer className="bg-background shrink-0 border-t pt-3">
          <p className="mb-2 text-sm tabular-nums" aria-live="polite">
            Tốt {formatQuantity(totals.good)} · Hỏng {formatQuantity(totals.damaged)} · Thiếu{' '}
            {formatQuantity(totals.missing)}
          </p>
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={receive.isReceiving}
            onClick={() => void receive.requestConfirm()}
          >
            <PackageCheck aria-hidden="true" />
            Xác nhận nhận đợt
          </Button>
        </footer>
      ) : null}

      <TransferConfirmDialog
        open={receive.isConfirmOpen}
        title="Xác nhận nhận đợt hàng?"
        description={
          <p>
            Nhận tốt <strong>{formatQuantity(totals.good)}</strong>, hỏng{' '}
            <strong>{formatQuantity(totals.damaged)}</strong>, thiếu{' '}
            <strong>{formatQuantity(totals.missing)}</strong>. Mỗi đợt chỉ nhận một lần; hàng thiếu
            đến sau được xử lý ở mục chênh lệch.
          </p>
        }
        confirmLabel="Xác nhận nhận"
        pendingLabel="Đang nhận…"
        isPending={receive.isReceiving}
        onOpenChange={receive.setIsConfirmOpen}
        onConfirm={() => void receive.confirm()}
      />
    </div>
  )
}
