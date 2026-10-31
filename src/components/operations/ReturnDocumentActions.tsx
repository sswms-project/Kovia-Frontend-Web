import { MoreHorizontal, Pencil, RotateCcw, Send, Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
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
import type { ReturnDocumentReasonValues } from '@/schemas/return-document.schema'
import type { ReturnDocumentAction } from '@/types/return-document'

const LABELS: Record<ReturnDocumentAction, string> = {
  Withdraw: 'Thu hồi để sửa',
  Submit: 'Gửi duyệt lại',
  DeleteDraft: 'Xóa nháp',
  Cancel: 'Hủy yêu cầu',
}
const DESCRIPTIONS: Record<ReturnDocumentAction, string> = {
  Withdraw:
    'Phiếu trở về Nháp, bản duyệt cũ hết hiệu lực. Sau khi sửa, bạn cần gửi duyệt lại. Hệ thống nhả lượng giữ riêng của phiếu nếu có.',
  Submit:
    'Hệ thống kiểm tra lại nguồn hàng và số lượng trước khi gửi duyệt. Quyết định duyệt cũ không được sử dụng lại.',
  DeleteDraft: 'Nháp sẽ được ẩn khỏi danh sách. Nội dung và lịch sử vẫn được giữ để tra cứu.',
  Cancel: 'Hủy yêu cầu chưa thực hiện. Hệ thống giữ lịch sử và không thay đổi tồn đã ghi nhận.',
}

export function ReturnDocumentSecondaryActions({
  children,
  disabled,
}: {
  readonly children: ReactNode
  readonly disabled: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="bg-card text-card-foreground max-sm:min-h-11 pointer-coarse:min-h-11"
        >
          <MoreHorizontal aria-hidden="true" />
          Thao tác khác
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-sm:[&_[role=menuitem]]:min-h-11 pointer-coarse:[&_[role=menuitem]]:min-h-11"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ReturnDocumentActions({
  allowedActions,
  disabled,
  onEdit,
  onAction,
}: {
  readonly allowedActions: readonly string[]
  readonly disabled: boolean
  readonly onEdit: () => void
  readonly onAction: (action: ReturnDocumentAction) => void
}) {
  return (
    <>
      {allowedActions.includes('Update') ? (
        <Button variant="outline" disabled={disabled} onClick={onEdit}>
          <Pencil /> Sửa phiếu
        </Button>
      ) : null}
      {(['Submit', 'Withdraw'] as const)
        .filter((action) => allowedActions.includes(action))
        .map((action) => {
          const Icon = action === 'Submit' ? Send : RotateCcw
          return (
            <Button
              key={action}
              variant={action === 'Submit' ? 'default' : 'outline'}
              className={action === 'Withdraw' ? 'bg-card text-card-foreground' : undefined}
              disabled={disabled}
              onClick={() => onAction(action)}
            >
              <Icon />
              {LABELS[action]}
            </Button>
          )
        })}
      {allowedActions.some((action) => action === 'DeleteDraft' || action === 'Cancel') ? (
        <ReturnDocumentSecondaryActions disabled={disabled}>
          {(['DeleteDraft', 'Cancel'] as const)
            .filter((action) => allowedActions.includes(action))
            .map((action) => (
              <DropdownMenuItem
                key={action}
                variant="destructive"
                onSelect={() => onAction(action)}
              >
                {action === 'DeleteDraft' ? (
                  <Trash2 aria-hidden="true" />
                ) : (
                  <X aria-hidden="true" />
                )}
                {LABELS[action]}
              </DropdownMenuItem>
            ))}
        </ReturnDocumentSecondaryActions>
      ) : null}
    </>
  )
}

export function ReturnDocumentActionDialog({
  action,
  form,
  isPending,
  onSubmit,
  onClose,
  description,
}: {
  readonly description?: string
  readonly action: ReturnDocumentAction | null
  readonly form: UseFormReturn<ReturnDocumentReasonValues>
  readonly isPending: boolean
  readonly onSubmit: (values: ReturnDocumentReasonValues) => Promise<void>
  readonly onClose: () => void
}) {
  const needsReason = action === 'Withdraw' || action === 'Cancel'
  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action ? LABELS[action] : 'Cập nhật phiếu'}</DialogTitle>
          <DialogDescription>
            {description ?? (action ? DESCRIPTIONS[action] : '')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {needsReason ? (
            <Field>
              <FieldLabel htmlFor="return-action-reason">Lý do</FieldLabel>
              <Textarea
                id="return-action-reason"
                maxLength={500}
                disabled={isPending}
                {...form.register('reason')}
              />
              <FieldError errors={[form.formState.errors.reason]} />
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
              Quay lại
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang xử lý…' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
