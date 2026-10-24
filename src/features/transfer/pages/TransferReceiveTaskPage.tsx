'use client'

import { useEffect, useRef, useState } from 'react'
import { StagingPointChoice } from '@/features/warehouse/components/StagingPointChoice'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
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
import {
  TransferReceiptCountCards,
  TransferWorkHeader,
  TransferReceivingDisposition,
} from '../components/TransferWork'
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
import { useTransferQuery, useTransferPutAwaySlotsQuery } from '../hooks/use-transfers'
import {
  transferReceivingLocationSchema,
  transferStagingReceivingLocationSchema,
  type TransferReceivingLocationValues,
} from '../schemas/transfer-receipt.schema'
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
  const query = useTransferReceiptSheetQuery(transferId, shipmentId)
  const sheet = query.data
  const staged = (sheet?.outboundStagingFlowVersion ?? 0) > 0
  // Older BE versions have no compact context; retain the existing read path for them.
  const detail = useTransferQuery(sheet && !sheet.execution ? transferId : null)
  const transfer = detail.data
  const context = sheet?.execution
  const warehouses = context ?? transfer
  const shipment =
    sheet && context
      ? {
          status: sheet.status,
          lines: [],
          receiveAssigneeId: context.receiveAssigneeId,
          putAwayAssigneeId: context.putAwayAssigneeId,
          putAwayAssigneeName: context.putAwayAssigneeName,
          receiptFlowVersion: sheet.receiptFlowVersion,
        }
      : transfer?.shipments?.find((shipment) => shipment.id === shipmentId)
  const caps = shipment ? getShipmentCapabilities(viewer, shipment, warehouses) : undefined
  const mayReceive = Boolean(caps?.canOpenReceive)
  const count = useTransferCountForm(
    sheet,
    mayReceive && sheet?.status === 'Receiving' && [1, 2].includes(sheet.receiptFlowVersion)
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
  const [slotSearch, setSlotSearch] = useState('')
  const debouncedSlotSearch = useDebouncedValue(slotSearch, 300)
  const locations = useTransferPutAwaySlotsQuery(
    { warehouseId: warehouses?.destinationWarehouseId ?? '', search: debouncedSlotSearch, top: 30 },
    mayReceive &&
      !!warehouses &&
      ((!staged && sheet?.status === 'InTransit') || sheet?.status === 'Receiving')
  )
  const receivingForm = useForm<TransferReceivingLocationValues>({
    resolver: zodResolver(
      staged ? transferStagingReceivingLocationSchema : transferReceivingLocationSchema
    ),
    defaultValues: { receivingSlotId: '', scannedSlotCode: '' },
  })
  const receivingSlotId = useWatch({ control: receivingForm.control, name: 'receivingSlotId' })
  const receivingScope = useRef(`${transferId}:${shipmentId}`)
  useEffect(() => {
    const scope = `${transferId}:${shipmentId}`
    if (receivingScope.current !== scope) {
      receivingScope.current = scope
      receivingForm.reset({ receivingSlotId: '', scannedSlotCode: '' })
      startIntent.current = null
      startResolved.current = false
    }
    if (
      staged &&
      sheet?.status === 'InTransit' &&
      sheet.stagingPoints?.suggestedSlotId &&
      !receivingForm.getFieldState('receivingSlotId').isDirty &&
      !receivingForm.getValues('receivingSlotId') &&
      !startIntent.current
    )
      receivingForm.setValue('receivingSlotId', sheet.stagingPoints.suggestedSlotId)
  }, [receivingForm, sheet, staged, transferId, shipmentId])
  const entries = useWatch({ control: count.form.control, name: 'entries' })
  const keepAtReceiving = useWatch({ control: count.form.control, name: 'keepAtReceiving' })
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
      const [fresh, freshDetail] = await Promise.all([
        query.refetch(),
        context ? Promise.resolve(null) : detail.refetch(),
      ])
      if (fresh.data && !fresh.isError) {
        count.acceptFresh(fresh.data)
        const nextContext = fresh.data.execution
        const nextShipment = nextContext
          ? {
              status: fresh.data.status,
              lines: [],
              putAwayAssigneeId: nextContext.putAwayAssigneeId,
            }
          : freshDetail?.data?.shipments?.find((row) => row.id === shipmentId)
        if (
          continueToPutAway &&
          fresh.data.status === 'AwaitingPutAway' &&
          !freshDetail?.isError &&
          nextShipment?.putAwayAssigneeId === viewer.currentUserId &&
          getShipmentCapabilities(viewer, nextShipment, nextContext ?? freshDetail?.data)
            .canOpenPutAway
        ) {
          router.push(APP_ROUTES.transferPutAwayTask(transferId, shipmentId))
        }
        realtime.dismiss()
        if (fresh.data.status !== 'InTransit') {
          startIntent.current = null
          setStartUncertain(false)
          setNotice(null)
        }
      } else {
        setNotice(
          continueToPutAway
            ? 'Phiếu đã được ghi nhận nhưng chưa tải được dữ liệu mới. Hãy tải lại, không nộp thêm lần nữa.'
            : 'Chưa tải được dữ liệu mới. Hãy thử tải lại.'
        )
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
    if (
      !startUncertain &&
      (!(await receivingForm.trigger()) ||
        (staged
          ? !sheet.stagingPoints?.items.some(
              (point) => point.slotId === receivingForm.getValues('receivingSlotId')
            )
          : locations.isError ||
            locations.isFetching ||
            !locations.data?.some(
              (slot) => slot.id === receivingForm.getValues('receivingSlotId')
            )))
    )
      return
    startLock.current = true
    const request = startIntent.current ?? {
      expectedVersion: sheet.version,
      commandId: newCommandId(),
      ...receivingForm.getValues(),
      ...(staged && !receivingForm.getValues('scannedSlotCode')
        ? { scannedSlotCode: undefined }
        : {}),
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

  if (!isReady || query.isLoading || (!context && detail.isLoading))
    return <OperationalLoadingState rows={4} />
  if (query.isError || (!context && detail.isError) || !sheet || !warehouses || !shipment)
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
    <div className="flex min-h-full w-full min-w-0 flex-col gap-3 max-md:[&_a]:min-h-11 pointer-coarse:[&_a]:min-h-11 max-md:[&_button:not([role=checkbox])]:min-h-11 pointer-coarse:[&_button:not([role=checkbox])]:min-h-11">
      <TransferWorkHeader
        heading="Phiếu nhập điều chuyển"
        transferId={transferId}
        transferCode={sheet.transferCode}
        shipmentNumber={sheet.shipmentNumber}
        shipmentStatus={sheet.status}
        route={'Nhận tại ' + warehouses.destinationWarehouseName}
      />
      <Alert>
        <AlertTitle>Kiểm hàng trước khi cất</AlertTitle>
        <AlertDescription>
          Tốt, hỏng và thiếu phải khớp số đã xuất.{' '}
          {sheet.receiptFlowVersion === 1
            ? 'Đợt theo luồng cũ: nộp kiểm đếm chưa ghi tồn, cất là bước nhận tồn.'
            : 'Luồng mới ghi thực nhận đúng một lần tại vị trí nhận. Hàng đạt có thể giữ tại khu nhận hoặc tiếp tục cất; hàng hỏng phải đặt riêng và bị Hold.'}
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
        <div className="grid shrink-0 gap-3 border p-3 sm:grid-cols-2">
          {staged ? (
            sheet.stagingPoints ? (
              <StagingPointChoice
                id="transfer-receiving-staging"
                title="Điểm thực tế nhận hàng"
                points={sheet.stagingPoints}
                value={receivingSlotId}
                disabled={busy || startUncertain}
                onChange={(value) =>
                  receivingForm.setValue('receivingSlotId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            ) : (
              <p role="alert">Chưa tải được điểm chờ nhận. Vui lòng tải lại phiếu.</p>
            )
          ) : (
            <>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="transfer-slot-search">Tìm mã/vị trí nhận</FieldLabel>
                <Input
                  id="transfer-slot-search"
                  value={slotSearch}
                  onChange={(event) => setSlotSearch(event.target.value)}
                  disabled={busy || startUncertain}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="transfer-receiving-location">
                  Vị trí thực tế nhận hàng
                </FieldLabel>
                <NativeSelect
                  id="transfer-receiving-location"
                  {...receivingForm.register('receivingSlotId')}
                  disabled={busy || startUncertain || locations.isFetching || locations.isError}
                >
                  <NativeSelectOption value="">Chọn vị trí nhận</NativeSelectOption>
                  {!locations.isPlaceholderData &&
                    locations.data?.map((slot) => (
                      <NativeSelectOption key={slot.id} value={slot.id}>
                        {slot.path}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
                <FieldError>{receivingForm.formState.errors.receivingSlotId?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="transfer-receiving-code">Quét/nhập mã vị trí nhận</FieldLabel>
                <Input
                  id="transfer-receiving-code"
                  maxLength={200}
                  {...receivingForm.register('scannedSlotCode')}
                  disabled={busy || startUncertain}
                />
                <FieldError>{receivingForm.formState.errors.scannedSlotCode?.message}</FieldError>
              </Field>
              {locations.isError && (
                <p role="alert">Chưa tải được vị trí nhận. Vui lòng tải lại.</p>
              )}
            </>
          )}
          <Button disabled={busy || isStartResolved} onClick={() => void startReceiving()}>
            {start.isPending ? <Spinner /> : <PackageCheck />}
            {startUncertain ? 'Kiểm tra lại thao tác nhận hàng' : 'Bắt đầu nhận hàng'}
          </Button>
        </div>
      ) : null}
      {staged && sheet.status !== 'InTransit' && sheet.receivingSlotId && sheet.stagingPoints && (
        <StagingPointChoice
          id="transfer-frozen-receiving"
          title="Điểm đã nhận hàng"
          points={sheet.stagingPoints}
          value={sheet.receivingSlotId}
          frozen
          onChange={() => undefined}
        />
      )}
      {sheet.status === 'Receiving' && sheet.receiptFlowVersion === 2 && (
        <>
          <Field className="shrink-0">
            <FieldLabel htmlFor="transfer-damage-search">
              Tìm vị trí cách biệt hàng hỏng nếu có
            </FieldLabel>
            <Input
              id="transfer-damage-search"
              value={slotSearch}
              onChange={(event) => setSlotSearch(event.target.value)}
              disabled={busy || count.unknownResult}
            />
          </Field>
          <TransferReceivingDisposition
            form={count.form}
            slots={locations.isError || locations.isPlaceholderData ? [] : (locations.data ?? [])}
            receivingSlotId={sheet.receivingSlotId}
            disabled={
              !mayReceive ||
              busy ||
              count.unknownResult ||
              locations.isFetching ||
              locations.isError
            }
          />
        </>
      )}
      {sheet.keptAtReceiving && (
        <Alert>
          <AlertTitle>Hàng đạt giữ tại khu nhận</AlertTitle>
          <AlertDescription>
            Đã ghi tồn tại điểm nhận và mở khả dụng theo FEFO. Bạn vẫn có thể tiếp tục cất vào kệ,
            không ghi nhập tồn lần nữa.
          </AlertDescription>
          <Button asChild variant="outline" className="mt-3 min-h-11">
            <Link href={APP_ROUTES.transferPutAwayTask(transferId, shipmentId)}>
              Mở trang cất hàng
            </Link>
          </Button>
        </Alert>
      )}
      {sheet.status === 'Receiving' && !mayReceive ? (
        <Alert>
          <AlertDescription>
            Chỉ người được giao hoặc quản lý kho nhập đủ quyền mới được nộp phiếu. Bạn đang xem dữ
            liệu.
          </AlertDescription>
        </Alert>
      ) : null}
      <OperationalListPanel
        className="flex-none"
        aria-label="Đối chiếu hàng điều chuyển"
        aria-busy={busy}
      >
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
            {sheet.receiptFlowVersion === 2
              ? keepAtReceiving
                ? 'Thực nhận được ghi vào tồn một lần. Hàng đạt khả dụng tại khu nhận; hàng hỏng Hold ở vị trí riêng đã xác nhận.'
                : 'Thực nhận được ghi vào tồn một lần; hàng đạt chờ cất, hàng hỏng Hold ở vị trí riêng.'
              : 'Tồn kho chưa thay đổi ở bước này theo luồng cũ.'}
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
