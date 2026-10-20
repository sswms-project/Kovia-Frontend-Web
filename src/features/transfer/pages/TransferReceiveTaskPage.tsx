'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { APP_ROUTES } from '@/routes/app-routes'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { TransferReceiptCountCards, TransferWorkHeader } from '../components/TransferWork'
import {
  TransferChangedBanner,
  TransferConfirmDialog,
  TransferUnsavedChanges,
} from '../components/TransferShared'
import {
  useTransferReceiptSheetQuery,
  useStartTransferReceivingMutation,
} from '../hooks/use-transfer-receipt'
import { useTransferCountForm } from '../hooks/use-transfer-count-form'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import { useTransferQuery } from '../hooks/use-transfers'
import { getShipmentCapabilities } from '../utils/transfer-capabilities'
import { newCommandId } from '../utils/transfer-command-id'
import { describeTransferError } from '../utils/transfer-errors'
import type { StartTransferReceivingRequest } from '../types/transfer-receipt.types'
import TransferLegacyReceiveTaskPage from './TransferLegacyReceiveTaskPage'

interface Props {
  readonly transferId: string
  readonly shipmentId: string
}

export default function TransferReceiveTaskPage({ transferId, shipmentId }: Props) {
  const router = useRouter()
  const { viewer, isReady } = useTransferViewer()
  const detail = useTransferQuery(transferId)
  const query = useTransferReceiptSheetQuery(transferId, shipmentId)
  const sheet = query.data
  const transfer = detail.data
  const shipment = transfer?.shipments?.find((shipment) => shipment.id === shipmentId)
  const caps = shipment ? getShipmentCapabilities(viewer, shipment, transfer) : undefined
  const mayReceive = Boolean(caps?.canOpenReceive)
  const count = useTransferCountForm(
    sheet,
    mayReceive && sheet?.status === 'Receiving' && sheet.receiptFlowVersion === 1
  )
  const realtime = useTransferRealtime({ transferId, autoRefresh: false })
  const start = useStartTransferReceivingMutation()
  const startLock = useRef(false)
  const startIntent = useRef<StartTransferReceivingRequest | null>(null)
  const startResolved = useRef(false)
  const [isStartResolved, setIsStartResolved] = useState(false)
  const [startUncertain, setStartUncertain] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const reloadLock = useRef(false)
  const entries = count.form.watch('entries')
  const totals = entries.reduce(
    (sum, entry) => ({
      good: sum.good + (entry.goodQuantity || 0),
      damaged: sum.damaged + (entry.damagedQuantity || 0),
      missing: sum.missing + (entry.missingQuantity || 0),
    }),
    { good: 0, damaged: 0, missing: 0 }
  )

  async function reload(continueToPutAway = false) {
    if (reloadLock.current || startLock.current || count.isPending) return
    reloadLock.current = true
    setIsReloading(true)
    try {
      const [fresh, freshDetail] = await Promise.all([query.refetch(), detail.refetch()])
      if (fresh.data && !fresh.isError) {
        count.acceptFresh(fresh.data)
        const nextShipment = freshDetail.data?.shipments?.find((row) => row.id === shipmentId)
        if (
          continueToPutAway &&
          fresh.data.status === 'AwaitingPutAway' &&
          !freshDetail.isError &&
          nextShipment?.putAwayAssigneeId === viewer.currentUserId &&
          getShipmentCapabilities(viewer, nextShipment, freshDetail.data).canOpenPutAway
        ) {
          router.push(APP_ROUTES.transferPutAwayTask(transferId, shipmentId))
        }
        realtime.dismiss()
        if (fresh.data.status !== 'InTransit') {
          startIntent.current = null
          setStartUncertain(false)
          setNotice(null)
        }
      }
    } finally {
      reloadLock.current = false
      setIsReloading(false)
    }
  }

  async function startReceiving() {
    if (
      !mayReceive ||
      !sheet?.version ||
      startLock.current ||
      startResolved.current ||
      (!startUncertain && sheet.status !== 'InTransit')
    )
      return
    startLock.current = true
    const request = startIntent.current ?? {
      expectedVersion: sheet.version,
      commandId: newCommandId(),
    }
    startIntent.current = request
    let done = false
    try {
      await start.mutateAsync({ transferId, shipmentId, request })
      startIntent.current = null
      startResolved.current = true
      setIsStartResolved(true)
      setStartUncertain(false)
      done = true
      toast.success('Đã bắt đầu kiểm hàng.')
    } catch (error) {
      const result = describeTransferError(error, 'Không thể bắt đầu nhận hàng.')
      setNotice(result.message)
      toast.error(result.message)
      if (result.kind === 'unknown-result') setStartUncertain(true)
      else {
        startIntent.current = null
        setStartUncertain(false)
      }
    } finally {
      startLock.current = false
    }
    if (done) await reload()
  }

  if (!isReady || query.isLoading || detail.isLoading) return <OperationalLoadingState rows={4} />
  if (query.isError || detail.isError || !sheet || !transfer || !shipment)
    return (
      <OperationalErrorState
        title="Không thể tải phiếu nhập điều chuyển"
        onRetry={() => void reload()}
      />
    )
  if (
    (shipment.receiptFlowVersion ?? 0) === 0 &&
    (shipment.status === 'Received' || shipment.status === 'ReceivedWithDiscrepancy')
  )
    return <TransferLegacyReceiveTaskPage transferId={transferId} shipmentId={shipmentId} />
  const busy = count.isPending || start.isPending || isReloading
  const readOnly = sheet.status !== 'Receiving'
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 max-md:[&_a]:min-h-11 pointer-coarse:[&_a]:min-h-11 max-md:[&_button]:min-h-11 pointer-coarse:[&_button]:min-h-11">
      <TransferWorkHeader
        heading="Phiếu nhập điều chuyển"
        transferId={transferId}
        transferCode={sheet.transferCode}
        shipmentNumber={sheet.shipmentNumber}
        shipmentStatus={sheet.status}
        route={'Nhận tại ' + transfer.destinationWarehouseName}
      />
      <Alert>
        <AlertTitle>Kiểm hàng trước khi cất</AlertTitle>
        <AlertDescription>
          Tốt, hỏng và thiếu phải khớp số đã xuất. Nộp phiếu không ghi tồn kho và không cần duyệt;
          chỉ hàng tốt được cất ở bước riêng. Hàng hỏng, thiếu được xử lý theo chênh lệch.
        </AlertDescription>
      </Alert>
      {sheet.status === 'AwaitingPutAway' ? (
        <Alert role="status">
          <AlertDescription>
            {shipment.putAwayAssigneeId
              ? `Việc cất hàng được giao cho ${shipment.putAwayAssigneeName || 'nhân viên kho nhập'}.`
              : 'Đã kiểm nhận. Công việc cất hàng đang chờ quản lý kho nhập phân công.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {realtime.hasPendingChange ? (
        <TransferChangedBanner onReload={() => void reload()} onDismiss={realtime.dismiss} />
      ) : null}
      {notice || count.notice ? (
        <Alert role="status">
          <AlertDescription>{notice ?? count.notice}</AlertDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void reload()}>
              Tải lại và giữ số lượng đang nhập
            </Button>
            {count.unknownResult ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void count.retryUnknown().then((done) => {
                    if (done) void reload(true)
                  })
                }
              >
                Kiểm tra lại đúng thao tác trước
              </Button>
            ) : null}
          </div>
        </Alert>
      ) : null}
      {sheet.status === 'InTransit' && mayReceive ? (
        <Button disabled={busy || isStartResolved} onClick={() => void startReceiving()}>
          {start.isPending ? <Spinner /> : <PackageCheck />}
          {startUncertain ? 'Kiểm tra lại thao tác nhận hàng' : 'Nhận hàng'}
        </Button>
      ) : null}
      {sheet.status === 'Receiving' && !mayReceive ? (
        <Alert>
          <AlertDescription>
            Chỉ người được giao hoặc quản lý kho nhập đủ quyền mới được nộp phiếu. Bạn đang xem dữ
            liệu.
          </AlertDescription>
        </Alert>
      ) : null}
      <OperationalListPanel aria-label="Đối chiếu hàng điều chuyển" aria-busy={busy}>
        <TransferReceiptCountCards
          form={count.form}
          sheet={sheet}
          disabled={readOnly || count.blocked || busy}
        />
        <footer className="bg-card flex shrink-0 flex-wrap items-center justify-between gap-3 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-sm tabular-nums">
            Tốt {formatQuantity(totals.good)} · Hỏng {formatQuantity(totals.damaged)} · Thiếu{' '}
            {formatQuantity(totals.missing)}
          </p>
          {!readOnly && mayReceive ? (
            <Button disabled={count.blocked || busy} onClick={() => void count.requestConfirm()}>
              {count.isPending ? <Spinner /> : null}Nộp phiếu nhập
            </Button>
          ) : null}
          {sheet.status === 'AwaitingPutAway' && caps?.canOpenPutAway ? (
            <Button asChild>
              <Link href={APP_ROUTES.transferPutAwayTask(transferId, shipmentId)}>
                Mở trang cất hàng
              </Link>
            </Button>
          ) : null}
        </footer>
      </OperationalListPanel>
      <TransferConfirmDialog
        actionClassName="h-11 md:h-8 pointer-coarse:h-11"
        open={count.confirmOpen}
        onOpenChange={count.setConfirmOpen}
        title="Nộp phiếu kiểm hàng?"
        description={
          <p>
            Tốt {formatQuantity(totals.good)}, hỏng {formatQuantity(totals.damaged)}, thiếu{' '}
            {formatQuantity(totals.missing)}. Chênh lệch được báo quản lý nhưng không chặn cất hàng.
            Tồn kho chưa thay đổi ở bước này.
          </p>
        }
        confirmLabel="Nộp phiếu nhập"
        pendingLabel="Đang nộp…"
        isPending={count.isPending}
        onConfirm={() =>
          void count.confirm().then((done) => {
            if (done) void reload(true)
          })
        }
      />
      <TransferUnsavedChanges
        dirty={(!readOnly && count.form.formState.isDirty) || count.unknownResult || startUncertain}
        busy={busy}
      />
    </div>
  )
}
