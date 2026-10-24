'use client'

import { ArrowLeft, Check, Edit3, Mail, Send, UserPlus, X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { LifecycleTimeline } from '@/components/operations/LifecycleTimeline'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { APP_ROUTES } from '@/routes/app-routes'
import type {
  InboundRequestAction,
  InboundRequestDetail as InboundRequestDetailType,
} from '../../types/inbound-request.types'
import { INBOUND_REQUEST_ACTION } from '../../types/inbound-request.types'
import { InboundRequestStatusBadge } from '../InboundRequestsPage'
import { InboundRequestOverview } from './InboundRequestOverview'
import { InboundRequestLines } from './InboundRequestLines'

const MISSING_SUPPLIER_EMAIL_HINT_ID = 'inbound-request-missing-supplier-email'

interface InboundRequestDetailProps {
  readonly inboundRequest: InboundRequestDetailType
  readonly allowedActions: readonly InboundRequestAction[]
  readonly selfApprovalRequired: boolean
  readonly isPending: boolean
  readonly onAssignReceiving?: () => void
  readonly onSubmit: () => Promise<boolean>
  readonly onApprove: (selfApprovalAcknowledged: boolean) => Promise<boolean>
  readonly onApproveAndSend: (selfApprovalAcknowledged: boolean) => Promise<boolean>
  readonly onSendToSupplier: () => Promise<boolean>
  readonly onReject: (reason: string, selfApprovalAcknowledged: boolean) => Promise<boolean>
  readonly onReconcile: (
    action: typeof INBOUND_REQUEST_ACTION.Cancel | typeof INBOUND_REQUEST_ACTION.CloseRemaining,
    reason: string
  ) => Promise<boolean>
}

const INBOUND_REQUEST_HISTORY_ACTION_LABELS: Readonly<Record<string, string>> = {
  Approve: 'Phê duyệt yêu cầu',
  AssignReceivingTask: 'Phân công nhiệm vụ nhận hàng',
  Create: 'Tạo yêu cầu nhập kho',
  Delete: 'Xóa yêu cầu nhập kho',
  Duplicate: 'Sao chép yêu cầu nhập kho',
  PauseWarehouseTask: 'Tạm dừng nhiệm vụ nhận hàng',
  Receive: 'Tiếp nhận hàng',
  ReassignReceivingTask: 'Phân công lại nhiệm vụ nhận hàng',
  Reject: 'Từ chối yêu cầu',
  ResendToSupplier: 'Gửi lại mail cho nhà cung cấp',
  ReturnWarehouseTask: 'Trả nhiệm vụ nhận hàng về hàng đợi',
  SendToSupplier: 'Gửi mail cho nhà cung cấp',
  StartWarehouseTask: 'Bắt đầu nhiệm vụ nhận hàng',
  Submit: 'Gửi yêu cầu duyệt',
  UnassignReceivingTask: 'Hủy giao nhiệm vụ nhận hàng',
  Update: 'Cập nhật yêu cầu',
  UpdateInboundRequestCode: 'Đổi mã yêu cầu nhập kho',
}

const INBOUND_REQUEST_HISTORY_REASON_LABELS: Readonly<Record<string, string>> = {
  ResendToSupplier: 'Người nhận',
  SendToSupplier: 'Người nhận',
}
export function InboundRequestDetail({
  inboundRequest,
  allowedActions,
  selfApprovalRequired,
  isPending,
  onSubmit,
  onApprove,
  onApproveAndSend,
  onSendToSupplier,
  onReject,
  onReconcile,
  onAssignReceiving,
}: InboundRequestDetailProps) {
  const [confirmationAction, setConfirmationAction] = useState<InboundRequestAction | null>(null)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [selfApprovalAcknowledged, setSelfApprovalAcknowledged] = useState(false)
  const [reconciliationAction, setReconciliationAction] = useState<
    typeof INBOUND_REQUEST_ACTION.Cancel | typeof INBOUND_REQUEST_ACTION.CloseRemaining | null
  >(null)
  async function confirmAction() {
    if (!confirmationAction) return
    const handlers: Partial<Record<InboundRequestAction, () => Promise<boolean>>> = {
      [INBOUND_REQUEST_ACTION.Submit]: onSubmit,
      [INBOUND_REQUEST_ACTION.Approve]: () => onApprove(selfApprovalAcknowledged),
      [INBOUND_REQUEST_ACTION.ApproveAndSend]: () => onApproveAndSend(selfApprovalAcknowledged),
      [INBOUND_REQUEST_ACTION.SendToSupplier]: onSendToSupplier,
    }
    const succeeded = await handlers[confirmationAction]?.()
    if (succeeded) {
      setConfirmationAction(null)
      setSelfApprovalAcknowledged(false)
    }
  }

  const supplierEmail = inboundRequest.supplierEmail
  const canMailSupplier = Boolean(inboundRequest.supplierId)
  const hasSentToSupplier = Boolean(inboundRequest.supplierEmailSentAt)
  const confirmationCopy = getConfirmationCopy(confirmationAction, supplierEmail)
  const showMissingEmailHint =
    canMailSupplier &&
    !supplierEmail &&
    (allowedActions.includes(INBOUND_REQUEST_ACTION.ApproveAndSend) ||
      allowedActions.includes(INBOUND_REQUEST_ACTION.SendToSupplier))

  async function reject() {
    const normalizedReason = reason.trim()
    if (!normalizedReason) {
      setReasonError('Vui lòng nhập lý do từ chối.')
      return
    }
    if (normalizedReason.length > 500) {
      setReasonError('Lý do không được vượt quá 500 ký tự.')
      return
    }
    const succeeded = await onReject(normalizedReason, selfApprovalAcknowledged)
    if (succeeded) {
      setIsRejectOpen(false)
      setReason('')
      setReasonError('')
      setSelfApprovalAcknowledged(false)
    }
  }

  async function reconcile() {
    if (!reconciliationAction) return
    const normalizedReason = reason.trim()
    if (!normalizedReason) {
      setReasonError('Vui lòng nhập lý do.')
      return
    }
    const succeeded = await onReconcile(reconciliationAction, normalizedReason)
    if (succeeded) {
      setReconciliationAction(null)
      setReason('')
      setReasonError('')
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href={APP_ROUTES.inboundRequests as Route} aria-label="Quay lại danh sách">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-semibold">
                {inboundRequest.inboundRequestCode}
              </h1>
              <InboundRequestStatusBadge status={inboundRequest.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Hàng từ{' '}
              {inboundRequest.supplierName ?? inboundRequest.sourceName ?? 'Nguồn chưa xác định'}{' '}
              đến {inboundRequest.warehouseName ?? 'kho chưa xác định'}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowedActions.includes(INBOUND_REQUEST_ACTION.AssignReceivingTask) &&
          onAssignReceiving ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onAssignReceiving}
            >
              <UserPlus aria-hidden="true" data-icon="inline-start" />
              Phân công nhân viên
            </Button>
          ) : null}
          {allowedActions.includes(INBOUND_REQUEST_ACTION.Update) ||
          allowedActions.includes('UpdateCode') ? (
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.inboundRequestEdit(inboundRequest.id) as Route}>
                <Edit3 aria-hidden="true" />
                {allowedActions.includes(INBOUND_REQUEST_ACTION.Update)
                  ? 'Chỉnh sửa'
                  : 'Đổi mã yêu cầu'}
              </Link>
            </Button>
          ) : null}
          {allowedActions.includes(INBOUND_REQUEST_ACTION.Submit) ? (
            <Button
              type="button"
              onClick={() => setConfirmationAction(INBOUND_REQUEST_ACTION.Submit)}
            >
              <Send aria-hidden="true" />
              Gửi duyệt
            </Button>
          ) : null}
          {allowedActions.includes(INBOUND_REQUEST_ACTION.Reject) ? (
            <Button type="button" variant="outline" onClick={() => setIsRejectOpen(true)}>
              <X aria-hidden="true" />
              Từ chối
            </Button>
          ) : null}
          {allowedActions.includes(INBOUND_REQUEST_ACTION.Cancel) ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setReason('')
                setReconciliationAction(INBOUND_REQUEST_ACTION.Cancel)
              }}
            >
              <X aria-hidden="true" />
              Hủy yêu cầu
            </Button>
          ) : null}
          {allowedActions.includes(INBOUND_REQUEST_ACTION.CloseRemaining) ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReason('')
                setReconciliationAction(INBOUND_REQUEST_ACTION.CloseRemaining)
              }}
            >
              Đóng số lượng còn lại
            </Button>
          ) : null}
          {allowedActions.includes(INBOUND_REQUEST_ACTION.Approve) ? (
            <Button
              type="button"
              variant={canMailSupplier ? 'outline' : 'default'}
              onClick={() => setConfirmationAction(INBOUND_REQUEST_ACTION.Approve)}
            >
              <Check aria-hidden="true" />
              Chỉ phê duyệt
            </Button>
          ) : null}
          {canMailSupplier && allowedActions.includes(INBOUND_REQUEST_ACTION.ApproveAndSend) ? (
            <Button
              type="button"
              disabled={!supplierEmail}
              aria-describedby={supplierEmail ? undefined : MISSING_SUPPLIER_EMAIL_HINT_ID}
              onClick={() => setConfirmationAction(INBOUND_REQUEST_ACTION.ApproveAndSend)}
            >
              <Mail aria-hidden="true" />
              Duyệt và gửi mail
            </Button>
          ) : null}
          {canMailSupplier && allowedActions.includes(INBOUND_REQUEST_ACTION.SendToSupplier) ? (
            <Button
              type="button"
              variant={hasSentToSupplier ? 'outline' : 'default'}
              disabled={!supplierEmail}
              aria-describedby={supplierEmail ? undefined : MISSING_SUPPLIER_EMAIL_HINT_ID}
              onClick={() => setConfirmationAction(INBOUND_REQUEST_ACTION.SendToSupplier)}
            >
              <Mail aria-hidden="true" />
              {hasSentToSupplier ? 'Gửi lại mail' : 'Gửi mail nhà cung cấp'}
            </Button>
          ) : null}
        </div>
      </header>

      {showMissingEmailHint ? (
        <p
          id={MISSING_SUPPLIER_EMAIL_HINT_ID}
          className="text-muted-foreground -mt-2 text-xs"
          role="note"
        >
          Nhà cung cấp chưa có email nên chưa thể gửi mail đơn hàng. Hãy cập nhật email của nhà cung
          cấp trước.
        </p>
      ) : null}

      <InboundRequestOverview request={inboundRequest} />

      <InboundRequestLines lines={inboundRequest.lines} />

      <section
        className="bg-card rounded-lg border p-4 sm:p-5"
        aria-labelledby="inbound-request-history"
      >
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 id="inbound-request-history" className="text-base font-semibold">
              Lịch sử xử lý
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Các thay đổi đã thực hiện trên yêu cầu nhập kho
            </p>
          </div>
          <span className="bg-muted text-muted-foreground shrink-0 rounded-sm px-2 py-1 text-xs font-medium">
            {inboundRequest.history.length} hoạt động
          </span>
        </header>
        <LifecycleTimeline
          events={inboundRequest.history}
          actionLabels={INBOUND_REQUEST_HISTORY_ACTION_LABELS}
          reasonLabels={INBOUND_REQUEST_HISTORY_REASON_LABELS}
        />
      </section>

      <AlertDialog
        open={Boolean(confirmationAction)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationAction(null)
            setSelfApprovalAcknowledged(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmationCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {selfApprovalRequired &&
          confirmationAction !== INBOUND_REQUEST_ACTION.Submit &&
          confirmationAction !== INBOUND_REQUEST_ACTION.SendToSupplier ? (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={selfApprovalAcknowledged}
                onCheckedChange={(checked) => setSelfApprovalAcknowledged(checked === true)}
              />
              Tôi xác nhận đang tự phê duyệt yêu cầu do chính mình lập hoặc gửi.
            </label>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isPending ||
                (selfApprovalRequired &&
                  confirmationAction !== INBOUND_REQUEST_ACTION.Submit &&
                  confirmationAction !== INBOUND_REQUEST_ACTION.SendToSupplier &&
                  !selfApprovalAcknowledged)
              }
              onClick={(event) => {
                event.preventDefault()
                void confirmAction()
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isRejectOpen}
        onOpenChange={(open) => {
          setIsRejectOpen(open)
          if (!open) setSelfApprovalAcknowledged(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu nhập kho</DialogTitle>
            <DialogDescription>
              Nêu rõ nội dung cần chỉnh sửa để người tạo cập nhật đơn.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(reasonError)}>
            <FieldLabel htmlFor="inbound-request-rejection-reason">Lý do</FieldLabel>
            <Textarea
              id="inbound-request-rejection-reason"
              value={reason}
              maxLength={500}
              aria-invalid={Boolean(reasonError)}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError('')
              }}
            />
            <FieldError>{reasonError}</FieldError>
          </Field>
          {selfApprovalRequired ? (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={selfApprovalAcknowledged}
                onCheckedChange={(checked) => setSelfApprovalAcknowledged(checked === true)}
              />
              Tôi xác nhận đang tự từ chối yêu cầu do chính mình lập hoặc gửi.
            </label>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setIsRejectOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || (selfApprovalRequired && !selfApprovalAcknowledged)}
              onClick={() => void reject()}
            >
              Từ chối đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reconciliationAction)}
        onOpenChange={(open) => {
          if (!open) {
            setReconciliationAction(null)
            setReason('')
            setReasonError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reconciliationAction === INBOUND_REQUEST_ACTION.Cancel
                ? 'Hủy yêu cầu nhập kho'
                : 'Đóng số lượng nhập còn lại'}
            </DialogTitle>
            <DialogDescription>
              {reconciliationAction === INBOUND_REQUEST_ACTION.Cancel
                ? 'Chỉ hủy được khi chưa phát sinh nhận hàng. Yêu cầu và lịch sử vẫn được lưu.'
                : 'Phần đã nhận và tồn kho hiện có không thay đổi. Hệ thống chỉ đóng phần sẽ không giao tiếp.'}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(reasonError)}>
            <FieldLabel htmlFor="inbound-reconciliation-reason">Lý do</FieldLabel>
            <Textarea
              id="inbound-reconciliation-reason"
              value={reason}
              maxLength={500}
              aria-invalid={Boolean(reasonError)}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError('')
              }}
            />
            <FieldError>{reasonError}</FieldError>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setReconciliationAction(null)}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              variant={
                reconciliationAction === INBOUND_REQUEST_ACTION.Cancel ? 'destructive' : 'default'
              }
              disabled={isPending || !reason.trim()}
              onClick={() => void reconcile()}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getConfirmationCopy(action: InboundRequestAction | null, supplierEmail: string | null) {
  const mailNote = `Email kèm file PDF đơn đặt hàng sẽ được gửi tới ${supplierEmail ?? 'nhà cung cấp'}, đồng thời CC người tạo và người duyệt.`
  switch (action) {
    case INBOUND_REQUEST_ACTION.Approve:
      return {
        title: 'Phê duyệt yêu cầu nhập kho?',
        description: 'Yêu cầu nhập kho sẽ chuyển sang trạng thái sẵn sàng nhận hàng.',
      }
    case INBOUND_REQUEST_ACTION.ApproveAndSend:
      return {
        title: 'Phê duyệt và gửi mail cho nhà cung cấp?',
        description: `Yêu cầu sẽ được phê duyệt. ${mailNote} Nếu gửi mail lỗi, yêu cầu vẫn được duyệt và bạn có thể gửi lại.`,
      }
    case INBOUND_REQUEST_ACTION.SendToSupplier:
      return {
        title: 'Gửi mail cho nhà cung cấp?',
        description: mailNote,
      }
    default:
      return {
        title: 'Gửi yêu cầu nhập kho để duyệt?',
        description: 'Sau khi gửi, bạn không thể chỉnh sửa cho đến khi đơn được trả lại.',
      }
  }
}
