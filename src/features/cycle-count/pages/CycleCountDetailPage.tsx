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
import { APP_ROUTES } from '@/routes/app-routes'
import { CycleCountDetailView } from '../components/CycleCountDetailPage'
import { cycleCountService } from '../services/cycle-count.service'
import {
  useCancelCycleCountMutation,
  useCreateStockAdjustmentVoucherMutation,
  useCycleCountAllowedActionsQuery,
  useInvalidateCycleCount,
  useCycleCountQuery,
  useFinalizeCycleCountMutation,
  useRecordCycleCountItemMutation,
  useRequestRecountMutation,
  useStartCycleCountMutation,
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
  const record = useRecordCycleCountItemMutation()
  const invalidateCycleCount = useInvalidateCycleCount()
  const start = useStartCycleCountMutation()
  const submit = useSubmitCycleCountMutation()
  const recount = useRequestRecountMutation()
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
      canCreateAdjustment={me.data?.permissions.includes(P.STOCK_ADJUSTMENTS_CREATE) ?? false}
      recountForm={recountForm}
      voucherForm={voucherForm}
      cancelForm={cancelForm}
      onSaveItems={(entries) =>
        perform(async () => {
          // ponytail: ghi lần lượt từng dòng, thêm API lưu hàng loạt nếu phiếu có hàng trăm dòng.
          try {
            for (const entry of entries)
              await record.mutateAsync({
                cycleCountId,
                itemId: entry.itemId,
                countedQuantity: entry.quantity,
                countedDamagedQuantity: entry.damagedQuantity,
                note: entry.note,
                countMethod: entry.countMethod,
                scannedBarcode: entry.scannedBarcode,
              })
          } finally {
            // Dòng đã lưu trước khi lỗi vẫn cần hiện lại, nên invalidate cả khi thất bại.
            await invalidateCycleCount()
          }
        }, `Đã lưu ${entries.length} dòng kiểm kê.`)
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
