'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import { PutawayPlanSheet, ReceiptDetail } from '../components/ReceiptDetailPage'
import { ReceiveGoodsDialog } from '../components/ReceivingPage'
import { AssignWarehouseTaskDialog } from '../components/TaskAssignment'
import { inventoryService } from '@/features/inventory/services/inventory.service'
import { useAssignWarehouseTask } from '../hooks/use-assign-warehouse-task'
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
  const [isEditing, setIsEditing] = useState(false)
  const detailQuery = useGoodsReceiptQuery(receiptId)
  const actionsQuery = useInboundAllowedActionsQuery(receiptId)
  const submitMutation = useSubmitGoodsReceiptMutation()
  const approveMutation = useApproveGoodsReceiptMutation()
  const rejectMutation = useRejectGoodsReceiptMutation()
  const updateMutation = useUpdateGoodsReceiptMutation()
  const assignment = useAssignWarehouseTask()
  const planEditor = usePutawayPlanEditor(detailQuery.data)
  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: { inboundRequestId: '', receiptCode: '', lines: [] },
  })

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
    form.reset({
      inboundRequestId: receipt.inboundRequestId,
      receiptCode: receipt.receiptCode,
      lines: receipt.items.flatMap((item) =>
        item.inboundRequestItemId
          ? [
              {
                inboundRequestItemId: item.inboundRequestItemId,
                receivedQty: item.receivedQuantity,
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
    try {
      await updateMutation.mutateAsync({
        receiptId,
        request: {
          receiptCode: values.receiptCode,
          lines: values.lines.map((line) => ({
            inboundRequestItemId: line.inboundRequestItemId,
            receivedQty: line.receivedQty,
            enteredUnitId: line.enteredUnitId,
            damagedQty: line.damagedQty,
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

  async function perform(action: 'submit' | 'approve' | 'reject', reason?: string) {
    try {
      if (action === 'submit') {
        const receipt = detailQuery.data
        if (!receipt?.version) return false
        await submitMutation.mutateAsync({ receiptId, expectedVersion: receipt.version })
      } else if (action === 'approve') {
        const receipt = detailQuery.data
        if (!receipt) return false
        await approveMutation.mutateAsync({
          receiptId,
          expectedVersion: receipt.version,
          selfApprovalAcknowledged: actionsQuery.data?.selfApprovalRequired === true,
        })
      } else await rejectMutation.mutateAsync({ receiptId, reason: reason ?? '' })
      toast.success(
        action === 'submit'
          ? 'Đã xác nhận hàng đến và gửi kết quả kiểm hàng để duyệt.'
          : action === 'approve'
            ? 'Đã duyệt kết quả kiểm hàng; hàng sẵn sàng để cất.'
            : 'Đã trả phiếu nhận hàng để chỉnh sửa.'
      )
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
      <ReceiptDetail
        receipt={receipt}
        allowedActions={actionsQuery.data?.allowedActions ?? []}
        selfApprovalRequired={actionsQuery.data?.selfApprovalRequired ?? false}
        isPending={isPending}
        onUpdate={openEditor}
        onSubmit={() => perform('submit')}
        onApprove={() => perform('approve')}
        onReject={(reason) => perform('reject', reason)}
        onAssignPutAway={openAssignPutAway}
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
