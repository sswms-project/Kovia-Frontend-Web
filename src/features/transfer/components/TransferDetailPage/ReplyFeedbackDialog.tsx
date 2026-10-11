import type { UseFormReturn } from 'react-hook-form'
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
import type { TransferFeedbackReplyFormValues } from '../../schemas/transfer-actions.schema'

interface ReplyFeedbackDialogProps {
  readonly open: boolean
  readonly feedbackMessage: string
  readonly form: UseFormReturn<TransferFeedbackReplyFormValues>
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TransferFeedbackReplyFormValues) => void
}

export function ReplyFeedbackDialog({
  open,
  feedbackMessage,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: ReplyFeedbackDialogProps) {
  const errors = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-lg">
        <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Trả lời phản hồi</DialogTitle>
            <DialogDescription>{feedbackMessage}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(errors.reply)}>
            <FieldLabel htmlFor="feedback-reply">Nội dung trả lời</FieldLabel>
            <Textarea
              id="feedback-reply"
              rows={4}
              maxLength={1000}
              aria-invalid={Boolean(errors.reply)}
              {...form.register('reply')}
            />
            <FieldError>{errors.reply?.message}</FieldError>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch('close')}
              onCheckedChange={(checked) => form.setValue('close', checked === true)}
            />
            Đóng phản hồi sau khi trả lời
          </label>
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
              {isPending ? 'Đang gửi…' : 'Gửi trả lời'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
