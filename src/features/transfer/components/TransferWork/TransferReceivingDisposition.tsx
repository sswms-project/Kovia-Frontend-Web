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
    <div className="bg-card grid shrink-0 gap-3 border p-3 sm:grid-cols-2">
      <Field className="sm:col-span-2" data-disabled={disabled}>
        <FieldLabel
          htmlFor="transfer-keep-receiving"
          className="flex min-h-11 w-full cursor-pointer items-center gap-3"
        >
          <Checkbox
            id="transfer-keep-receiving"
            className="border-foreground/60 bg-card size-5 shrink-0"
            aria-describedby="transfer-keep-receiving-description"
            checked={keep === true}
            disabled={disabled}
            onCheckedChange={(value) =>
              form.setValue('keepAtReceiving', value === true, { shouldDirty: true })
            }
          />
          Giữ hàng đạt tại khu nhận
        </FieldLabel>
        <p id="transfer-keep-receiving-description" className="text-muted-foreground text-xs">
          Khi chọn, hàng đạt có thể được lấy trực tiếp theo FEFO. Nếu không chọn, hàng tiếp tục chờ
          cất. Hàng hỏng luôn được cách biệt.
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
