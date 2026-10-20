'use client'

import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { APP_ROUTES } from '@/routes/app-routes'
import { CycleCountDetailView } from '../components/CycleCountDetailPage'
import { cycleCountService } from '../services/cycle-count.service'
import {
  useCancelCycleCountMutation,
  useCreateStockAdjustmentVoucherMutation,
  useCycleCountAllowedActionsQuery,
  useCycleCountQuery,
  useFinalizeCycleCountMutation,
  useRecordCycleCountItemsMutation,
  useRequestRecountMutation,
  useConfirmCycleCountDamageMutation,
  useStartCycleCountMutation,
  useUploadCycleCountEvidenceMutation,
  useSubmitCycleCountMutation,
} from '../hooks/use-cycle-count'
import {
  cancelCycleCountSchema,
  createStockAdjustmentVoucherSchema,
  recountSchema,
  type CancelCycleCountFormValues,
  type CreateStockAdjustmentVoucherFormValues,
  type RecountFormValues,
} from '../schemas/cycle-count.schema'

export default function CycleCountDetailPage({ cycleCountId }: { readonly cycleCountId: string }) {
  const router = useRouter()
  const detail = useCycleCountQuery(cycleCountId)
  const actions = useCycleCountAllowedActionsQuery(cycleCountId)
  const me = useMeQuery()
  const record = useRecordCycleCountItemsMutation()
  const uploadEvidence = useUploadCycleCountEvidenceMutation()
  const start = useStartCycleCountMutation()
  const submit = useSubmitCycleCountMutation()
  const recount = useRequestRecountMutation()
  const confirmDamage = useConfirmCycleCountDamageMutation()
  const finalize = useFinalizeCycleCountMutation()
  const cancel = useCancelCycleCountMutation()
  const createVoucher = useCreateStockAdjustmentVoucherMutation()
  const recountForm = useForm<RecountFormValues>({
    resolver: zodResolver(recountSchema),
    defaultValues: { itemIds: [], reason: '' },
  })
  const voucherForm = useForm<CreateStockAdjustmentVoucherFormValues>({
    resolver: zodResolver(createStockAdjustmentVoucherSchema),
    defaultValues: { cycleCountItemIds: [], reason: '' },
  })
  const cancelForm = useForm<CancelCycleCountFormValues>({
    resolver: zodResolver(cancelCycleCountSchema),
    defaultValues: { reason: '' },
  })
  const pending =
    record.isPending ||
    start.isPending ||
    submit.isPending ||
    recount.isPending ||
    finalize.isPending ||
    createVoucher.isPending ||
    cancel.isPending
  async function perform(action: () => Promise<unknown>, message: string): Promise<boolean> {
    try {
      await action()
      toast.success(message)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.')
      return false
    }
  }
  async function handleUploadEvidence(file: File) {
    const warehouseId = detail.data?.warehouseId
    if (!warehouseId) return null
    try {
      const response = await uploadEvidence.mutateAsync({ warehouseId, file })
      return { id: response.data.id, fileName: response.data.fileName }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải ảnh lên. Vui lòng thử lại.'))
      return null
    }
  }

  async function handleDownloadEvidence(evidenceId: string, fileName: string) {
    try {
      await cycleCountService.downloadEvidence(evidenceId, fileName)
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể tải ảnh. Vui lòng thử lại.'))
    }
  }

  if (detail.isLoading || actions.isLoading) return <OperationalLoadingState rows={8} />
  if (detail.isError || actions.isError || !detail.data)
    return (
      <OperationalErrorState
        title="Không thể tải phiếu kiểm kê"
        onRetry={() => void Promise.all([detail.refetch(), actions.refetch()])}
      />
    )
  return (
    <CycleCountDetailView
      detail={detail.data}
      allowedActions={actions.data?.allowedActions ?? []}
      isPending={pending}
      isBeforeSchedule={actions.data?.denialReasonCode === 'NOT_YET_SCHEDULED'}
      canConfirmDamage={actions.data?.allowedActions.includes('ConfirmDamage') ?? false}
      canOpenDamageCases={me.data?.permissions.includes(P.INVENTORY_VIEW) ?? false}
      onConfirmDamage={(itemIds) =>
        perform(
          () => confirmDamage.mutateAsync({ cycleCountId, itemIds }),
          'Đã xác nhận hàng hỏng.'
        )
      }
      evidenceActions={{
        onUpload: handleUploadEvidence,
        onDownload: (evidenceId, fileName) => void handleDownloadEvidence(evidenceId, fileName),
      }}
      canCreateAdjustment={me.data?.permissions.includes(P.STOCK_ADJUSTMENTS_CREATE) ?? false}
      recountForm={recountForm}
      voucherForm={voucherForm}
      cancelForm={cancelForm}
      onSaveItems={(entries) =>
        perform(
          () =>
            record.mutateAsync({
              cycleCountId,
              items: entries.map((entry) => ({
                itemId: entry.itemId,
                countedQuantity: entry.quantity,
                countedDamagedQuantity: entry.damagedQuantity,
                note: entry.note,
                countMethod: entry.countMethod,
                scannedBarcode: entry.scannedBarcode,
                damageReason: entry.damageReason,
                damageEvidenceIds: entry.damageEvidenceIds,
              })),
            }),
          `Đã lưu ${entries.length} dòng kiểm kê.`
        )
      }
      onStart={() =>
        perform(
          () => start.mutateAsync(cycleCountId),
          'Đã bắt đầu kiểm kê và cập nhật tồn sổ sách.'
        )
      }
      onSubmit={async () => {
        await perform(() => submit.mutateAsync(cycleCountId), 'Đã gửi kết quả kiểm kê.')
      }}
      onRecount={(itemIds, reason) =>
        perform(
          () => recount.mutateAsync({ cycleCountId, request: { itemIds, reason } }),
          'Đã yêu cầu kiểm đếm lại.'
        )
      }
      onCancel={(reason) =>
        perform(
          () => cancel.mutateAsync({ cycleCountId, request: { reason } }),
          'Đã huỷ phiếu kiểm kê.'
        )
      }
      onExport={async () => {
        await perform(
          () =>
            cycleCountService.exportCycleCount(cycleCountId, `kiem-ke-${detail.data.code}.xlsx`),
          'Đã xuất danh sách kiểm kê.'
        )
      }}
      onFinalize={async () => {
        await perform(() => finalize.mutateAsync(cycleCountId), 'Đã hoàn tất phiếu kiểm kê.')
      }}
      onCreateVoucher={async (itemIds, reason) => {
        try {
          const response = await createVoucher.mutateAsync({
            cycleCountId,
            cycleCountItemIds: itemIds,
            reason,
          })
          toast.success(`Đã tạo phiếu điều chỉnh ${itemIds.length} dòng.`)
          router.push(APP_ROUTES.stockAdjustmentVoucherDetail(response.data))
          return true
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Không thể tạo phiếu điều chỉnh.')
          return false
        }
      }}
    />
  )
}
