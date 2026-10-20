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
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { SupplierReturnReasonFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturn } from '../../types/supplier-return.types'

export type SupplierReturnDecision = 'reject' | 'cancel'

const COPY: Record<
  SupplierReturnDecision,
  { title: string; description: string; submit: string; label: string }
> = {
  reject: {
    title: 'Từ chối phiếu trả hàng NCC',
    description: 'Ghi rõ lý do từ chối',
    submit: 'Từ chối',
    label: 'Lý do từ chối',
  },
  cancel: {
    title: 'Huỷ phiếu trả hàng NCC',
    description: 'Ghi rõ lý do huỷ',
    submit: 'Huỷ phiếu',
    label: 'Lý do huỷ',
  },
}

export function SupplierReturnDecisionDialog({
  item,
  decision,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  readonly item: SupplierReturn | null
  readonly decision: SupplierReturnDecision
  readonly form: UseFormReturn<SupplierReturnReasonFormValues>
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: SupplierReturnReasonFormValues) => void
}) {
  const error = form.formState.errors.reason
  const copy = COPY[decision]
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {item ? `${copy.description} ${item.code}.` : `${copy.description}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="supplier-return-decision-reason">{copy.label}</FieldLabel>
            <Textarea
              id="supplier-return-decision-reason"
              aria-invalid={Boolean(error)}
              {...form.register('reason')}
            />
            <FieldError errors={[error]} />
          </Field>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
