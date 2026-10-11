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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { TransferFeedbackFormValues } from '../../schemas/transfer-actions.schema'
import { TRANSFER_FEEDBACK_REASONS } from '../../types/transfer.types'
import { FEEDBACK_REASON_LABELS } from '../../utils/transfer-format'

interface ItemOption {
  readonly id: string
  readonly label: string
}

interface AddFeedbackDialogProps {
  readonly open: boolean
  readonly form: UseFormReturn<TransferFeedbackFormValues>
  readonly itemOptions: readonly ItemOption[]
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TransferFeedbackFormValues) => void
}

export function AddFeedbackDialog({
  open,
  form,
  itemOptions,
  isPending,
  onOpenChange,
  onSubmit,
}: AddFeedbackDialogProps) {
  const errors = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-lg">
        <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Phản hồi về phiếu điều chuyển</DialogTitle>
            <DialogDescription>
              Báo vấn đề cho người tạo phiếu. Phản hồi không chặn phiếu; bạn vẫn có thể chia đợt cho
              phần làm được.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(errors.reasonCode)}>
            <FieldLabel htmlFor="feedback-reason">Lý do</FieldLabel>
            <NativeSelect id="feedback-reason" className="w-full" {...form.register('reasonCode')}>
              {TRANSFER_FEEDBACK_REASONS.map((reason) => (
                <NativeSelectOption key={reason} value={reason}>
                  {FEEDBACK_REASON_LABELS[reason]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{errors.reasonCode?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="feedback-item">Dòng hàng liên quan</FieldLabel>
            <NativeSelect id="feedback-item" className="w-full" {...form.register('itemId')}>
              <NativeSelectOption value="">Toàn bộ phiếu</NativeSelectOption>
              {itemOptions.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={Boolean(errors.message)}>
            <FieldLabel htmlFor="feedback-message">Nội dung</FieldLabel>
            <Textarea
              id="feedback-message"
              rows={4}
              maxLength={1000}
              aria-invalid={Boolean(errors.message)}
              {...form.register('message')}
            />
            <FieldError>{errors.message?.message}</FieldError>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
