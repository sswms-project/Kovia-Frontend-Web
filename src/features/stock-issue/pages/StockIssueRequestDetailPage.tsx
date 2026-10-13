'use client'

import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { StockIssueRequestDetail } from '../components/StockIssueRequestDetailPage'
import { StockIssueWorkflowDialogs } from '../components/StockIssueWorkflow'
import { useStockIssueRequestQuery } from '../hooks/use-stock-issue-requests'
import { useStockIssueWorkflow } from '../hooks/use-stock-issue-workflow'

export default function StockIssueRequestDetailPage({
  stockIssueRequestId,
}: {
  readonly stockIssueRequestId: string
}) {
  const detailQuery = useStockIssueRequestQuery(stockIssueRequestId)
  const order = detailQuery.data
  const workflow = useStockIssueWorkflow(order?.warehouseId)

  if (detailQuery.isLoading) return <OperationalLoadingState rows={8} />
  if (detailQuery.isError || !order)
    return (
      <OperationalErrorState
        title="Không thể tải chi tiết yêu cầu xuất kho"
        onRetry={() => void detailQuery.refetch()}
      />
    )

  return (
    <>
      <StockIssueRequestDetail
        order={order}
        capabilities={workflow.capabilities}
        handlers={workflow.handlers}
        pickerOptions={workflow.pickerOptions}
        isAssigningPicker={workflow.isAssigningPicker}
        isRemovingPick={workflow.isRemovingPick}
        onAssignPicker={(staffId) => void workflow.assignPicker(order, staffId)}
        onRemovePickDetail={(pickDetailId) =>
          void workflow.removePickDetail(order.id, pickDetailId)
        }
      />
      <StockIssueWorkflowDialogs workflow={workflow} />
    </>
  )
}
