'use client'

import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { StockAdjustmentDetailView } from '../components/StockAdjustmentViews'
import {
  useApproveStockAdjustmentMutation,
  useRejectStockAdjustmentMutation,
  useStockAdjustmentAllowedActionsQuery,
  useStockAdjustmentQuery,
} from '../hooks/use-cycle-count'
import {
  rejectStockAdjustmentSchema,
  type RejectStockAdjustmentFormValues,
} from '../schemas/cycle-count.schema'

export default function StockAdjustmentDetailPage({
  adjustmentId,
}: {
  readonly adjustmentId: string
}) {
  const detail = useStockAdjustmentQuery(adjustmentId)
  const actions = useStockAdjustmentAllowedActionsQuery(adjustmentId)
  const approve = useApproveStockAdjustmentMutation()
  const reject = useRejectStockAdjustmentMutation()
  const rejectForm = useForm<RejectStockAdjustmentFormValues>({
    resolver: zodResolver(rejectStockAdjustmentSchema),
    defaultValues: { reason: '' },
  })
  const pending = approve.isPending || reject.isPending
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
  if (detail.isLoading || actions.isLoading) return <OperationalLoadingState rows={7} />
  if (detail.isError || actions.isError || !detail.data)
    return (
      <OperationalErrorState
        title="Không thể tải đề nghị điều chỉnh"
        onRetry={() => void Promise.all([detail.refetch(), actions.refetch()])}
      />
    )
  return (
    <StockAdjustmentDetailView
      detail={detail.data}
      allowedActions={actions.data?.allowedActions ?? []}
      selfApprovalRequired={actions.data?.selfApprovalRequired ?? false}
      isPending={pending}
      rejectForm={rejectForm}
      onApprove={(selfApprovalAcknowledged) =>
        perform(
          () => approve.mutateAsync({ adjustmentId, request: { selfApprovalAcknowledged } }),
          'Đã duyệt và cập nhật tồn kho.'
        )
      }
      onReject={(reason) =>
        perform(
          () => reject.mutateAsync({ adjustmentId, request: { reason } }),
          'Đã từ chối đề nghị điều chỉnh.'
        )
      }
    />
  )
}
