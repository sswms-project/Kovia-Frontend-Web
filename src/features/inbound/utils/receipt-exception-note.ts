import type { UseFormReturn } from 'react-hook-form'
import type { GoodsReceiptFormValues } from '../schemas/inbound.schema'

// The line note explains refused or damaged goods. Once neither quantity remains, a stale note would
// still be sent and printed, so drop it.
export function clearExceptionReasonWhenNoIssue(
  form: Pick<UseFormReturn<GoodsReceiptFormValues>, 'getValues' | 'setValue'>,
  index: number
) {
  const line = form.getValues(`lines.${index}`)
  if (!line || (line.rejectedQty ?? 0) > 0 || (line.damagedQty ?? 0) > 0) return
  if (line.exceptionReason === '') return
  form.setValue(`lines.${index}.exceptionReason`, '', { shouldDirty: true, shouldValidate: true })
}
