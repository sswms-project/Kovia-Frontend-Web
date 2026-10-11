import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { TRANSFER_PICK_REASONS, type TransferPickSheetLine } from '../../types/transfer.types'
import { PICK_REASON_LABELS } from '../../utils/transfer-format'

export interface LineScopedDialogProps {
  readonly line: TransferPickSheetLine | null
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function PickLineLabel({ line }: { readonly line: TransferPickSheetLine }) {
  return (
    <>
      <span className="font-mono" translate="no">
        {line.sku}
      </span>{' '}
      · {line.productName}
    </>
  )
}

export function PickReasonField({
  id,
  registration,
  error,
}: {
  readonly id: string
  readonly registration: UseFormRegisterReturn
  readonly error?: string
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>Lý do</FieldLabel>
      <NativeSelect id={id} className="h-11 w-full" {...registration}>
        {TRANSFER_PICK_REASONS.map((reason) => (
          <NativeSelectOption key={reason} value={reason}>
            {PICK_REASON_LABELS[reason]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
