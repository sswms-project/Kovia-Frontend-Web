'use client'

import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  MapPin,
  MapPinned,
  MessageSquareWarning,
  PencilLine,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useId, useMemo } from 'react'
import { LifecycleTimeline } from '@/components/operations/LifecycleTimeline'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { P } from '@/config/permissionCodes'
import { useTransferAssignableStaffQuery } from '../hooks/use-transfer-receipt'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { APP_ROUTES } from '@/routes/app-routes'
import { TransferGoodsTable } from '../components/TransferGoods'
import {
  AddFeedbackDialog,
  AdjustAllocationDialog,
  CreateShipmentDialog,
  ReplyFeedbackDialog,
  ResolveDiscrepancyDialog,
  ResolveEscalationDialog,
  TransferDiscrepancyPanel,
  TransferFeedbackPanel,
  TransferNextSteps,
  TransferOverview,
  TransferRequestDecisionPanel,
  TransferShipmentsPanel,
} from '../components/TransferDetailPage'
import {
  TransferConfirmDialog,
  TransferReasonDialog,
  TransferUnsavedChanges,
} from '../components/TransferShared'
import { TransferStatusBadge } from '../components/TransfersPage'
import { useTransferAllocationActions } from '../hooks/use-transfer-allocation-actions'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferRequestActions } from '../hooks/use-transfer-request-actions'
import { useTransferRequestDecision } from '../hooks/use-transfer-request-decision'
import { useTransferResolutionActions } from '../hooks/use-transfer-resolution-actions'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import { useTransferQuery } from '../hooks/use-transfers'
import { useTransferStartReceiving } from '../hooks/use-transfer-start-receiving'
import { AssignWarehouseTaskDialog } from '@/features/inbound/components/TaskAssignment'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  getShipmentCapabilities,
  getTransferCapabilities,
  hasOpenFeedback,
  remainingQuantity,
} from '../utils/transfer-capabilities'
import { getTransferNextSteps, type TransferNextStepAction } from '../utils/transfer-next-steps'
import { canSeeWarehouse } from '../utils/transfer-capabilities'
import { visibleTransferItems } from '../utils/transfer-form'
import { transferGoodsRows } from '../utils/transfer-goods-rows'
import { transferTabIds } from '../utils/transfer-tabs'
import { buildTransferHistory } from '../utils/transfer-history'

import {
  parseTransferDetailTab,
  type TransferDetailTab as DetailTab,
} from '../utils/transfer-detail-tabs'

export default function TransferDetailPage({ transferId }: { readonly transferId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requested = parseTransferDetailTab(searchParams.get('tab'))
  const tabBaseId = useId()
  function setTab(value: DetailTab) {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', value)
    window.history.pushState(null, '', `${window.location.pathname}?${params}`)
  }
  const { viewer } = useTransferViewer()
  const detailQuery = useTransferQuery(transferId)
  const transfer = detailQuery.data
  useTransferRealtime({ transferId })

  const requestActions = useTransferRequestActions(transfer)
  const requestDecision = useTransferRequestDecision(transfer)
  const canAssignPreparation =
    viewer.permissions.includes(P.WAREHOUSE_TASKS_ASSIGN) &&
    viewer.permissions.includes(P.TRANSFERS_DISPATCH)
  const preparationStaff = useTransferAssignableStaffQuery(
    requestActions.shipment.isOpen && canAssignPreparation
      ? (transfer?.sourceWarehouseId ?? null)
      : null,
    'TransferPick'
  )
  const resolutionActions = useTransferResolutionActions(transfer)
  const allocationActions = useTransferAllocationActions(transfer)
  const capabilities = getTransferCapabilities(viewer, transfer)
  const receiving = useTransferStartReceiving(transferId)
  const shipments = useMemo(() => transfer?.shipments ?? [], [transfer?.shipments])
  const discrepancies = transfer?.discrepancies ?? []
  const feedbacks = transfer?.feedbacks ?? []
  const shipmentCapabilities = useMemo(
    () =>
      Object.fromEntries(
        shipments.map((shipment) => [
          shipment.id,
          getShipmentCapabilities(viewer, shipment, transfer),
        ])
      ),
    [shipments, viewer, transfer]
  )
  const nextSteps = useMemo(
    () =>
      transfer ? getTransferNextSteps(viewer, transfer, capabilities, shipmentCapabilities) : [],
    [viewer, transfer, capabilities, shipmentCapabilities]
  )
  const tab = requested ?? 'execution'
  const tabIds = transferTabIds(tabBaseId, tab)
  function runNextStep(action: TransferNextStepAction) {
    if (action.type === 'createShipment') requestActions.shipment.open()
    else if (action.type === 'adjustAllocation') allocationActions.open()
    else if (action.type === 'openPutAwayPlan') router.push(APP_ROUTES.transferPlan(transferId))
    else if (action.type === 'startReceiving') void receiving.start(action.shipment)
    else if (action.type === 'assign') resolutionActions.assign.open(action.shipment, action.kind)
    else if (action.type === 'confirmDeparture') resolutionActions.departure.open(action.shipment)
    else if (action.type === 'resolveDiscrepancy') {
      setTab('execution')
      document.getElementById('transfer-exceptions')?.scrollIntoView({ block: 'start' })
    } else if (action.type === 'resolveEscalation') {
      setTab('execution')
      resolutionActions.escalation.open(action.shipment)
    }
  }
  const history = useMemo(() => (transfer ? buildTransferHistory(transfer) : []), [transfer])
  const rows = useMemo(() => transferGoodsRows(transfer), [transfer])
  const closing = requestActions.closing
  const unitsByItem = Object.fromEntries(
    rows.map((row) => [row.id, { unit: row.unit, conversion: row.conversion }])
  )

  const tabs: ReadonlyArray<{ value: DetailTab; label: string }> = [
    { value: 'execution', label: 'Thực hiện' },
    { value: 'goods', label: 'Hàng hóa' },
    { value: 'history', label: 'Lịch sử' },
  ]

  return (
    <div
      data-slot="transfer-scroll"
      data-edge
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-3 sm:pr-4 lg:pr-5"
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Quay lại danh sách"
            onClick={() => router.push(APP_ROUTES.transfers)}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium">Điều chuyển kho</p>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              <span className="font-mono" translate="no">
                {transfer?.transferCode ?? '…'}
              </span>
              {transfer ? <TransferStatusBadge status={transfer.status} /> : null}
            </h1>
          </div>
        </div>
        {transfer ? (
          <div className="flex flex-wrap gap-2">
            {capabilities.canEditDraft ? (
              <Button asChild size="sm" variant="outline">
                <Link href={APP_ROUTES.transferEdit(transfer.id)}>
                  <PencilLine aria-hidden="true" />
                  Soạn tiếp nháp
                </Link>
              </Button>
            ) : null}
            {capabilities.canEdit ||
            capabilities.canGiveFeedback ||
            capabilities.canSetPutAwaySlots ||
            capabilities.canAdjustAllocation ||
            capabilities.closingAction ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal aria-hidden="true" />
                    Thao tác khác
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={4}>
                  <DropdownMenuGroup>
                    {capabilities.canEdit ? (
                      <DropdownMenuItem asChild>
                        <Link href={APP_ROUTES.transferEdit(transfer.id)}>
                          <PencilLine aria-hidden="true" />
                          Sửa yêu cầu
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {capabilities.canGiveFeedback ? (
                      <DropdownMenuItem onSelect={requestActions.feedback.open}>
                        <MessageSquareWarning aria-hidden="true" />
                        Phản hồi
                      </DropdownMenuItem>
                    ) : null}
                    {capabilities.canSetPutAwaySlots ? (
                      <DropdownMenuItem
                        onSelect={() => router.push(APP_ROUTES.transferPlan(transferId))}
                      >
                        <MapPin aria-hidden="true" />
                        Kế hoạch cất hàng
                      </DropdownMenuItem>
                    ) : null}
                    {capabilities.canAdjustAllocation ? (
                      <DropdownMenuItem onSelect={allocationActions.open}>
                        <MapPinned aria-hidden="true" />
                        Điều chỉnh phân bổ
                      </DropdownMenuItem>
                    ) : null}
                    {capabilities.closingAction ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => closing.open(capabilities.closingAction ?? 'cancel')}
                      >
                        {capabilities.closingAction === 'stop' ? 'Dừng phần còn lại' : 'Hủy phiếu'}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </header>

      {detailQuery.isLoading ? (
        <OperationalLoadingState rows={4} />
      ) : detailQuery.isError || !transfer ? (
        <OperationalErrorState
          title="Không thể tải phiếu điều chuyển"
          onRetry={() => void detailQuery.refetch()}
        />
      ) : (
        <>
          {transfer.hasOpenFeedback || hasOpenFeedback(feedbacks) ? (
            <Alert className="shrink-0" role="status">
              <MessageSquareWarning aria-hidden="true" />
              <AlertTitle>Có phản hồi cần xử lý</AlertTitle>
              <AlertDescription>
                Quản lý kho đã báo vấn đề với phiếu này. Xem phần Chênh lệch / Phản hồi trong tab
                Thực hiện để trả lời, sửa phiếu, dừng phần còn lại hoặc hủy phiếu trong mục Thao tác
                khác.
              </AlertDescription>
            </Alert>
          ) : null}
          {receiving.notice ? (
            <Alert role="status">
              <AlertDescription>
                {receiving.notice} Bấm lại Nhận hàng để kiểm tra đúng thao tác trước.
              </AlertDescription>
            </Alert>
          ) : null}
          <TransferOverview transfer={transfer} />
          <TransferRequestDecisionPanel
            transfer={transfer}
            canDecide={capabilities.canDecideRequest}
            canWithdraw={capabilities.canWithdrawRequest}
            disabled={
              requestDecision.isPending ||
              requestActions.shipment.isPending ||
              !transfer.version ||
              requestActions.shipment.isOpen ||
              detailQuery.isFetching
            }
            uncertain={requestDecision.uncertain || requestActions.shipment.uncertain}
            onAcceptAndPrepare={requestActions.shipment.open}
            onAccept={() => requestDecision.open('accept')}
            onReject={() => requestDecision.open('reject')}
            onWithdraw={() => requestDecision.open('withdraw')}
            onVerify={() => {
              if (requestDecision.uncertain) void requestDecision.verify()
              else requestActions.shipment.open()
            }}
          />
          <Tabs
            value={tab}
            onValueChange={(value) => {
              const next = tabs.find((candidate) => candidate.value === value)
              if (next) setTab(next.value)
            }}
            className={cn('w-full min-w-0 gap-2', tab === 'goods' ? 'min-h-0 flex-1' : 'flex-none')}
          >
            <TabsList
              variant="workspace"
              aria-label="Nội dung phiếu điều chuyển"
              className="h-auto w-full min-w-0 shrink-0 flex-wrap justify-start"
            >
              {tabs.map((candidate) => (
                <TabsTrigger
                  key={candidate.value}
                  value={candidate.value}
                  id={tabIds.tabId(candidate.value)}
                  aria-controls={tabIds.panelId}
                  className="h-auto min-h-11 flex-none px-3 py-1.5"
                >
                  {candidate.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <OperationalListPanel
              {...tabIds.panelProps}
              // Các tab dạng thẻ (đợt xuất, chênh lệch…) chảy theo chiều cao nội dung và cuộn cùng trang,
              // không bị nhốt trong một khung cố định nên vẫn xem được trên màn nhỏ và điện thoại.
              className={
                tab === 'goods'
                  ? 'min-h-64'
                  : 'flex-none overflow-visible [&>[data-slot=operational-list-body]]:flex-none [&>[data-slot=operational-list-body]]:overflow-visible'
              }
            >
              {tab === 'goods' ? (
                <TransferGoodsTable
                  key={transfer.id}
                  selected
                  rows={rows}
                  showAllocation={canSeeWarehouse(viewer, transfer.sourceWarehouseId)}
                  showDestinationSlot={canSeeWarehouse(viewer, transfer.destinationWarehouseId)}
                />
              ) : (
                <div data-slot="operational-list-body">
                  {tab === 'execution' ? (
                    <>
                      <TransferNextSteps
                        transferId={transfer.id}
                        steps={nextSteps.filter((step) => step.action.type === 'createShipment')}
                        onAction={runNextStep}
                      />
                      {shipments.length > 0 || !capabilities.canCreateShipment ? (
                        <TransferShipmentsPanel
                          transferId={transfer.id}
                          mode="execution"
                          nextSteps={nextSteps}
                          onNextAction={runNextStep}
                          currentUserId={viewer.currentUserId}
                          shipments={shipments}
                          planLabels={Object.fromEntries(
                            transfer.items.map((item) => [
                              item.id,
                              (item.putAwayPlan ?? [])
                                .map(
                                  (line) =>
                                    `${line.path}: ${formatQuantity(line.plannedTotal)} ${item.baseUnitName ?? ''}`
                                )
                                .join(' · '),
                            ])
                          )}
                          onOpenPlan={
                            canSeeWarehouse(viewer, transfer.destinationWarehouseId)
                              ? () => router.push(APP_ROUTES.transferPlan(transferId))
                              : undefined
                          }
                          capabilities={shipmentCapabilities}
                          onCancelShipment={requestActions.cancelShipment.open}
                          onConfirmDeparture={resolutionActions.departure.open}
                          onReopenPicking={resolutionActions.reopen.open}
                          onAssignTask={resolutionActions.assign.open}
                          onStartReceiving={(shipment) => void receiving.start(shipment)}
                          isStartingReceive={receiving.isPending}
                          onResolveEscalation={resolutionActions.escalation.open}
                          unitsByItem={unitsByItem}
                        />
                      ) : null}
                      {discrepancies.length > 0 || feedbacks.length > 0 ? (
                        <div id="transfer-exceptions" className="grid gap-4 border-t">
                          <TransferDiscrepancyPanel
                            discrepancies={discrepancies}
                            canResolve={capabilities.canResolveDiscrepancy}
                            onResolve={resolutionActions.discrepancy.open}
                          />
                          <TransferFeedbackPanel
                            feedbacks={feedbacks}
                            canReply={capabilities.canReplyFeedback}
                            onReply={requestActions.reply.open}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="p-4">
                      <LifecycleTimeline events={history} />
                    </div>
                  )}
                </div>
              )}
            </OperationalListPanel>
          </Tabs>
        </>
      )}

      <TransferReasonDialog
        open={closing.kind !== null}
        title={closing.kind === 'stop' ? 'Dừng phần còn lại?' : 'Hủy phiếu điều chuyển?'}
        description={
          closing.kind === 'stop'
            ? `Phần chưa xuất (${formatQuantity(transfer ? remainingQuantity(transfer) : 0)} theo ĐVT chính) sẽ bị dừng và nhả giữ chỗ. Các đợt đã xuất vẫn được nhận và xử lý chênh lệch bình thường.`
            : `Mọi đợt đang lấy hàng được hủy, toàn bộ ${formatQuantity(transfer ? visibleTransferItems(transfer.items).reduce((total, item) => total + item.quantity, 0) : 0)} (ĐVT chính) giữ chỗ được nhả và phiếu chuyển sang Đã hủy.`
        }
        confirmLabel={closing.kind === 'stop' ? 'Dừng phần còn lại' : 'Hủy phiếu'}
        pendingLabel="Đang xử lý…"
        form={closing.form}
        isPending={closing.isPending}
        onOpenChange={closing.onOpenChange}
        onSubmit={(values) => void closing.submit(values)}
      />
      <TransferConfirmDialog
        open={Boolean(resolutionActions.departure.shipment)}
        title="Xác nhận xe đã rời kho?"
        description={
          <p>
            Hệ thống sẽ trừ tồn kho xuất theo số hàng đã lấy của đợt{' '}
            {resolutionActions.departure.shipment?.shipmentNumber} và chuyển đợt sang đang vận
            chuyển để kho nhập nhận hàng. Thao tác này không hoàn tác được.
          </p>
        }
        confirmLabel="Xác nhận đã xuất kho"
        pendingLabel="Đang xử lý…"
        isPending={resolutionActions.departure.isPending}
        onOpenChange={resolutionActions.departure.onOpenChange}
        onConfirm={() => void resolutionActions.departure.confirm()}
      />
      <TransferReasonDialog
        open={Boolean(resolutionActions.reopen.shipment)}
        title="Mở lại lấy hàng?"
        description="Đợt quay về trạng thái đang lấy hàng để nhân viên lấy lại hoặc trả hàng. Nhập lý do để nhân viên biết cần làm gì."
        confirmLabel="Mở lại lấy hàng"
        pendingLabel="Đang xử lý…"
        destructive={false}
        form={resolutionActions.reopen.form}
        isPending={resolutionActions.reopen.isPending}
        onOpenChange={resolutionActions.reopen.onOpenChange}
        onSubmit={(values) => void resolutionActions.reopen.submit(values)}
      />
      <AdjustAllocationDialog
        open={allocationActions.isOpen}
        items={allocationActions.items}
        itemId={allocationActions.itemId}
        options={allocationActions.options}
        isLoading={allocationActions.isLoading}
        isError={allocationActions.isError}
        isPending={allocationActions.isPending}
        onSelectItem={allocationActions.select}
        onOpenChange={allocationActions.onOpenChange}
        onSubmit={allocationActions.submit}
      />
      <AddFeedbackDialog
        open={requestActions.feedback.isOpen}
        form={requestActions.feedback.form}
        itemOptions={visibleTransferItems(transfer?.items ?? []).map((item) => ({
          id: item.id,
          label: `${item.sku} · ${item.productName}`,
        }))}
        isPending={requestActions.feedback.isPending}
        onOpenChange={requestActions.feedback.onOpenChange}
        onSubmit={(values) => void requestActions.feedback.submit(values)}
      />
      <ReplyFeedbackDialog
        open={Boolean(requestActions.reply.target)}
        feedbackMessage={requestActions.reply.target?.message ?? ''}
        form={requestActions.reply.form}
        isPending={requestActions.reply.isPending}
        onOpenChange={requestActions.reply.onOpenChange}
        onSubmit={(values) => void requestActions.reply.submit(values)}
      />
      <CreateShipmentDialog
        acceptingRequest={transfer?.status === 'PendingSourceAcceptance'}
        open={requestActions.shipment.isOpen}
        form={requestActions.shipment.form}
        isPending={requestActions.shipment.isPending}
        uncertain={requestActions.shipment.uncertain}
        canAssign={canAssignPreparation}
        currentUserId={viewer.currentUserId}
        staff={preparationStaff.data}
        isLoadingStaff={preparationStaff.isLoading}
        isErrorStaff={preparationStaff.isError}
        onRetryStaff={() => void preparationStaff.refetch()}
        onOpenChange={requestActions.shipment.onOpenChange}
        onSubmit={(values) => void requestActions.shipment.submit(values)}
      />
      <TransferReasonDialog
        open={Boolean(requestActions.cancelShipment.target)}
        title={`Hủy đợt xuất ${requestActions.cancelShipment.target?.shipmentNumber ?? ''}?`}
        description="Phần kế hoạch của đợt quay về chưa vào đợt (vẫn giữ chỗ) và công việc lấy hàng bị hủy. Hàng đã lấy phải được trả về vị trí trước."
        confirmLabel="Hủy đợt"
        pendingLabel="Đang hủy…"
        form={requestActions.cancelShipment.form}
        isPending={requestActions.cancelShipment.isPending}
        onOpenChange={requestActions.cancelShipment.onOpenChange}
        onSubmit={(values) => void requestActions.cancelShipment.submit(values)}
      />
      <AssignWarehouseTaskDialog
        title={resolutionActions.assign.alsoPutAway ? 'Giao việc nhận và cất hàng' : undefined}
        target={resolutionActions.assign.target}
        form={resolutionActions.assign.form}
        staff={resolutionActions.assign.staff}
        isLoadingStaff={resolutionActions.assign.isLoadingStaff}
        isErrorStaff={resolutionActions.assign.isErrorStaff}
        isFetchingStaff={resolutionActions.assign.isFetchingStaff}
        onRetryStaff={resolutionActions.assign.onRetryStaff}
        isPending={resolutionActions.assign.isPending}
        lockSelection={Object.keys(resolutionActions.assign.results).length > 0}
        submitDisabled={resolutionActions.assign.needsVerify}
        onOpenChange={resolutionActions.assign.onOpenChange}
        onSubmit={resolutionActions.assign.onSubmit}
      >
        {resolutionActions.assign.canChooseDestinationScope ? (
          <Field>
            <FieldLabel htmlFor="assign-destination-scope">Giao cho nhân viên này</FieldLabel>
            <NativeSelect
              id="assign-destination-scope"
              value={resolutionActions.assign.destinationAssignmentScope}
              disabled={
                resolutionActions.assign.isPending ||
                Object.keys(resolutionActions.assign.results).length > 0
              }
              onChange={(event) => {
                const scope = event.target.value
                if (scope === 'both' || scope === 'receive' || scope === 'putaway')
                  resolutionActions.assign.selectDestinationScope(scope)
              }}
            >
              <NativeSelectOption value="both">
                Kiểm nhận và cất hàng — cùng một người
              </NativeSelectOption>
              <NativeSelectOption value="receive">Chỉ kiểm nhận</NativeSelectOption>
              <NativeSelectOption value="putaway">Chỉ cất hàng</NativeSelectOption>
            </NativeSelect>
            <FieldDescription>
              Đang giao kiểm nhận: {resolutionActions.assign.destinationAssignees.receive} · Cất
              hàng: {resolutionActions.assign.destinationAssignees.putaway}. Chọn riêng từng phần
              nếu cần giao cho hai người khác nhau.
            </FieldDescription>
          </Field>
        ) : resolutionActions.assign.target?.kind === 'TransferReceive' ? (
          <p className="text-muted-foreground text-xs">
            Giao người kiểm nhận trước. Công việc cất được tạo khi bắt đầu nhận hàng.
          </p>
        ) : null}
        {Object.entries(resolutionActions.assign.results).map(([kind, message]) => (
          <p key={kind} role="status" className="text-sm">
            {kind === 'receive' ? 'Kiểm nhận' : kind === 'putaway' ? 'Cất hàng' : 'Lấy hàng'}:{' '}
            {message}
          </p>
        ))}
        {resolutionActions.assign.needsVerify ? (
          <Button
            variant="outline"
            disabled={resolutionActions.assign.isPending}
            onClick={() => void resolutionActions.assign.verify()}
          >
            Tải lại để xác minh công việc chưa rõ kết quả
          </Button>
        ) : null}
      </AssignWarehouseTaskDialog>
      <ResolveEscalationDialog
        open={resolutionActions.escalation.isOpen}
        escalations={resolutionActions.escalation.escalations}
        selectedExceptionId={resolutionActions.escalation.selectedExceptionId}
        alternatives={resolutionActions.escalation.alternatives}
        isLoading={resolutionActions.escalation.isLoading}
        form={resolutionActions.escalation.form}
        isPending={resolutionActions.escalation.isPending}
        onSelect={resolutionActions.escalation.select}
        onOpenChange={resolutionActions.escalation.onOpenChange}
        onSubmit={(values) => void resolutionActions.escalation.submit(values)}
      />
      <ResolveDiscrepancyDialog
        unknownResult={resolutionActions.discrepancy.unknownResult}
        discrepancy={resolutionActions.discrepancy.target}
        form={resolutionActions.discrepancy.form}
        lotOptions={resolutionActions.discrepancy.lotOptions}
        isPending={resolutionActions.discrepancy.isPending}
        onOpenChange={resolutionActions.discrepancy.onOpenChange}
        onSubmit={(values) => void resolutionActions.discrepancy.submit(values)}
      />
      <TransferUnsavedChanges
        dirty={
          resolutionActions.discrepancy.unknownResult ||
          requestActions.shipment.uncertain ||
          requestDecision.uncertain
        }
        busy={
          resolutionActions.discrepancy.isPending ||
          receiving.isPending ||
          requestActions.shipment.isPending ||
          requestDecision.isPending
        }
      />
      <TransferReasonDialog
        open={requestDecision.kind === 'reject' && !requestDecision.uncertain}
        title="Từ chối yêu cầu điều chuyển?"
        description="Nhập lý do để kho nhận biết và điều chỉnh. Thao tác không giữ chỗ hoặc thay đổi tồn kho."
        confirmLabel="Từ chối yêu cầu"
        pendingLabel="Đang xử lý…"
        form={requestDecision.form}
        isPending={requestDecision.isPending}
        onOpenChange={(open) => {
          if (!open) requestDecision.close()
        }}
        onSubmit={(values) => void requestDecision.submit(values.reason)}
      />
      <TransferConfirmDialog
        open={
          (requestDecision.kind === 'accept' || requestDecision.kind === 'withdraw') &&
          !requestDecision.uncertain
        }
        title={
          requestDecision.kind === 'withdraw'
            ? 'Thu hồi yêu cầu về nháp?'
            : 'Chấp nhận yêu cầu điều chuyển?'
        }
        description={
          requestDecision.kind === 'withdraw'
            ? 'Yêu cầu sẽ không còn chờ kho xuất xác nhận. Bạn có thể sửa nội dung và gửi lại.'
            : 'Hệ thống kiểm tra lại tồn và giữ chỗ toàn bộ hàng yêu cầu. Bạn có thể chuẩn bị xuất sau.'
        }
        confirmLabel={requestDecision.kind === 'withdraw' ? 'Thu hồi yêu cầu' : 'Chấp nhận'}
        pendingLabel="Đang xử lý…"
        isPending={requestDecision.isPending}
        onOpenChange={(open) => {
          if (!open) requestDecision.close()
        }}
        onConfirm={() => void requestDecision.submit()}
      />
    </div>
  )
}
