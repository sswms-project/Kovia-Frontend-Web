'use client'

import { useState } from 'react'

import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { StockIssueRequestDetail } from '../components/StockIssueRequestDetailPage'
import { StockIssueWorkflowDialogs } from '../components/StockIssueWorkflow'
import { useStockIssueRequestQuery } from '../hooks/use-stock-issue-requests'
import { useStockIssueWorkflow } from '../hooks/use-stock-issue-workflow'
import { CrossDockSection } from '../components/CrossDockPanel'
import {
  useStockIssueEditingActions,
  useWithdrawStockIssue,
} from '../hooks/use-stock-issue-editing'
import { ReturnDocumentActionDialog } from '@/components/operations/ReturnDocumentActions'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { TaskSplitButton, TaskSplitSection, useTaskSplitQuery } from '@/features/task-splitting'

export default function StockIssueRequestDetailPage({
  stockIssueRequestId,
}: {
  readonly stockIssueRequestId: string
}) {
  const detailQuery = useStockIssueRequestQuery(stockIssueRequestId)
  const order = detailQuery.data
  const actions = useStockIssueEditingActions(stockIssueRequestId)
  const withdraw = useWithdrawStockIssue(order)
  const workflow = useStockIssueWorkflow(order?.warehouseId)
  const split = useTaskSplitQuery('StockIssuePick', stockIssueRequestId)
  const [isSplitOpen, setIsSplitOpen] = useState(false)

  if (detailQuery.isLoading) return <OperationalLoadingState rows={8} />
  if (detailQuery.isError || !order)
    return (
      <OperationalErrorState
        title="Không thể tải chi tiết yêu cầu xuất kho"
        onRetry={() => void detailQuery.refetch()}
      />
    )

  return (
    <div className="min-w-0 shrink-0 pb-3">
      <StockIssueRequestDetail
        canEdit={actions.data?.allowedActions.includes('Update') ?? false}
        editingActions={
          <>
            {actions.data?.allowedActions.includes('Withdraw') ? (
              <Button
                variant="outline"
                disabled={actions.isFetching || withdraw.dialog.isPending}
                onClick={withdraw.open}
              >
                <RotateCcw /> Thu hồi để sửa
              </Button>
            ) : null}
            <TaskSplitButton state={split.data} onSplit={() => setIsSplitOpen(true)} />
          </>
        }
        isSplit={split.data?.isSplit}
        taskSplitSection={
          <TaskSplitSection
            state={split.data}
            isError={split.isError}
            onRetry={() => void split.refetch()}
            open={isSplitOpen}
            onOpenChange={setIsSplitOpen}
            invalidateKeys={[queryKeys.stockIssueRequests.detail(stockIssueRequestId)]}
          />
        }
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
        pickingPlan={<CrossDockSection key={`${order.id}:${order.version}`} order={order} />}
      />
      <StockIssueWorkflowDialogs workflow={workflow} />
      <ReturnDocumentActionDialog
        {...withdraw.dialog}
        description="Yêu cầu về Chờ xử lý để sửa. Lượng giữ riêng của yêu cầu được nhả, nhân viên không tiếp tục lấy theo phân công cũ. Sau khi sửa cần giao việc lại."
      />
    </div>
  )
}
