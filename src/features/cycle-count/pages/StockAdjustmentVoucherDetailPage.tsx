'use client'

import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { StockAdjustmentVoucherDetailView } from '../components/StockAdjustmentVoucherDetailPage'
import {
  useApproveStockAdjustmentVoucherMutation,
  useRejectStockAdjustmentVoucherMutation,
  useStockAdjustmentVoucherAllowedActionsQuery,
  useStockAdjustmentVoucherQuery,
} from '../hooks/use-cycle-count'
import {
  rejectStockAdjustmentSchema,
  type RejectStockAdjustmentFormValues,
} from '../schemas/cycle-count.schema'

export default function StockAdjustmentVoucherDetailPage({
  voucherId,
}: {
  readonly voucherId: string
}) {
  const detail = useStockAdjustmentVoucherQuery(voucherId)
  const actions = useStockAdjustmentVoucherAllowedActionsQuery(voucherId)
  const approve = useApproveStockAdjustmentVoucherMutation()
  const reject = useRejectStockAdjustmentVoucherMutation()
  const rejectForm = useForm<RejectStockAdjustmentFormValues>({
    resolver: zodResolver(rejectStockAdjustmentSchema),
    defaultValues: { reason: '' },
  })
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
        title="Không thể tải phiếu điều chỉnh"
        onRetry={() => void Promise.all([detail.refetch(), actions.refetch()])}
      />
    )
  return (
    <StockAdjustmentVoucherDetailView
      voucher={detail.data}
      allowedActions={actions.data?.allowedActions ?? []}
      selfApprovalRequired={actions.data?.selfApprovalRequired ?? false}
      isPending={approve.isPending || reject.isPending}
      rejectForm={rejectForm}
      onApprove={(excludedLineIds, selfApprovalAcknowledged) =>
        perform(
          () =>
            approve.mutateAsync({
              voucherId,
              request: { selfApprovalAcknowledged, excludedLineIds },
            }),
          'Đã duyệt phiếu và cập nhật tồn kho.'
        )
      }
      onReject={(reason) =>
        perform(
          () => reject.mutateAsync({ voucherId, request: { reason } }),
          'Đã từ chối phiếu điều chỉnh.'
        )
      }
    />
  )
}
