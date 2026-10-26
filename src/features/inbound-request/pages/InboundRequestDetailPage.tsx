'use client'

import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'

import { toast } from 'sonner'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { getApiErrorMessage, logApiError } from '@/lib/api-error'
import { InboundRequestDetail } from '../components/InboundRequestDetailPage'
import { AssignWarehouseTaskDialog } from '@/features/inbound/components/TaskAssignment'
import { useAssignWarehouseTask } from '@/features/inbound/hooks/use-assign-warehouse-task'
import {
  useApproveAndSendInboundRequestMutation,
  useApproveInboundRequestMutation,
  useInboundRequestAllowedActionsQuery,
  useInboundRequestQuery,
  useRejectInboundRequestMutation,
  useReconcileInboundRequestMutation,
  useSendInboundRequestToSupplierMutation,
  useSubmitInboundRequestMutation,
  useDeleteInboundRequestMutation,
} from '../hooks/use-inbound-requests'
import {
  INBOUND_REQUEST_ACTION,
  type InboundRequestAction,
  type SupplierEmailDispatch,
} from '../types/inbound-request.types'

function notifyDispatch(dispatch: SupplierEmailDispatch, approvedNow: boolean) {
  if (dispatch.sent) {
    toast.success(
      approvedNow
        ? `Đã duyệt và gửi email đơn hàng tới ${dispatch.sentTo}.`
        : `Đã gửi email đơn hàng tới ${dispatch.sentTo}.`
    )
    return
  }
  const reason = dispatch.error ?? 'Không thể gửi email cho nhà cung cấp.'
  if (approvedNow) toast.warning(`Đã duyệt yêu cầu nhưng chưa gửi được email. ${reason}`)
  else toast.error(reason)
}

export default function InboundRequestDetailPage({
  inboundRequestId,
}: {
  readonly inboundRequestId: string
}) {
  const router = useRouter()
  const deleteMutation = useDeleteInboundRequestMutation()
  const detailQuery = useInboundRequestQuery(inboundRequestId)
  const assignment = useAssignWarehouseTask()
  const actionsQuery = useInboundRequestAllowedActionsQuery(inboundRequestId)
  const submitMutation = useSubmitInboundRequestMutation()
  const approveMutation = useApproveInboundRequestMutation()
  const approveAndSendMutation = useApproveAndSendInboundRequestMutation()
  const sendToSupplierMutation = useSendInboundRequestToSupplierMutation()
  const rejectMutation = useRejectInboundRequestMutation()
  const reconcileMutation = useReconcileInboundRequestMutation()

  async function runAction(
    action: InboundRequestAction,
    reason?: string,
    selfApprovalAcknowledged = false,
    intentVersion?: string | null
  ) {
    try {
      const expectedVersion = intentVersion ?? detailQuery.data?.version
      if (
        action !== INBOUND_REQUEST_ACTION.Submit &&
        action !== INBOUND_REQUEST_ACTION.SendToSupplier &&
        !expectedVersion
      ) {
        toast.error('Yêu cầu chưa có phiên bản. Vui lòng tải lại.')
        return false
      }
      if (
        action === INBOUND_REQUEST_ACTION.ApproveAndSend ||
        action === INBOUND_REQUEST_ACTION.SendToSupplier
      ) {
        const approvedNow = action === INBOUND_REQUEST_ACTION.ApproveAndSend
        const response = approvedNow
          ? await approveAndSendMutation.mutateAsync({
              inboundRequestId,
              expectedVersion: expectedVersion ?? '',
              selfApprovalAcknowledged,
            })
          : await sendToSupplierMutation.mutateAsync(inboundRequestId)
        notifyDispatch(response.data, approvedNow)
        return approvedNow || response.data.sent
      }
      if (action === INBOUND_REQUEST_ACTION.Delete) {
        await deleteMutation.mutateAsync({
          id: inboundRequestId,
          expectedVersion: expectedVersion ?? '',
        })
        toast.success('Đã xóa nháp và giữ lại lịch sử xử lý.')
        router.replace(APP_ROUTES.inboundRequests as Route)
        return true
      }
      if (action === INBOUND_REQUEST_ACTION.Withdraw) {
        if (!reason) return false
        await reconcileMutation.mutateAsync({
          inboundRequestId,
          action: 'withdraw',
          reason,
          expectedVersion: expectedVersion ?? '',
        })
        toast.success('Đã thu hồi về Nháp. Hãy sửa rồi gửi duyệt lại.')
        router.push(APP_ROUTES.inboundRequestEdit(inboundRequestId) as Route)
        return true
      }
      if (action === INBOUND_REQUEST_ACTION.Submit)
        await submitMutation.mutateAsync(inboundRequestId)
      else if (action === INBOUND_REQUEST_ACTION.Reject) {
        if (!reason) return false
        await rejectMutation.mutateAsync({
          inboundRequestId,
          reason,
          expectedVersion: expectedVersion ?? '',
          selfApprovalAcknowledged,
        })
      } else if (
        action === INBOUND_REQUEST_ACTION.Cancel ||
        action === INBOUND_REQUEST_ACTION.CloseRemaining
      ) {
        if (!reason) return false
        await reconcileMutation.mutateAsync({
          inboundRequestId,
          action: action === INBOUND_REQUEST_ACTION.Cancel ? 'cancel' : 'closeRemaining',
          reason,
          expectedVersion: expectedVersion ?? '',
        })
      } else
        await approveMutation.mutateAsync({
          inboundRequestId,
          expectedVersion: expectedVersion ?? '',
          selfApprovalAcknowledged,
        })
      toast.success(
        action === INBOUND_REQUEST_ACTION.Submit
          ? 'Đã gửi yêu cầu nhập kho để duyệt.'
          : action === INBOUND_REQUEST_ACTION.Reject
            ? 'Đã từ chối yêu cầu nhập kho.'
            : action === INBOUND_REQUEST_ACTION.Cancel
              ? 'Đã hủy yêu cầu nhập kho.'
              : action === INBOUND_REQUEST_ACTION.CloseRemaining
                ? 'Đã đóng số lượng nhập còn lại.'
                : 'Đã phê duyệt yêu cầu nhập kho.'
      )
      return true
    } catch (error) {
      logApiError(error)
      toast.error(
        getApiErrorMessage(error, 'Không thể cập nhật yêu cầu nhập kho. Vui lòng thử lại.')
      )
      return false
    }
  }

  if (detailQuery.isLoading || actionsQuery.isLoading) return <OperationalLoadingState rows={8} />
  if (detailQuery.isError || actionsQuery.isError || !detailQuery.data)
    return (
      <OperationalErrorState
        title="Không thể tải chi tiết yêu cầu nhập kho"
        onRetry={() => {
          void detailQuery.refetch()
          void actionsQuery.refetch()
        }}
      />
    )

  return (
    <>
      <InboundRequestDetail
        inboundRequest={detailQuery.data}
        allowedActions={actionsQuery.data?.allowedActions ?? []}
        selfApprovalRequired={actionsQuery.data?.selfApprovalRequired ?? false}
        isPending={
          assignment.isPending ||
          deleteMutation.isPending ||
          submitMutation.isPending ||
          approveMutation.isPending ||
          approveAndSendMutation.isPending ||
          sendToSupplierMutation.isPending ||
          rejectMutation.isPending ||
          reconcileMutation.isPending
        }
        onSubmit={() => runAction(INBOUND_REQUEST_ACTION.Submit)}
        onApprove={(acknowledged) =>
          runAction(INBOUND_REQUEST_ACTION.Approve, undefined, acknowledged)
        }
        onApproveAndSend={(acknowledged) =>
          runAction(INBOUND_REQUEST_ACTION.ApproveAndSend, undefined, acknowledged)
        }
        onSendToSupplier={() => runAction(INBOUND_REQUEST_ACTION.SendToSupplier)}
        onReject={(reason, acknowledged) =>
          runAction(INBOUND_REQUEST_ACTION.Reject, reason, acknowledged)
        }
        onReconcile={(action, reason, version) => runAction(action, reason, false, version)}
        onAssignReceiving={() => {
          const request = detailQuery.data
          if (
            !request?.warehouseId ||
            request.receivingAssignedTo ||
            !actionsQuery.data?.allowedActions.includes(INBOUND_REQUEST_ACTION.AssignReceivingTask)
          )
            return
          assignment.open({
            kind: 'Receiving',
            id: request.id,
            referenceCode: request.inboundRequestCode,
            warehouseId: request.warehouseId,
            warehouseName: request.warehouseName ?? '',
            currentAssigneeId: null,
            currentAssigneeName: null,
            currentPriority: 'Normal',
            currentDueAt: null,
          })
        }}
      />
      <AssignWarehouseTaskDialog
        target={
          assignment.target?.id === detailQuery.data.id &&
          actionsQuery.data?.allowedActions.includes(INBOUND_REQUEST_ACTION.AssignReceivingTask)
            ? assignment.target
            : null
        }
        form={assignment.form}
        staff={assignment.staff}
        isLoadingStaff={assignment.isLoadingStaff}
        isErrorStaff={assignment.isErrorStaff}
        isFetchingStaff={assignment.isFetchingStaff}
        onRetryStaff={assignment.onRetryStaff}
        isPending={assignment.isPending}
        onOpenChange={(open) => !open && assignment.close()}
        onSubmit={() => {
          if (
            assignment.target?.id === detailQuery.data?.id &&
            !detailQuery.data.receivingAssignedTo &&
            actionsQuery.data?.allowedActions.includes(INBOUND_REQUEST_ACTION.AssignReceivingTask)
          )
            assignment.onSubmit()
        }}
      />
    </>
  )
}
