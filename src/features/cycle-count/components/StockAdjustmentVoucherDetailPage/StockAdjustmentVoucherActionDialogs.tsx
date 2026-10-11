'use client'

import type { UseFormReturn } from 'react-hook-form'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import type { RejectStockAdjustmentFormValues } from '../../schemas/cycle-count.schema'
import type { StockAdjustmentVoucherDialog } from './types'

interface StockAdjustmentVoucherActionDialogsProps {
  readonly dialog: StockAdjustmentVoucherDialog | null
  readonly approvingCount: number
  readonly excludedCount: number
  readonly selfApprovalRequired: boolean
  readonly isPending: boolean
  readonly rejectForm: UseFormReturn<RejectStockAdjustmentFormValues>
  readonly onClose: () => void
  readonly onApprove: () => Promise<void>
  readonly onReject: (reason: string) => Promise<boolean>
}

export function StockAdjustmentVoucherActionDialogs({
  dialog,
  approvingCount,
  excludedCount,
  selfApprovalRequired,
  isPending,
  rejectForm,
  onClose,
  onApprove,
  onReject,
}: StockAdjustmentVoucherActionDialogsProps) {
  return (
    <>
      <AlertDialog
        open={dialog === 'approve'}
        onOpenChange={(open) => (open ? undefined : onClose())}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duyệt {approvingCount} dòng và cập nhật tồn kho?</AlertDialogTitle>
            <AlertDialogDescription>
              {excludedCount > 0 ? `${excludedCount} dòng bỏ tick sẽ bị từ chối. ` : ''}
              {selfApprovalRequired
                ? 'Bạn là người tạo phiếu này. Khi xác nhận, hệ thống ghi nhận hành động tự phê duyệt vào nhật ký kiểm toán.'
                : 'Tồn kho sẽ được ghi nhận theo số kiểm đếm. Hành động này không thể hoàn tác.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                void onApprove()
              }}
            >
              Xác nhận duyệt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={dialog === 'reject'}
        onOpenChange={(open) => {
          if (!open) {
            rejectForm.reset({ reason: '' })
            onClose()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối phiếu điều chỉnh</DialogTitle>
            <DialogDescription>
              Mọi dòng trong phiếu bị từ chối. Lý do được lưu vào lịch sử.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            maxLength={500}
            placeholder="Nhập lý do bắt buộc"
            {...rejectForm.register('reason')}
          />
          <FieldError
            errors={
              rejectForm.formState.errors.reason ? [rejectForm.formState.errors.reason] : undefined
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                void rejectForm.handleSubmit(async (values) => {
                  if (await onReject(values.reason.trim())) {
                    rejectForm.reset({ reason: '' })
                    onClose()
                  }
                })()
              }
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
