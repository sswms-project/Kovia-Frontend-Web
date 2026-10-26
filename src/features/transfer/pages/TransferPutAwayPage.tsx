'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { PutawaySuggestionPanel } from '@/components/operations/putaway'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useWarehouseLayoutQuery } from '@/features/warehouse/hooks/use-warehouse'
import { getPutawaySlotOptions } from '@/features/inbound/utils/putaway-slot-options'
import { APP_ROUTES } from '@/routes/app-routes'
import { TransferPutawayPlanWorkspace } from '../components/TransferDetailPage'
import {
  TransferChangedBanner,
  TransferConfirmDialog,
  TransferUnsavedChanges,
} from '../components/TransferShared'
import {
  TransferPutAwayForm,
  TransferPutAwayStatus,
  TransferWorkHeader,
} from '../components/TransferWork'
import { useTransferPlanEditor } from '../hooks/use-transfer-plan-editor'
import {
  useTransferPutAwayPlanSuggestionsQuery,
  useTransferPutAwayRulesQuery,
} from '../hooks/use-transfer-putaway-plan'
import { useTransferPutAwayForm } from '../hooks/use-transfer-putaway-form'
import {
  useTransferPutAwaySheetQuery,
  useResumeTransferPutAwayMutation,
} from '../hooks/use-transfer-receipt'
import { newCommandId } from '../utils/transfer-command-id'
import { describeTransferError } from '../utils/transfer-errors'
import type { ResumeTransferPutAwayRequest } from '../types/transfer-receipt.types'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import { useTransferPutAwaySlotsQuery, useTransferQuery } from '../hooks/use-transfers'
import {
  canSeeWarehouse,
  canHandleTransferPutAway,
  getShipmentCapabilities,
  getTransferCapabilities,
} from '../utils/transfer-capabilities'
import { transferPutAwayPlanStates } from '../utils/transfer-putaway'
import { adaptTransferPutawaySuggestions } from '../utils/transfer-putaway-plan'
import { TransferSlotMapDialog } from '../components/TransferFormPage'
import type { TransferPutAwayPlanSuggestions } from '../types/transfer.types'

interface Props {
  readonly transferId: string
  readonly shipmentId?: string
  readonly initialTab?: 'plan' | 'execution'
}

/** Hai chế độ là nút chuyển: có khung và nền riêng để nhìn ra là bấm được kể cả khi chưa chọn. */
const MODE_TAB_CLASS = 'bg-card border-border min-h-11 flex-none border px-4'

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
  const resume = useResumeTransferPutAwayMutation()
  const resumeIntent = useRef<ResumeTransferPutAwayRequest | null>(null)
  const resumeLock = useRef(false)
  const canResume = Boolean(
    sheet?.canResumePutAway &&
    shipment &&
    canHandleTransferPutAway(viewer, shipment.putAwayAssigneeId, transfer?.destinationWarehouseId)
  )
  const canSee = canSeeWarehouse(viewer, transfer?.destinationWarehouseId)
  const canPlan = getTransferCapabilities(viewer, transfer).canSetPutAwaySlots
  const canPutAway = Boolean(
    shipment &&
    getShipmentCapabilities(viewer, shipment, transfer).canOpenPutAway &&
    [1, 2].includes(sheet?.receipt.receiptFlowVersion ?? 0)
  )
  const [tab, setTab] = useState(initialTab)
  const [applyPlanOpen, setApplyPlanOpen] = useState(false)
  const [mapIndex, setMapIndex] = useState<number | null>(null)
  const [suggestionVersion, setSuggestionVersion] = useState('')
  const [hideSuggestions, setHideSuggestions] = useState(false)
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    target: 'plan' | 'execution'
    data: TransferPutAwayPlanSuggestions
    only?: { itemId: string; slotId: string }
    version: string
  } | null>(null)
  const applyPlanButton = useRef<HTMLButtonElement>(null)
  const executionTab = useRef<HTMLButtonElement>(null)
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
  const slots = useTransferPutAwaySlotsQuery(
    { warehouseId: transfer?.destinationWarehouseId ?? '', search: searchTerm, top: 20 },
    Boolean(transfer && canSee)
  )
  const slotOptions = useMemo(
    () => (slots.data ?? []).map((slot) => ({ value: slot.id, label: slot.path })),
    [slots.data]
  )
  const layout = useWarehouseLayoutQuery(
    transfer?.destinationWarehouseId ?? '',
    Boolean(transfer && canSee && tab === 'plan')
  )
  const capacitySlots = useMemo(() => getPutawaySlotOptions(layout.data ?? []), [layout.data])
  const suggestions = useTransferPutAwayPlanSuggestionsQuery(transferId, shipmentId)
  const reloadLock = useRef(false)
  const [reloading, setReloading] = useState(false)
  const busy =
    editor.isPending || putAway.isPending || putAway.isFindingSlot || reloading || resume.isPending
  const snapshotBlocked = Boolean(
    editor.reloadRequired || putAway.reloadRequired || putAway.unknownResult
  )
  const sourceVersion = `${transferId}|${shipmentId ?? ''}|${transfer?.version}|${sheet?.receipt.version}|${sheet?.planVersion}`
  const transferOpen =
    transfer?.status === 'InProgress' || transfer?.status === 'AwaitingResolution'
  const rulesReady = Boolean(
    isReady &&
    canSee &&
    (canPlan || canPutAway) &&
    transfer &&
    transferOpen &&
    !detail.isError &&
    !detail.isFetching &&
    !busy &&
    !snapshotBlocked &&
    (!shipmentId ||
      (sheet &&
        !query.isError &&
        !query.isFetching &&
        (shipment?.status === 'AwaitingPutAway' ||
          shipment?.status === 'Receiving' ||
          shipment?.status === 'InTransit')))
  )
  const rules = useTransferPutAwayRulesQuery(transferId, shipmentId, sourceVersion, rulesReady)
  useEffect(() => {
    if (!rulesReady || !rules.data || rules.isFetching) return
    editor.seedSuggestions(rules.data)
    if (sheet && mapIndex === null) putAway.applySuggestions(rules.data, sheet, true)
  }, [rulesReady, rules.data, rules.isFetching, editor, putAway, sheet, mapIndex])
  const visibleSuggestions =
    suggestionVersion === sourceVersion && !hideSuggestions ? suggestions.data : undefined
  function applySuggestion(only?: { itemId: string; slotId: string }) {
    if (!visibleSuggestions || busy || snapshotBlocked) return
    const target: 'plan' | 'execution' = tab === 'plan' ? 'plan' : 'execution'
    if (target === 'plan' ? !canPlan : putAway.blocked) return
    const request = { target, data: visibleSuggestions, only, version: sourceVersion }
    if (target === 'plan' ? editor.isDirty : putAway.form.formState.isDirty)
      setPendingSuggestion(request)
    else if (target === 'plan') editor.apply(visibleSuggestions, only)
    else if (sheet) putAway.applySuggestions(visibleSuggestions, sheet, false, only)
  }
  const suggestionLock = useRef(false)
  async function suggest() {
    if (
      !(tab === 'plan' ? canPlan : canPutAway && !putAway.blocked) ||
      suggestionLock.current ||
      busy ||
      snapshotBlocked ||
      !transferOpen
    )
      return
    suggestionLock.current = true
    try {
      const result = await suggestions.refetch()
      if (!result.isError) {
        setSuggestionVersion(sourceVersion)
        setHideSuggestions(false)
      }
    } finally {
      suggestionLock.current = false
    }
  }
  const entries = putAway.form.watch('entries')
  const planStates = sheet ? transferPutAwayPlanStates(sheet, entries) : []
  async function reload(source: 'reload' | 'saved' = 'reload') {
    if (reloadLock.current || editor.isPending || putAway.isPending || putAway.isFindingSlot) return
    reloadLock.current = true
    setReloading(true)
    try {
      const [fresh, newSheet] = await Promise.all([
        detail.refetch(),
        shipmentId ? query.refetch() : Promise.resolve(null),
      ])
      if (fresh.data && !fresh.isError) editor.rebase(fresh.data, source)
      if (newSheet?.data && !newSheet.isError) putAway.acceptFresh(newSheet.data)
      if (!fresh.isError && !newSheet?.isError) realtime.dismiss()
    } finally {
      reloadLock.current = false
      setReloading(false)
    }
  }
  async function resumePutAway() {
    if (!canResume || !sheet?.receipt.version || !shipmentId || resumeLock.current || busy) return
    resumeLock.current = true
    const request = resumeIntent.current ?? {
      expectedVersion: sheet.receipt.version,
      commandId: newCommandId(),
    }
    resumeIntent.current = request
    try {
      await resume.mutateAsync({ transferId, shipmentId, request })
      resumeIntent.current = null
      await reload()
      toast.success('Đã mở lại nhiệm vụ cất hàng. Chỉ cất phần còn khả dụng tại khu nhận.')
    } catch (error) {
      const result = describeTransferError(error, 'Không thể tiếp tục cất hàng.')
      if (result.kind !== 'unknown-result') resumeIntent.current = null
      toast.error(result.message)
    } finally {
      resumeLock.current = false
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
  const remaining =
    sheet?.rows
      .filter((row) => row.qualityStatus === 'Good')
      .reduce((sum, row) => sum + row.remainingQuantity, 0) ?? 0
  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 max-md:[&_[role=tab]]:min-h-11 pointer-coarse:[&_[role=tab]]:min-h-11 max-md:[&_a]:min-h-11 pointer-coarse:[&_a]:min-h-11 max-md:[&_button]:min-h-11 pointer-coarse:[&_button]:min-h-11',
        tab === 'plan' && 'gap-5'
      )}
    >
      {shipment && tab === 'execution' ? (
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
            <p className="text-primary text-xs font-medium">Cất hàng</p>
            <h1 className="font-mono text-xl font-semibold break-words" translate="no">
              {transfer.transferCode}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs break-words sm:text-sm">
              {transfer.sourceWarehouseName} → {transfer.destinationWarehouseName}
              {shipment ? ` · Đợt ${shipment.shipmentNumber}` : ''}
            </p>
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
            if (!busy && (value === 'plan' || value === 'execution')) setTab(value)
          }}
        >
          <TabsList variant="workspace" aria-label="Chế độ cất hàng" className="h-auto flex-wrap">
            <TabsTrigger value="plan" disabled={busy} className={MODE_TAB_CLASS}>
              Kế hoạch của quản lý
            </TabsTrigger>
            <TabsTrigger
              ref={executionTab}
              value="execution"
              disabled={busy}
              className={MODE_TAB_CLASS}
            >
              Cất hàng thực tế
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      <OperationalListPanel
        className="rounded-none border-0 bg-transparent"
        aria-label={tab === 'plan' ? 'Kế hoạch cất hàng' : 'Thực hiện cất hàng'}
        aria-busy={busy || rules.isFetching}
      >
        <div
          data-slot="operational-list-body"
          data-scrollbar="slim"
          className={cn('flex flex-col', tab === 'plan' ? 'gap-5 px-0' : 'gap-3')}
        >
          {rules.data &&
          (rules.data.risks.length > 0 ||
            rules.data.items.some((item) => item.unallocatedQuantity > 0)) ? (
            <Alert role="status">
              <AlertDescription>
                {rules.data.summary}
                {rules.data.risks.slice(0, 3).map((risk) => (
                  <p key={risk}>{risk}</p>
                ))}
                {rules.data.items.some((item) => item.unallocatedQuantity > 0) ? (
                  <p>
                    Phần chưa đủ chỗ vẫn được giữ lại; hãy kiểm tra sức chứa hoặc chọn vị trí khác.
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {tab === 'plan' ? (
            <>
              <TransferPutawayPlanWorkspace
                transfer={transfer}
                editor={editor}
                canManage={canPlan && !busy}
                slotOptions={slotOptions}
                capacitySlots={capacitySlots}
                isLoadingSlots={slots.isFetching && capacitySlots.length === 0}
                onSlotSearchChange={setSearch}
                suggestions={visibleSuggestions}
                isSuggesting={suggestions.isFetching}
                suggestionError={
                  suggestions.error
                    ? getApiErrorMessage(suggestions.error, 'Không lấy được gợi ý. Hãy thử lại.')
                    : null
                }
                onSuggest={() => void suggest()}
                onReload={reload}
                onSaved={() => reload('saved')}
                onApplySuggestion={applySuggestion}
              />
              {!editor.isOpen && canPlan ? (
                <Button variant="outline" onClick={() => editor.open()}>
                  Chỉnh lại kế hoạch
                </Button>
              ) : null}
            </>
          ) : sheet ? (
            <>
              <TransferPutAwayStatus sheet={sheet} remaining={remaining} canResume={canResume}>
                {canResume && (
                  <Button className="min-h-11" disabled={busy} onClick={() => void resumePutAway()}>
                    {resume.isPending && <Spinner />}Tiếp tục cất vào kệ
                  </Button>
                )}
              </TransferPutAwayStatus>
              {canPutAway && remaining > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
                    {rules.isFetching
                      ? 'Đang tìm vị trí và điền số lượng…'
                      : rules.error
                        ? 'Chưa lấy được gợi ý; bạn có thể chọn vị trí thủ công.'
                        : 'Vị trí và số lượng được điền sẵn; bạn có thể chỉnh lại.'}
                  </p>
                  <Button
                    variant="outline"
                    disabled={busy || putAway.blocked || suggestions.isFetching}
                    onClick={() => void suggest()}
                  >
                    {suggestions.isFetching ? <Spinner /> : <Sparkles />}Gợi ý AI
                  </Button>
                </div>
              ) : null}
              {rules.error || suggestions.error ? (
                <Alert role="alert">
                  <AlertDescription>
                    {getApiErrorMessage(
                      rules.error ?? suggestions.error,
                      'Không lấy được gợi ý. Có thể chọn vị trí thủ công hoặc thử lại.'
                    )}
                  </AlertDescription>
                  <Button
                    variant="outline"
                    disabled={!rulesReady || rules.isFetching}
                    onClick={() => void rules.refetch()}
                  >
                    Thử lại gợi ý theo quy tắc kho
                  </Button>
                </Alert>
              ) : null}
              {visibleSuggestions ? (
                <PutawaySuggestionPanel
                  items={transfer.items.map((item) => ({
                    id: item.id,
                    productSKU: item.sku,
                    productName: item.productName,
                    baseUnitName: item.baseUnitName,
                  }))}
                  state={{
                    suggestions: adaptTransferPutawaySuggestions(visibleSuggestions),
                    isSuggesting: suggestions.isFetching,
                    onSuggest: () => void suggest(),
                    onApply: (itemId, slotId) => applySuggestion({ itemId, slotId }),
                    onApplyBest: () => applySuggestion(),
                    onClear: () => setHideSuggestions(true),
                  }}
                  disabled={busy || putAway.blocked || suggestions.isFetching}
                />
              ) : null}
              {putAway.notice ? (
                <Alert role="status">
                  <AlertDescription>{putAway.notice}</AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {putAway.reloadRequired || putAway.unknownResult ? (
                      <Button variant="outline" disabled={busy} onClick={() => void reload()}>
                        Tải lại và giữ số lượng đang nhập
                      </Button>
                    ) : null}
                    {putAway.planUpdateAvailable ? (
                      <Button
                        ref={applyPlanButton}
                        variant="outline"
                        disabled={busy || putAway.blocked}
                        onClick={() => setApplyPlanOpen(true)}
                      >
                        Áp dụng kế hoạch mới
                      </Button>
                    ) : null}
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
              <TransferPutAwayForm
                validationAttempt={putAway.validationAttempt}
                fields={putAway.fields}
                rows={sheet.rows}
                planStates={planStates}
                changedLines={putAway.changedLines}
                form={putAway.form}
                disabled={putAway.blocked || busy}
                pendingScan={putAway.isFindingSlot}
                slotOptions={slotOptions}
                loadingSlots={slots.isFetching}
                onSearchSlots={setSearch}
                onMarkUnreadable={putAway.markUnreadable}
                onChangeSlot={putAway.changeSlot}
                onOpenMap={setMapIndex}
                onScanSlot={putAway.scanSlot}
                onScanProduct={putAway.scanProduct}
                onSplit={putAway.split}
                onSplitExcess={putAway.splitExcess}
                onRemove={putAway.remove}
              />
              {putAway.form.formState.errors.entries?.root?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {putAway.form.formState.errors.entries.root.message}
                </p>
              ) : null}
              {sheet.putAwayLines.length > 0 ? (
                <section>
                  <h2 className="mb-2 text-sm font-semibold">Lịch sử đã cất</h2>
                  <div className="bg-card border">
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
                  </div>
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
              {putAway.isPending ? <Spinner /> : null}
              {remaining > 0 ? 'Xác nhận cất hàng' : 'Hoàn tất cất hàng'}
            </Button>
          </footer>
        ) : null}
      </OperationalListPanel>
      <TransferSlotMapDialog
        open={mapIndex !== null}
        warehouseId={transfer.destinationWarehouseId}
        title="Chọn vị trí cất hàng"
        description="Chọn vị trí nhận hàng tại kho nhập; quét xác nhận sau khi chọn."
        onOpenChange={(open) => {
          if (!open) setMapIndex(null)
        }}
        onConfirm={(pick) => {
          if (mapIndex !== null && !busy && !putAway.blocked)
            putAway.changeSlot(mapIndex, { value: pick.slotId, label: pick.label })
          setMapIndex(null)
        }}
      />
      <TransferConfirmDialog
        open={pendingSuggestion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSuggestion(null)
        }}
        title="Thay phân bổ đang chỉnh bằng gợi ý?"
        description="Vị trí và số lượng trong phạm vi áp dụng sẽ được điền lại. Mã quét bị xóa; bạn cần kiểm tra và quét lại."
        confirmLabel="Áp dụng gợi ý"
        pendingLabel="Đang áp dụng…"
        isPending={busy}
        onConfirm={() => {
          if (!pendingSuggestion || busy) return
          if (pendingSuggestion.version !== sourceVersion) {
            setPendingSuggestion(null)
            toast.info('Phiếu đã thay đổi. Hãy tải gợi ý mới trước khi áp dụng.')
            return
          }
          if (pendingSuggestion.target === 'plan')
            editor.apply(pendingSuggestion.data, pendingSuggestion.only)
          else if (sheet)
            putAway.applySuggestions(pendingSuggestion.data, sheet, false, pendingSuggestion.only)
          setPendingSuggestion(null)
        }}
      />
      <TransferConfirmDialog
        actionClassName="h-11 md:h-8 pointer-coarse:h-11"
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
      <TransferConfirmDialog
        open={applyPlanOpen}
        onOpenChange={setApplyPlanOpen}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const target = applyPlanButton.current ?? executionTab.current
          target?.focus()
        }}
        title="Áp dụng kế hoạch mới?"
        description="Khai báo cất sẽ được dựng lại theo số thực nhận còn lại. Số lượng đang chỉnh, vị trí chọn thủ công và mã quét sẽ được bỏ; bạn cần kiểm tra và quét lại trước khi cất."
        confirmLabel="Áp dụng kế hoạch mới"
        pendingLabel="Đang xử lý…"
        isPending={busy}
        actionClassName="h-11 md:h-8 pointer-coarse:h-11"
        onConfirm={() => {
          if (!busy && !putAway.blocked) {
            putAway.applyPlan()
            setApplyPlanOpen(false)
          }
        }}
      />
      <TransferUnsavedChanges
        dirty={editor.isDirty || putAway.form.formState.isDirty || putAway.unknownResult}
        busy={busy}
      />
    </div>
  )
}
