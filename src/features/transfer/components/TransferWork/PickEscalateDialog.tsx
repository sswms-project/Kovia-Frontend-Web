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
import type { TransferPickEscalateFormValues } from '../../schemas/transfer-fulfillment.schema'
import { PickLineLabel, PickReasonField, type LineScopedDialogProps } from './PickDialogParts'

interface PickEscalateDialogProps extends LineScopedDialogProps {
  readonly form: UseFormReturn<TransferPickEscalateFormValues>
  readonly onSubmit: (values: TransferPickEscalateFormValues) => void
}

export function PickEscalateDialog({
  line,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: PickEscalateDialogProps) {
  const errors = form.formState.errors
  return (
    <Dialog open={Boolean(line)} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-lg">
        {line ? (
          <form noValidate className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Báo quản lý</DialogTitle>
              <DialogDescription>
                <PickLineLabel line={line} />. Dòng này chuyển sang chờ quản lý; bạn tiếp tục các
                dòng khác.
              </DialogDescription>
            </DialogHeader>
            <PickReasonField
              id="escalate-reason"
              registration={form.register('reasonCode')}
              error={errors.reasonCode?.message}
            />
            <Field data-invalid={Boolean(errors.note)}>
              <FieldLabel htmlFor="escalate-note">Mô tả vấn đề</FieldLabel>
              <Textarea
                id="escalate-note"
                rows={3}
                maxLength={500}
                aria-invalid={Boolean(errors.note)}
                {...form.register('note')}
              />
              <FieldError>{errors.note?.message}</FieldError>
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button type="submit" className="h-11" disabled={isPending}>
                {isPending ? 'Đang gửi…' : 'Gửi cho quản lý'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
