'use client'

import { Camera, CameraOff, PackageCheck } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PutawayPlanNotice } from '@/components/operations/putaway'
import { receiptPlanStates, receiveScanProgress } from '../utils/transfer-receive-plan'
import { canSeeWarehouse } from '../utils/transfer-capabilities'
import { P } from '@/config/permissionCodes'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
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
import { useTransferReceivableSlotsQuery } from '../hooks/use-transfers'
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

export default function TransferLegacyReceiveTaskPage({
  transferId,
  shipmentId,
}: TransferReceiveTaskPageProps) {
  const { viewer } = useTransferViewer()
  const sheetQuery = useTransferReceiveSheetQuery(transferId, shipmentId)
  const sheet = sheetQuery.data
  const realtime = useTransferRealtime({ transferId, autoRefresh: false })

  const isReceivable =
    sheet?.shipmentStatus === 'InTransit' || sheet?.shipmentStatus === 'Receiving'
  const hasReceivePermission = viewer.permissions.includes(P.TRANSFERS_RECEIVE)
  const canAct =
    hasReceivePermission && isReceivable && canSeeWarehouse(viewer, sheet?.destinationWarehouseId)
  const receive = useTransferReceiveForm(transferId, shipmentId, sheet, canAct)
  const [isResetPlanConfirmOpen, setIsResetPlanConfirmOpen] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [slotSearch, setSlotSearch] = useState<string | null>(null)
  const debouncedSlotSearch = useDebouncedValue((slotSearch ?? '').trim(), 300)
  const receivableSlotsQuery = useTransferReceivableSlotsQuery(
    {
      warehouseId: sheet?.destinationWarehouseId ?? '',
      top: 20,
      ...(debouncedSlotSearch ? { search: debouncedSlotSearch } : {}),
    },
    canAct && slotSearch !== null && Boolean(sheet?.destinationWarehouseId)
  )
  const reloadLock = useRef(false)
  const values = receive.form.watch('entries')
  const planStates = sheet ? receiptPlanStates(sheet, values) : []
  const progress = receiveScanProgress(values)
  const offPlanCount = planStates.filter((state) => state.isOffPlan).length
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
  const cameraActive = cameraOn && canAct && !receive.blocked && !isReloading && scanTarget !== null
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

  /** Vị trí theo kế hoạch của dòng đứng đầu, sau đó là kết quả tìm trong kho nhập. */
  function slotOptionsFor(line: NonNullable<typeof sheet>['lines'][number]) {
    const planned = line.lots.flatMap((lot) =>
      (lot.plan ?? []).map((plan) => ({ value: plan.slotId, label: plan.path }))
    )
    const found = (receivableSlotsQuery.data ?? []).map((slot) => ({
      value: slot.id,
      label: slot.path,
    }))
    return [...planned, ...found].filter(
      (option, position, all) => all.findIndex((other) => other.value === option.value) === position
    )
  }

  async function reload() {
    if (reloadLock.current || receive.isReceiving || receive.isFindingSlot) return
    reloadLock.current = true
    setIsReloading(true)
    try {
      const result = await sheetQuery.refetch()
      if (result.data && !result.isError) {
        receive.acceptFresh(result.data)
        realtime.dismiss()
      }
    } finally {
      reloadLock.current = false
      setIsReloading(false)
    }
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
      {realtime.hasPendingChange && !receive.reloadRequired ? (
        <TransferChangedBanner onReload={() => void reload()} onDismiss={realtime.dismiss} />
      ) : null}

      {receive.notice ? (
        <div role="status" className="bg-card shrink-0 border p-3 text-sm">
          <p>{receive.notice}</p>
          {receive.reloadRequired ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              disabled={isReloading || receive.isReceiving || receive.isFindingSlot}
              onClick={() => void reload()}
            >
              {isReloading ? 'Đang tải lại…' : 'Tải lại và giữ số lượng đang nhập'}
            </Button>
          ) : null}
        </div>
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
            className="grid gap-3 pb-4"
            aria-busy={receive.isReceiving || isReloading}
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
            {isReceivable ? (
              <PutawayPlanNotice
                disabled={receive.blocked || isReloading || receive.isFindingSlot}
                onApplyPlan={() => {
                  if (receive.form.formState.isDirty) setIsResetPlanConfirmOpen(true)
                  else receive.applyPlan()
                }}
                description="Đã điền sẵn vị trí và số lượng; vẫn cần quét xác nhận. Cất khác kế hoạch cần chọn lý do."
                items={sheet.lines
                  .filter((line) => line.planMode === 'Planned')
                  .map((line) => ({
                    id: line.lineId,
                    label: `${line.sku} · ${line.productName}`,
                    locations:
                      line.lots
                        .flatMap((lot) =>
                          (lot.plan ?? []).map(
                            (plan) =>
                              `${plan.path}: ${formatQuantity(plan.plannedQuantity)} ${line.baseUnitName}`
                          )
                        )
                        .join(' · ') || 'Chưa có vị trí theo kế hoạch',
                  }))}
              />
            ) : null}
            {canAct ? <ScanPreferencesBar /> : null}
            {canAct && canUseCamera ? (
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={receive.blocked || isReloading || receive.isFindingSlot}
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
                  planState={planStates[index]}
                  planChanged={receive.changedLines.has(line.lineId)}
                  planWarnings={
                    index === values.findIndex((candidate) => candidate.lineId === line.lineId)
                      ? [...new Set((line.planWarnings ?? []).map((warning) => warning.message))]
                      : []
                  }
                  onSplitExcess={receive.splitExcess}
                  suggestedSlotId={entry.plannedSlotId || line.suggestedSlotId || undefined}
                  suggestedSlotLabel={
                    entry.plannedSlotLabel ||
                    (line.planMode === 'Planned'
                      ? 'Chưa có vị trí theo kế hoạch'
                      : line.suggestedSlotCode
                        ? formatTransferLocation({
                            slotCode: line.suggestedSlotCode,
                            rackCode: line.suggestedRackCode,
                            zoneCode: line.suggestedZoneCode,
                            isSystemDefaultSlot: line.suggestedIsSystemDefaultSlot,
                          })
                        : undefined)
                  }
                  disabled={receive.blocked || isReloading || receive.isFindingSlot}
                  isFindingSlot={receive.isFindingSlot}
                  slotOptions={slotOptionsFor(line)}
                  isLoadingSlots={receivableSlotsQuery.isFetching}
                  onSearchSlots={setSlotSearch}
                  onMarkUnreadable={receive.markSlotUnreadable}
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
        <footer className="bg-background shrink-0 border-t py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 text-sm font-medium tabular-nums" role="status">
            Đã xác nhận {progress.confirmed}/{progress.required} vị trí cần cất
            {offPlanCount > 0 ? ` · ${offPlanCount} khai báo khác kế hoạch` : ''}.
          </p>
          <p className="mb-2 text-sm tabular-nums" aria-live="polite">
            Tốt {formatQuantity(totals.good)} · Hỏng {formatQuantity(totals.damaged)} · Thiếu{' '}
            {formatQuantity(totals.missing)}
          </p>
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={receive.blocked || isReloading || receive.isFindingSlot}
            onClick={() => void receive.requestConfirm()}
          >
            {receive.isReceiving ? (
              <Spinner aria-hidden="true" />
            ) : (
              <PackageCheck aria-hidden="true" />
            )}
            {receive.isReceiving ? 'Đang nhận hàng…' : 'Xác nhận nhận đợt'}
          </Button>
        </footer>
      ) : null}

      <TransferConfirmDialog
        open={isResetPlanConfirmOpen}
        onOpenChange={setIsResetPlanConfirmOpen}
        title="Điền lại theo kế hoạch?"
        description={
          <p>
            Số lượng, vị trí đã quét và ghi chú đang nhập sẽ được thay bằng kế hoạch mới. Chưa có dữ
            liệu nào được lưu.
          </p>
        }
        confirmLabel="Điền lại theo kế hoạch"
        pendingLabel="Đang xử lý…"
        isPending={receive.isReceiving}
        onConfirm={() => {
          receive.applyPlan()
          setIsResetPlanConfirmOpen(false)
        }}
      />
      <TransferConfirmDialog
        open={receive.isConfirmOpen}
        title="Xác nhận nhận đợt hàng?"
        description={
          <p>
            Nhận tốt <strong>{formatQuantity(totals.good)}</strong>, hỏng{' '}
            <strong>{formatQuantity(totals.damaged)}</strong>, thiếu{' '}
            <strong>{formatQuantity(totals.missing)}</strong>. Mỗi đợt chỉ nhận một lần; hàng thiếu
            đến sau được xử lý ở mục chênh lệch.{' '}
            {offPlanCount > 0
              ? `${offPlanCount} khai báo cất khác kế hoạch được lưu kèm lý do.`
              : ''}
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
