import { useWatch, type UseFormReturn } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { TransferCountFormValues } from '../../schemas/transfer-receipt.schema'
import type { TransferReceivableSlotOption } from '../../types/transfer.types'

interface Props {
  readonly form: UseFormReturn<TransferCountFormValues>
  readonly slots: readonly TransferReceivableSlotOption[]
  readonly receivingSlotId?: string | null
  readonly disabled: boolean
}
export function TransferReceivingDisposition({ form, slots, receivingSlotId, disabled }: Props) {
  const keep = useWatch({ control: form.control, name: 'keepAtReceiving' })
  const entries = useWatch({ control: form.control, name: 'entries' })
  return (
    <div className="grid shrink-0 gap-3 border p-3 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="transfer-keep-receiving" className="flex items-center gap-2">
          <Checkbox
            id="transfer-keep-receiving"
            checked={keep === true}
            disabled={disabled}
            onCheckedChange={(value) =>
              form.setValue('keepAtReceiving', value === true, { shouldDirty: true })
            }
          />
          Giữ hàng đạt tại khu nhận, cho phép lấy trực tiếp theo FEFO
        </FieldLabel>
        <p className="text-muted-foreground text-xs">
          Nếu không chọn, hàng đạt tiếp tục chờ cất. Hàng hỏng luôn Hold/cách biệt.
        </p>
      </Field>
      {entries.some((entry) => entry.damagedQuantity > 0) && (
        <>
          <Field>
            <FieldLabel htmlFor="transfer-damage-location">
              Vị trí thực tế cách biệt hàng hỏng
            </FieldLabel>
            <NativeSelect
              id="transfer-damage-location"
              {...form.register('damagedSlotId')}
              disabled={disabled}
            >
              <NativeSelectOption value="">Chọn vị trí riêng</NativeSelectOption>
              {slots
                .filter((slot) => slot.id !== receivingSlotId)
                .map((slot) => (
                  <NativeSelectOption key={slot.id} value={slot.id}>
                    {slot.path}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
            <FieldError>{form.formState.errors.damagedSlotId?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="transfer-damage-scan">Quét/nhập mã vị trí cách biệt</FieldLabel>
            <Input
              id="transfer-damage-scan"
              maxLength={200}
              disabled={disabled}
              {...form.register('scannedDamagedSlotCode')}
            />
            <FieldError>{form.formState.errors.scannedDamagedSlotCode?.message}</FieldError>
          </Field>
        </>
      )}
    </div>
  )
}
