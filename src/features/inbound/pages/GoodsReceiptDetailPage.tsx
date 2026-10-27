'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LegacyReceiptStockDialog } from '../components/LegacyReceiptStockDialog'
import { useLegacyReceiptStock } from '../hooks/use-legacy-receipt-stock'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import {
  formatApiError,
  getApiErrorCode,
  getApiErrorMessage,
  isApiErrorResponse,
} from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { TaskSplitButton, TaskSplitSection, useTaskSplitQuery } from '@/features/task-splitting'
import { PutawayPlanSheet, ReceiptDetail } from '../components/ReceiptDetailPage'
import { ReceiveGoodsDialog } from '../components/ReceivingPage'
import { AssignWarehouseTaskDialog } from '../components/TaskAssignment'
import { inventoryService } from '@/features/inventory/services/inventory.service'
import { useAssignWarehouseTask } from '../hooks/use-assign-warehouse-task'
import { useReceivingLocationSelection } from '../hooks/use-receiving-location-selection'
import { ReceivingLocationPicker } from '../components/ReceivingLocationPicker'
import { RefusalEvidencePanel } from '../components/RefusalEvidencePanel'
import { ReceiptDamageIsolationDialog } from '../components/ReceiptDamageIsolationDialog'
import { useReceiptDamageIsolation } from '../hooks/use-receipt-damage-isolation'
import { useRefusalEvidence } from '../hooks/use-refusal-evidence'
import { usePutawayPlanEditor } from '../hooks/use-putaway-plan-editor'
import {
  useApproveGoodsReceiptMutation,
  useInboundAllowedActionsQuery,
  useGoodsReceiptQuery,
  useRejectGoodsReceiptMutation,
  useSubmitGoodsReceiptMutation,
  useUpdateGoodsReceiptMutation,
} from '../hooks/use-inbound'
import { goodsReceiptSchema, type GoodsReceiptFormValues } from '../schemas/inbound.schema'
import type { ReceivingTask } from '../types/inbound.types'

export default function GoodsReceiptDetailPage({ receiptId }: { readonly receiptId: string }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editVersion, setEditVersion] = useState('')
  const detailQuery = useGoodsReceiptQuery(receiptId)
  const actionsQuery = useInboundAllowedActionsQuery(receiptId)
  const damageIsolation = useReceiptDamageIsolation(
    detailQuery.data,
    actionsQuery.data?.allowedActions.includes('IsolateDamage') === true
  )
  const refusal = useRefusalEvidence(
    detailQuery.data?.warehouseId,
    `${receiptId}:${detailQuery.data?.version}`
  )
  const legacyStock = useLegacyReceiptStock(
    detailQuery.data,
    actionsQuery.data?.selfApprovalRequired ?? false
  )
  const receivingLocation = useReceivingLocationSelection(
    detailQuery.data?.warehouseId,
    receiptId,
    !detailQuery.data?.arrivalConfirmedAt && !!actionsQuery.data?.allowedActions.includes('Submit')
  )
  const submitMutation = useSubmitGoodsReceiptMutation()
  const approveMutation = useApproveGoodsReceiptMutation()
  const rejectMutation = useRejectGoodsReceiptMutation()
  const updateMutation = useUpdateGoodsReceiptMutation()
  const assignment = useAssignWarehouseTask()
  const split = useTaskSplitQuery('PutAway', receiptId)
  const [isSplitOpen, setIsSplitOpen] = useState(false)
  const planEditor = usePutawayPlanEditor(detailQuery.data)
  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: { inboundRequestId: '', receiptCode: '', lines: [] },
  })

  const receiptLines = useWatch({ control: form.control, name: 'lines' })
  function showMutationError(error: unknown, fallback: string) {
    const message = getApiErrorMessage(error, fallback)
    toast.error(message)
  }

  function logMutationFailure(error: unknown) {
    if (isApiErrorResponse(error)) logger.warn(formatApiError(error))
    else logger.error(error)
  }

  function openEditor() {
    const receipt = detailQuery.data
    if (!receipt) return
    setEditVersion(receipt.version)
    form.reset({
      inboundRequestId: receipt.inboundRequestId,
      receiptCode: receipt.receiptCode,
      lines: receipt.items.flatMap((item) =>
        item.inboundRequestItemId
          ? [
              {
                inboundRequestItemId: item.inboundRequestItemId,
                receivedQty: item.receivedQuantity,
                rejectedQty: item.rejectedQuantity ?? 0,
                enteredUnitId: item.baseUnitId,
                damagedQty: item.damagedQuantity,
                exceptionReason: item.exceptionReason ?? '',
                isLotTracked: Boolean(item.lotId),
                lotNumber: item.lotNumber ?? '',
                manufacturedDate: item.manufacturedDate ?? '',
                expiryDate: item.expiryDate ?? '',
              },
            ]
          : []
      ),
    })
    setIsEditing(true)
  }

  async function saveUpdate(values: GoodsReceiptFormValues, shouldSubmit: boolean) {
    if (
      shouldSubmit &&
      values.lines.some((line) => line.receivedQty > 0) &&
      !detailQuery.data?.arrivalConfirmedAt &&
      (!receivingLocation.selected ||
        receivingLocation.query.isError ||
        receivingLocation.query.isFetching)
    ) {
      toast.error('Vui lòng chọn vị trí thực tế nhận hàng trước khi xác nhận.')
      return
    }
    try {
      const refusalPayload = shouldSubmit
        ? refusal.payload(
            !detailQuery.data?.arrivalConfirmedAt &&
              values.lines.some((line) => (line.rejectedQty ?? 0) > 0)
          )
        : {}
      await updateMutation.mutateAsync({
        receiptId,
        request: {
          expectedVersion: editVersion,
          receiptCode: values.receiptCode,
          lines: values.lines.map((line) => ({
            inboundRequestItemId: line.inboundRequestItemId,
            receivedQty: line.receivedQty,
            enteredUnitId: line.enteredUnitId,
            damagedQty: line.damagedQty,
            rejectedQty: line.rejectedQty ?? 0,
            exceptionReason: line.exceptionReason.trim() || null,
            lotNumber: line.isLotTracked ? line.lotNumber.trim() || null : null,
            manufacturedDate: line.isLotTracked ? line.manufacturedDate || null : null,
            expiryDate: line.isLotTracked ? line.expiryDate || null : null,
          })),
        },
      })
      if (shouldSubmit) {
        const refreshed = await detailQuery.refetch()
        if (!refreshed.data?.version) throw new Error('Missing receipt version')
        await submitMutation.mutateAsync({
          receiptId,
          expectedVersion: refreshed.data.version,
          receivingSlotId: values.lines.some((line) => line.receivedQty > 0)
            ? (detailQuery.data?.receivingSlotId ?? receivingLocation.selected?.id)
            : null,
          ...refusalPayload,
        })
      }
      toast.success(
        shouldSubmit
          ? 'Đã cập nhật, xác nhận hàng đến và gửi kết quả kiểm hàng để duyệt.'
          : 'Đã cập nhật phiếu nhận hàng.'
      )
      setIsEditing(false)
    } catch (error) {
      logMutationFailure(error)
      if (getApiErrorCode(error) === 'GOODS_RECEIPT_CODE_CONFLICT') {
        form.setError(
          'receiptCode',
          { type: 'server', message: getApiErrorMessage(error) },
          { shouldFocus: true }
        )
      }
      showMutationError(
        error,
        'Không thể cập nhật phiếu nhận hàng. Vui lòng kiểm tra dữ liệu và thử lại.'
      )
    }
  }

  function openAssignPutAway() {
    const receipt = detailQuery.data
    if (!receipt) return
    assignment.open({
      kind: 'PutAway',
      id: receipt.id,
      referenceCode: receipt.receiptCode,
      warehouseId: receipt.warehouseId,
      warehouseName: receipt.warehouseName,
      currentAssigneeId: receipt.putAwayAssignedTo,
      currentAssigneeName: receipt.putAwayAssignedToName,
      currentPriority: receipt.putAwayTaskPriority,
      currentDueAt: receipt.putAwayTaskDueAt,
    })
  }

  async function downloadEvidence(evidence: { id: string; fileName: string }) {
    try {
      await inventoryService.downloadEvidence(evidence.id, evidence.fileName)
    } catch (error) {
      logMutationFailure(error)
      showMutationError(error, 'Không thể tải ảnh. Vui lòng thử lại.')
    }
  }

  async function perform(
    action: 'submit' | 'approve' | 'reject',
    reason?: string,
    keepAtReceiving = false
  ) {
    try {
      if (action === 'submit') {
        const receipt = detailQuery.data
        if (!receipt?.version) return false
        const receivingSlotId = receipt.items.some((item) => item.receivedQuantity > 0)
          ? (receipt.receivingSlotId ?? receivingLocation.selected?.id)
          : null
        if (
          !receipt.arrivalConfirmedAt &&
          receipt.items.some((item) => item.receivedQuantity > 0) &&
          (!receivingSlotId ||
            receivingLocation.query.isError ||
            receivingLocation.query.isFetching)
        ) {
          toast.error('Vui lòng chọn vị trí thực tế nhận hàng trước khi xác nhận.')
          return false
        }
        await submitMutation.mutateAsync({
          receiptId,
          expectedVersion: receipt.version,
          receivingSlotId,
          ...refusal.payload(
            !receipt.arrivalConfirmedAt &&
              receipt.items.some((item) => (item.rejectedQuantity ?? 0) > 0)
          ),
        })
      } else if (action === 'approve') {
        const receipt = detailQuery.data
        if (!receipt) return false
        await approveMutation.mutateAsync({
          receiptId,
          expectedVersion: receipt.version,
          selfApprovalAcknowledged: actionsQuery.data?.selfApprovalRequired === true,
          keepAtReceiving,
        })
      } else {
        if (!detailQuery.data?.version) return false
        await rejectMutation.mutateAsync({
          receiptId,
          reason: reason ?? '',
          expectedVersion: detailQuery.data.version,
        })
      }
      toast.success(
        action === 'submit'
          ? 'Đã xác nhận hàng đến và gửi kết quả kiểm hàng để duyệt.'
          : action === 'approve'
            ? keepAtReceiving
              ? 'Đã duyệt. Hàng đạt giữ tại vị trí nhận và có thể được phân bổ FEFO.'
              : 'Đã duyệt kết quả kiểm hàng; hàng tiếp tục theo luồng cất/cách biệt.'
            : 'Đã trả phiếu nhận hàng để chỉnh sửa.'
      )
      if (
        action === 'approve' &&
        !keepAtReceiving &&
        detailQuery.data?.items.some((item) => item.receivedQuantity > 0)
      )
        router.push(APP_ROUTES.inboundPutawayDetail(receiptId) as Route)
      return true
    } catch (error) {
      logMutationFailure(error)
      showMutationError(error, 'Không thể cập nhật phiếu nhận hàng. Vui lòng thử lại.')
      return false
    }
  }

  if (detailQuery.isLoading || actionsQuery.isLoading) return <OperationalLoadingState rows={8} />
  if (detailQuery.isError || actionsQuery.isError || !detailQuery.data)
    return (
      <OperationalErrorState
        title="Không thể tải phiếu nhận hàng"
        onRetry={() => {
          void detailQuery.refetch()
          void actionsQuery.refetch()
        }}
      />
    )
  const receipt = detailQuery.data
  const editTask: ReceivingTask = {
    version: receipt.version,
    inboundRequestId: receipt.inboundRequestId,
    inboundRequestCode: receipt.inboundRequestCode,
    warehouseId: receipt.warehouseId,
    warehouseName: receipt.warehouseName,
    supplierId: '',
    supplierName: receipt.supplierName ?? '',
    supplierCode: receipt.supplierCode,
    sourceName: receipt.sourceName,
    warehouseCode: receipt.warehouseCode,
    expectedDate: null,
    createdAt: receipt.createdAt,
    orderedQuantity: receipt.items.reduce((sum, item) => sum + item.orderedQuantity, 0),
    receivedQuantity: receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0),
    remainingQuantity: 0,
    activeDocumentImportId: null,
    activeGoodsReceiptId: receipt.id,
    activeGoodsReceiptStatus: receipt.status,
    assignedTo: receipt.receivingAssignedTo,
    assignedToName: receipt.receivingAssignedToName,
    assignedAt: null,
    executionStatus: 'Queued',
    priority: 'Normal',
    dueAt: null,
    lines: receipt.items.flatMap((item) =>
      item.inboundRequestItemId
        ? [
            {
              inboundRequestItemId: item.inboundRequestItemId,
              productId: item.productId,
              productSKU: item.productSKU,
              productName: item.productName,
              barcodeValue: null,
              isLotTracked: Boolean(item.lotId),
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: 0,
              remainingQuantity: item.orderedQuantity,
              baseUnitId: item.baseUnitId,
              baseUnitName: item.baseUnitName,
              enteredUnitId: item.enteredUnitId ?? item.baseUnitId,
              enteredUnitName: item.enteredUnitName ?? item.baseUnitName,
              conversionFactorSnapshot: item.conversionFactorSnapshot,
              baseUnitQuantityPrecision:
                item.allowedUnits.find((unit) => unit.unitId === item.baseUnitId)
                  ?.quantityPrecision ?? 2,
              enteredUnitQuantityPrecision:
                item.allowedUnits.find((unit) => unit.unitId === item.enteredUnitId)
                  ?.quantityPrecision ?? 2,
            },
          ]
        : []
    ),
  }
  const isPending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    updateMutation.isPending

  return (
    <>
      {actionsQuery.data?.allowedActions.includes('IsolateDamage') && (
        <div className="shrink-0 py-3">
          <Button variant="outline" onClick={damageIsolation.open}>
            Xác nhận cách biệt hàng hỏng đã nhập
          </Button>
        </div>
      )}
      <ReceiptDamageIsolationDialog state={damageIsolation} />
      {!isEditing &&
        !receipt.arrivalConfirmedAt &&
        actionsQuery.data?.allowedActions.includes('Submit') && (
          <div className="shrink-0 border-b pb-4">
            {receipt.items.some((item) => item.receivedQuantity > 0) && (
              <ReceivingLocationPicker state={receivingLocation} disabled={isPending} />
            )}
            {receipt.items.some((item) => (item.rejectedQuantity ?? 0) > 0) && (
              <RefusalEvidencePanel state={refusal} />
            )}
          </div>
        )}
      {receipt.arrivalConfirmedAt && !receipt.arrivalStockPostedAt && (
        <p role="alert" className="text-destructive shrink-0 border p-3 text-sm">
          Phiếu nhận cũ chưa được đối soát tồn thực nhận. Cần người có quyền phê duyệt kiểm tra số
          đếm, vị trí và bằng chứng trước khi tiếp tục.
        </p>
      )}
      {actionsQuery.data?.allowedActions.includes('ReconcileArrivalStock') && (
        <div className="shrink-0 py-3">
          <Button variant="outline" onClick={legacyStock.open}>
            Đối soát tồn thực nhận có bằng chứng
          </Button>
        </div>
      )}
      <ReceiptDetail
        receipt={receipt}
        allowedActions={actionsQuery.data?.allowedActions ?? []}
        selfApprovalRequired={actionsQuery.data?.selfApprovalRequired ?? false}
        isPending={isPending}
        onUpdate={openEditor}
        onSubmit={() => perform('submit')}
        onApprove={(keepAtReceiving) => perform('approve', undefined, keepAtReceiving)}
        onReject={(reason) => perform('reject', reason)}
        onAssignPutAway={split.data?.isSplit ? undefined : openAssignPutAway}
        taskSplitAction={
          <TaskSplitButton state={split.data} onSplit={() => setIsSplitOpen(true)} />
        }
        taskSplitSection={
          <TaskSplitSection
            state={split.data}
            isError={split.isError}
            onRetry={() => void split.refetch()}
            open={isSplitOpen}
            onOpenChange={setIsSplitOpen}
            invalidateKeys={[queryKeys.goodsReceipts.detail(receiptId)]}
          />
        }
        onPlanPutAway={planEditor.open}
        onDownloadEvidence={(evidence) => void downloadEvidence(evidence)}
      />
      <PutawayPlanSheet
        open={planEditor.isOpen}
        receiptCode={receipt.receiptCode}
        items={planEditor.plannableItems}
        slots={planEditor.slots}
        drafts={planEditor.drafts}
        validation={planEditor.validation}
        suggestions={planEditor.suggestions}
        heldSlots={planEditor.heldSlots}
        isLoadingSlots={planEditor.isLoadingSlots}
        isSlotsError={planEditor.isSlotsError}
        isSuggesting={planEditor.isSuggesting}
        isSaving={planEditor.isSaving}
        onOpenChange={(open) => !open && planEditor.close()}
        onRetrySlots={planEditor.retrySlots}
        onAddLine={planEditor.addLine}
        onChangeLine={planEditor.updateLine}
        onRemoveLine={planEditor.removeLine}
        onFillRemaining={planEditor.fillRemaining}
        onSuggest={() => void planEditor.suggest()}
        onApplySuggestion={planEditor.applySuggestion}
        onApplyBestSuggestions={planEditor.applyBestSuggestions}
        onSave={() => void planEditor.save()}
      />
      <LegacyReceiptStockDialog state={legacyStock} />
      <AssignWarehouseTaskDialog
        target={assignment.target}
        form={assignment.form}
        staff={assignment.staff}
        isLoadingStaff={assignment.isLoadingStaff}
        isErrorStaff={assignment.isErrorStaff}
        isFetchingStaff={assignment.isFetchingStaff}
        onRetryStaff={assignment.onRetryStaff}
        isPending={assignment.isPending}
        onOpenChange={(open) => !open && assignment.close()}
        onSubmit={assignment.onSubmit}
        onUnassign={assignment.onUnassign}
      />
      <ReceiveGoodsDialog
        acceptanceFirst={receipt.receivingFlowVersion === 1}
        receivingLocationField={
          !receipt.arrivalConfirmedAt ? (
            <>
              <ReceivingLocationPicker state={receivingLocation} disabled={isPending} />
              {receiptLines.some((line) => (line.rejectedQty ?? 0) > 0) && (
                <RefusalEvidencePanel state={refusal} />
              )}
            </>
          ) : undefined
        }
        task={isEditing ? editTask : null}
        form={form}
        isPending={isPending}
        title={`Chỉnh sửa ${receipt.receiptCode}`}
        description={
          receipt.status === 'InspectionCorrectionRequired'
            ? 'Chỉ điều chỉnh tình trạng kiểm hàng; số lượng thực nhận và đơn vị được giữ nguyên.'
            : 'Điều chỉnh số lượng thực nhận và tình trạng hàng trước khi gửi duyệt lại.'
        }
        canEditReceivedQuantity={receipt.status !== 'InspectionCorrectionRequired'}
        saveDraftLabel="Lưu thay đổi"
        mode="edit"
        onOpenChange={(open) => {
          if (!open && !isPending) setIsEditing(false)
        }}
        onSaveDraft={() => void form.handleSubmit((values) => saveUpdate(values, false))()}
        onSaveAndSubmit={() => void form.handleSubmit((values) => saveUpdate(values, true))()}
      />
    </>
  )
}
