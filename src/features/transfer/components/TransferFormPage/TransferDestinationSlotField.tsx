import { Map as MapIcon, X } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import { TransferSlotMapDialog } from './TransferSlotMapDialog'

interface TransferDestinationSlotFieldProps {
  readonly index: number
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly options: readonly LookupOption[]
  /** Tên đã biết của vị trí đã lưu, để hiện khi danh sách chưa tải xong. */
  readonly knownOption?: LookupOption
  readonly isLoading: boolean
  /** Dòng đã bắt đầu nhận hàng nên không đổi vị trí đến nữa. */
  readonly locked: boolean
  readonly onSearchChange: (value: string) => void
}

/** Vị trí đến (gợi ý cất hàng) của một dòng: chọn trong danh sách tìm kiếm hoặc bấm trên sơ đồ kho nhập. */
export function TransferDestinationSlotField({
  index,
  form,
  options,
  knownOption,
  isLoading,
  locked,
  onSearchChange,
}: TransferDestinationSlotFieldProps) {
  const slotId = form.watch(`lines.${index}.destinationSlotId`)
  const destinationWarehouseId = form.watch('destinationWarehouseId')
  const error = form.formState.errors.lines?.[index]?.destinationSlotId
  const inputId = `transfer-destination-slot-${index}`
  const [isMapOpen, setIsMapOpen] = useState(false)
  // Ô chọn trên sơ đồ có thể không nằm trong danh sách tìm kiếm nên phải nhớ tên để còn hiển thị.
  const [pickedOption, setPickedOption] = useState<LookupOption | undefined>()

  function setSlot(value: string) {
    form.setValue(`lines.${index}.destinationSlotId`, value, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel className="text-xs lg:sr-only" htmlFor={inputId}>
        Vị trí đến (không bắt buộc)
      </FieldLabel>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <LookupCombobox
            id={inputId}
            value={slotId}
            options={options}
            selectedOption={pickedOption?.value === slotId ? pickedOption : knownOption}
            placeholder="Chọn vị trí đến (có thể để trống)"
            emptyMessage="Kho nhập chưa có vị trí phù hợp."
            ariaLabel={`Vị trí đến dòng ${index + 1}`}
            isLoading={isLoading}
            isInvalid={Boolean(error)}
            disabled={locked}
            footerAction={
              destinationWarehouseId
                ? {
                    label: 'Chọn trong sơ đồ kho',
                    icon: <MapIcon aria-hidden="true" />,
                    onClick: () => setIsMapOpen(true),
                  }
                : undefined
            }
            onSearchChange={onSearchChange}
            onChange={setSlot}
          />
        </div>
        {slotId && !locked ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Bỏ vị trí đến dòng ${index + 1}`}
            onClick={() =>
              form.setValue(`lines.${index}.destinationSlotId`, '', { shouldDirty: true })
            }
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <FieldError>{error?.message}</FieldError>
      <TransferSlotMapDialog
        open={isMapOpen}
        onOpenChange={setIsMapOpen}
        title="Chọn vị trí đến trên sơ đồ kho nhập"
        description="Chọn ô sẽ cất hàng khi nhận. Đây chỉ là gợi ý cho kho nhập; nhân viên vẫn quét mã ô khi cất hàng."
        warehouseId={destinationWarehouseId}
        onConfirm={({ slotId: pickedSlotId, label }) => {
          setPickedOption({ value: pickedSlotId, label })
          setSlot(pickedSlotId)
        }}
      />
    </Field>
  )
}
