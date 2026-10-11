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
import type { TransferReasonFormValues } from '../../schemas/transfer-actions.schema'

interface TransferReasonDialogProps {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly pendingLabel: string
  readonly form: UseFormReturn<TransferReasonFormValues>
  readonly isPending: boolean
  readonly destructive?: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TransferReasonFormValues) => void
}

/** Hộp thoại xác nhận có lý do bắt buộc: hủy phiếu, dừng phần còn lại, hủy đợt. */
export function TransferReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  form,
  isPending,
  destructive = true,
  onOpenChange,
  onSubmit,
}: TransferReasonDialogProps) {
  const error = form.formState.errors.reason
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent size="lg" className="sm:max-w-lg">
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="transfer-reason-dialog">Lý do</FieldLabel>
            <Textarea
              id="transfer-reason-dialog"
              rows={3}
              maxLength={500}
              aria-invalid={Boolean(error)}
              {...form.register('reason')}
            />
            <FieldError>{error?.message}</FieldError>
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
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'default'}
              disabled={isPending}
            >
              {isPending ? pendingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
