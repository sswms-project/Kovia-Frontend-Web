'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import { TransferPutawayPlanWorkspace } from '../components/TransferDetailPage/TransferPutawayPlanWorkspace'
import {
  TransferChangedBanner,
  TransferConfirmDialog,
  TransferUnsavedChanges,
} from '../components/TransferShared'
import { TransferPutAwayEntryCard, TransferWorkHeader } from '../components/TransferWork'
import { useTransferPlanEditor } from '../hooks/use-transfer-plan-editor'
import { useTransferPutAwayPlanSuggestionsQuery } from '../hooks/use-transfer-putaway-plan'
import { useTransferPutAwayForm } from '../hooks/use-transfer-putaway-form'
import { useTransferPutAwaySheetQuery } from '../hooks/use-transfer-receipt'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import { useTransferQuery, useTransferReceivableSlotsQuery } from '../hooks/use-transfers'
import {
  canSeeWarehouse,
  getShipmentCapabilities,
  getTransferCapabilities,
} from '../utils/transfer-capabilities'
import { transferPutAwayPlanStates } from '../utils/transfer-putaway'

interface Props {
  readonly transferId: string
  readonly shipmentId?: string
  readonly initialTab?: 'plan' | 'execution'
}

export default function TransferPutAwayPage({
  transferId,
  shipmentId,
  initialTab = 'plan',
}: Props) {
  const { viewer, isReady } = useTransferViewer()
  const detail = useTransferQuery(transferId)
  const transfer = detail.data
  const shipment = transfer?.shipments?.find((row) => row.id === shipmentId)
  const query = useTransferPutAwaySheetQuery(transferId, shipmentId ?? '', Boolean(shipmentId))
  const sheet = query.data
  const canSee = canSeeWarehouse(viewer, transfer?.destinationWarehouseId)
  const canPlan = getTransferCapabilities(viewer, transfer).canSetPutAwaySlots
  const canPutAway = Boolean(
    shipment &&
    getShipmentCapabilities(viewer, shipment, transfer).canOpenPutAway &&
    sheet?.receipt.receiptFlowVersion === 1
  )
  const [tab, setTab] = useState(initialTab)
  const precision = useMemo(
    () =>
      new Map(
        (transfer?.items ?? []).map((item) => [
          item.baseUnitId ?? '',
          item.baseQuantityPrecision ?? 2,
        ])
      ),
    [transfer?.items]
  )
  const editor = useTransferPlanEditor(transfer, precision, canPlan)
  const initialized = useRef(false)
  useEffect(() => {
    if (transfer && !initialized.current) {
      initialized.current = true
      editor.open()
    }
  }, [transfer, editor])
  const putAway = useTransferPutAwayForm(sheet, transfer?.destinationWarehouseId ?? '', canPutAway)
  const realtime = useTransferRealtime({ transferId, autoRefresh: false })
  const [search, setSearch] = useState('')
  const searchTerm = useDebouncedValue(search.trim(), 300)
  const slots = useTransferReceivableSlotsQuery(
    { warehouseId: transfer?.destinationWarehouseId ?? '', search: searchTerm, top: 20 },
    Boolean(transfer && canSee)
  )
  const slotOptions = useMemo(
    () => (slots.data ?? []).map((slot) => ({ value: slot.id, label: slot.path })),
    [slots.data]
  )
  const suggestions = useTransferPutAwayPlanSuggestionsQuery(transferId, shipmentId)
  const suggestionLock = useRef(false)
  async function suggest() {
    if (!canPlan || suggestionLock.current || busy) return
    suggestionLock.current = true
    try {
      await suggestions.refetch()
    } finally {
      suggestionLock.current = false
    }
  }
  const reloadLock = useRef(false)
  const [reloading, setReloading] = useState(false)
  const busy = editor.isPending || putAway.isPending || putAway.isFindingSlot || reloading
  const entries = putAway.form.watch('entries')
  const planStates = sheet ? transferPutAwayPlanStates(sheet, entries) : []
  async function reload() {
    if (reloadLock.current || editor.isPending || putAway.isPending || putAway.isFindingSlot) return
    reloadLock.current = true
    setReloading(true)
    try {
      const [fresh, newSheet] = await Promise.all([
        detail.refetch(),
        shipmentId ? query.refetch() : Promise.resolve(null),
      ])
      if (fresh.data && !fresh.isError) editor.rebase(fresh.data)
      if (newSheet?.data && !newSheet.isError) putAway.acceptFresh(newSheet.data)
      if (!fresh.isError && !newSheet?.isError) realtime.dismiss()
    } finally {
      reloadLock.current = false
      setReloading(false)
    }
  }
  if (!isReady || detail.isLoading || (shipmentId && query.isLoading))
    return <OperationalLoadingState rows={4} />
  if (!transfer || detail.isError || (shipmentId && (!shipment || query.isError || !sheet)))
    return (
      <OperationalErrorState title="Không thể tải trang cất hàng" onRetry={() => void reload()} />
    )
  if (!canSee)
    return (
      <Alert>
        <AlertDescription>
          Bạn không được phân công tại kho nhập để xem trang cất hàng.
        </AlertDescription>
      </Alert>
    )
  const remaining = sheet?.rows.reduce((sum, row) => sum + row.remainingQuantity, 0) ?? 0
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      {shipment ? (
        <TransferWorkHeader
          heading="Chờ cất hàng điều chuyển"
          transferId={transferId}
          transferCode={transfer.transferCode}
          shipmentNumber={shipment.shipmentNumber}
          shipmentStatus={shipment.status}
          route={'Cất tại ' + transfer.destinationWarehouseName}
        />
      ) : (
        <header className="flex shrink-0 items-start gap-3 border-b pb-3">
          <Button asChild variant="outline" size="icon">
            <Link href={APP_ROUTES.transferDetail(transferId)} aria-label="Quay lại phiếu">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-primary text-xs">Kế hoạch cất hàng</p>
            <h1 className="text-lg font-semibold" translate="no">
              {transfer.transferCode}
            </h1>
          </div>
        </header>
      )}
      {realtime.hasPendingChange ? (
        <TransferChangedBanner onReload={() => void reload()} onDismiss={realtime.dismiss} />
      ) : null}
      {shipmentId ? (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === 'plan' || value === 'execution') setTab(value)
          }}
        >
          <TabsList variant="workspace" aria-label="Chế độ cất hàng">
            <TabsTrigger value="plan">Kế hoạch của quản lý</TabsTrigger>
            <TabsTrigger value="execution">Cất hàng thực tế</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      <OperationalListPanel
        aria-label={tab === 'plan' ? 'Kế hoạch cất hàng' : 'Thực hiện cất hàng'}
        aria-busy={busy}
      >
        <div data-slot="operational-list-body" className="space-y-3 p-3">
          {tab === 'plan' ? (
            <>
              <TransferPutawayPlanWorkspace
                transfer={transfer}
                editor={editor}
                canManage={canPlan && !busy}
                slotOptions={slotOptions}
                isLoadingSlots={slots.isFetching}
                onSlotSearchChange={setSearch}
                suggestions={suggestions.data}
                isSuggesting={suggestions.isFetching}
                suggestionError={
                  suggestions.error
                    ? getApiErrorMessage(suggestions.error, 'Không lấy được gợi ý. Hãy thử lại.')
                    : null
                }
                onSuggest={() => void suggest()}
                onReload={reload}
              />
              {!editor.isOpen && canPlan ? (
                <Button variant="outline" onClick={() => editor.open()}>
                  Chỉnh lại kế hoạch
                </Button>
              ) : null}
            </>
          ) : sheet ? (
            <>
              <Alert>
                <AlertDescription>
                  Đã nhận, chưa cất:{' '}
                  <strong className="tabular-nums">{formatQuantity(remaining)}</strong>. Chỉ bước
                  này mới tăng tồn kho nhận. Hàng hỏng được cất riêng, không trừ ngân sách hàng tốt.
                </AlertDescription>
              </Alert>
              {putAway.notice ? (
                <Alert role="status">
                  <AlertDescription>{putAway.notice}</AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busy} onClick={() => void reload()}>
                      Tải lại và giữ số lượng đang nhập
                    </Button>
                    {putAway.unknownResult ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void putAway.retryUnknown().then((done) => {
                            if (done) void reload()
                          })
                        }
                      >
                        Kiểm tra lại đúng lần cất trước
                      </Button>
                    ) : null}
                  </div>
                </Alert>
              ) : null}
              {sheet.receipt.status !== 'AwaitingPutAway' ? (
                <p className="text-muted-foreground text-sm">
                  {sheet.receipt.status === 'InTransit' || sheet.receipt.status === 'Receiving'
                    ? 'Nộp phiếu nhập trước khi cất hàng.'
                    : 'Đợt đã hoàn tất; lịch sử cất được giữ nguyên.'}
                </p>
              ) : null}
              {putAway.fields.map((field, index) => {
                const row = putAway.rowOf(index)
                if (!row || row.remainingQuantity <= 0) return null
                return (
                  <TransferPutAwayEntryCard
                    key={field.id}
                    index={index}
                    row={row}
                    form={putAway.form}
                    disabled={putAway.blocked || busy}
                    pendingScan={putAway.isFindingSlot}
                    planState={planStates[index]}
                    planChanged={putAway.changedLines.has(row.lineId)}
                    canRemove={
                      entries.filter(
                        (entry) =>
                          entry.lineId === row.lineId &&
                          entry.lotId === row.lotId &&
                          entry.qualityStatus === row.qualityStatus
                      ).length > 1
                    }
                    slotOptions={slotOptions}
                    loadingSlots={slots.isFetching}
                    onSearchSlots={setSearch}
                    onMarkUnreadable={putAway.markUnreadable}
                    onScanSlot={putAway.scanSlot}
                    onScanProduct={putAway.scanProduct}
                    onSplit={putAway.split}
                    onSplitExcess={putAway.splitExcess}
                    onRemove={putAway.remove}
                  />
                )
              })}
              {putAway.form.formState.errors.entries?.root?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {putAway.form.formState.errors.entries.root.message}
                </p>
              ) : null}
              {sheet.putAwayLines.length > 0 ? (
                <section>
                  <h2 className="mb-2 text-sm font-semibold">Lịch sử đã cất</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Vị trí</TableHead>
                        <TableHead>Chất lượng</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead>Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheet.putAwayLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{formatOperationalDateTime(line.putAwayAt)}</TableCell>
                          <TableCell className="break-words whitespace-normal">
                            {line.path}
                          </TableCell>
                          <TableCell>{line.qualityStatus === 'Good' ? 'Tốt' : 'Hỏng'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQuantity(line.quantity)}
                          </TableCell>
                          <TableCell className="max-w-64 break-words whitespace-normal">
                            {line.isLateReceipt ? 'Nhận bổ sung · ' : ''}
                            {line.slotCodeUnreadable ? 'Không quét được mã · ' : ''}
                            {line.note ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
        {tab === 'execution' && canPutAway ? (
          <footer className="bg-card flex shrink-0 flex-wrap items-center justify-between gap-3 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p aria-live="polite" role="status" className="text-sm">
              Đang khai báo cất{' '}
              {formatQuantity(entries.reduce((sum, entry) => sum + (entry.quantity || 0), 0))}
            </p>
            <Button
              disabled={putAway.blocked || busy}
              onClick={() => void putAway.requestConfirm()}
            >
              {putAway.isPending ? <Spinner /> : null}Xác nhận cất hàng
            </Button>
          </footer>
        ) : null}
      </OperationalListPanel>
      <TransferConfirmDialog
        open={putAway.confirmOpen}
        onOpenChange={putAway.setConfirmOpen}
        title="Ghi nhận cất hàng?"
        description="Tồn kho nhận sẽ tăng theo các khai báo này. Có thể cất một phần rồi tiếp tục phần còn lại."
        confirmLabel="Xác nhận cất hàng"
        pendingLabel="Đang cất…"
        isPending={putAway.isPending}
        onConfirm={() =>
          void putAway.confirm().then((done) => {
            if (done) void reload()
          })
        }
      />
      <TransferUnsavedChanges
        dirty={editor.isDirty || putAway.form.formState.isDirty || putAway.unknownResult}
        busy={busy}
      />
    </div>
  )
}
