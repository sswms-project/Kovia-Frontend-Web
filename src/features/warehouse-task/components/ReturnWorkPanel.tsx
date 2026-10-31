'use client'

import { formatStockIssueDate } from '@/features/stock-issue/utils/stock-issue-format'
import { RefreshCw, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AssignWarehouseTaskDialog } from '@/features/inbound/components/TaskAssignment'
import { useReturnWorkPanel } from '../hooks/use-return-work-panel'

interface ReturnWorkPanelProps {
  readonly supplier: boolean
  readonly documentId: string
}

export function ReturnWorkPanel({ supplier, documentId }: ReturnWorkPanelProps) {
  const panel = useReturnWorkPanel(supplier, documentId)
  const { query } = panel.work
  const data = query.data
  const target = panel.assignmentTarget
  const uncertain = panel.assignmentCommand.isUncertain || panel.actionCommand.isUncertain
  if (query.isError && !uncertain)
    return (
      <div className="bg-card flex flex-wrap items-center gap-3 border p-4 text-sm">
        Chưa tải được trạng thái phân công.
        <Button variant="outline" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  if (!data || (!uncertain && (!data.assignmentRequired || !data.approved))) return null
  const busy = panel.assignment.isPending || panel.action.isPending || query.isFetching || uncertain
  const terminal = data.executionStatus === 'Completed' || data.executionStatus === 'Cancelled'
  return (
    <section
      className="bg-card flex flex-col gap-3 border p-4 [&_button]:min-h-11 sm:[&_button]:min-h-9"
      aria-label="Nhiệm vụ trả hàng"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {supplier ? 'Giao trả nhà cung cấp' : 'Nhận hàng khách trả'}
          </h2>
          {data.assignedTo && (
            <p className="text-muted-foreground text-sm">
              Ưu tiên: {data.priority === 'Urgent' ? 'Khẩn' : 'Bình thường'} · Hạn:{' '}
              {data.dueAt ? formatStockIssueDate(data.dueAt) : 'Chưa đặt'}
            </p>
          )}
          {data.assignedToName && <p className="text-sm">Người thực hiện: {data.assignedToName}</p>}
          <p className="text-muted-foreground text-sm">
            {!data.assignedTo
              ? 'Chưa giao việc'
              : data.executionStatus === 'InProgress'
                ? 'Đang thực hiện'
                : data.executionStatus === 'Paused'
                  ? 'Đã tạm dừng'
                  : 'Đã giao việc'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Tải lại nhiệm vụ"
            disabled={busy}
            onClick={() => void panel.work.refresh()}
          >
            <RefreshCw className={query.isFetching ? 'animate-spin' : undefined} />
          </Button>
          {data.canAssign && !terminal && (
            <Button
              variant="outline"
              disabled={busy || data.executionStatus === 'InProgress'}
              onClick={panel.openAssignment}
            >
              <UserCheck />
              {data.assignedTo ? 'Phân công / lịch thực hiện' : 'Giao việc'}
            </Button>
          )}
        </div>
      </div>
      {panel.actionCommand.isUncertain && !panel.reasonAction && (
        <Alert>
          <AlertDescription className="flex flex-col items-start gap-2">
            <p>Chưa xác định kết quả thao tác. Không tạo thao tác khác trước khi kiểm tra xong.</p>
            <Button
              type="button"
              variant="outline"
              disabled={panel.action.isPending}
              onClick={() => void panel.retryAction()}
            >
              Kiểm tra lại kết quả
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {data.canManage && !terminal && (
        <div className="flex flex-wrap gap-2">
          {data.executionStatus !== 'InProgress' && (
            <Button disabled={busy} onClick={() => void panel.manage('Start')}>
              {data.startedAt ? 'Tiếp tục thực hiện' : 'Bắt đầu'}
            </Button>
          )}
          {data.executionStatus === 'InProgress' && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                panel.reasonForm.reset({ reason: '' })
                panel.setReasonAction('Pause')
              }}
            >
              Tạm dừng
            </Button>
          )}
          {data.executionStatus !== 'InProgress' && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                panel.reasonForm.reset({ reason: '' })
                panel.setReasonAction('Return')
              }}
            >
              Trả về hàng đợi
            </Button>
          )}
        </div>
      )}
      <AssignWarehouseTaskDialog
        target={
          target
            ? {
                kind: supplier ? 'SupplierReturnDispatch' : 'CustomerReturnReceive',
                id: documentId,
                referenceCode: target.referenceCode,
                warehouseId: target.warehouseId,
                warehouseName: target.warehouseName,
                currentAssigneeId: target.assignedTo,
                currentAssigneeName: target.assignedToName,
                currentPriority: target.priority ?? 'Normal',
                currentDueAt: target.dueAt,
              }
            : null
        }
        form={panel.form}
        staff={panel.staff.data ?? []}
        isLoadingStaff={panel.staff.isLoading}
        isErrorStaff={panel.staff.isError}
        isFetchingStaff={panel.staff.isFetching}
        onRetryStaff={() => void panel.staff.refetch()}
        isPending={panel.assignment.isPending}
        isUncertain={panel.assignmentCommand.isUncertain}
        onResolve={() => void panel.retryAssignment()}
        onOpenChange={panel.setAssigning}
        onSubmit={() => void panel.form.handleSubmit(panel.submitAssignment)()}
      />
      <Dialog
        open={panel.reasonAction !== null}
        onOpenChange={(open) => {
          if (!open && !panel.action.isPending) panel.setReasonAction(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {panel.reasonAction === 'Pause' ? 'Tạm dừng công việc' : 'Trả công việc về hàng đợi'}
            </DialogTitle>
            <DialogDescription>
              Nhập lý do để quản lý tiếp tục điều phối công việc.
            </DialogDescription>
          </DialogHeader>
          {panel.actionCommand.isUncertain && (
            <Alert>
              <AlertDescription className="flex flex-col items-start gap-2">
                <p>Chưa xác định kết quả. Hãy kiểm tra lại đúng thao tác ban đầu.</p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={panel.action.isPending}
                  onClick={() => void panel.retryAction()}
                >
                  Kiểm tra lại kết quả
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <form
            onSubmit={panel.reasonForm.handleSubmit((values) =>
              panel.manage(panel.reasonAction ?? 'Pause', values.reason)
            )}
            className="flex flex-col gap-4"
          >
            <fieldset disabled={panel.action.isPending || panel.actionCommand.isUncertain}>
              <Textarea
                aria-label="Lý do"
                placeholder="Lý do"
                maxLength={500}
                {...panel.reasonForm.register('reason')}
              />
              {panel.reasonForm.formState.errors.reason && (
                <p className="text-destructive text-sm">
                  {panel.reasonForm.formState.errors.reason.message}
                </p>
              )}
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={panel.action.isPending || panel.actionCommand.isUncertain}
                onClick={() => panel.setReasonAction(null)}
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                disabled={panel.action.isPending || panel.actionCommand.isUncertain}
              >
                Xác nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
