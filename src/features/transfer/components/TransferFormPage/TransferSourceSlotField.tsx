import { Map as MapIcon, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import { useTransferSourceLocationsQuery } from '../../hooks/use-transfers'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import { TransferSlotMapDialog } from './TransferSlotMapDialog'
import { TransferAllocationHelp } from './TransferAllocationHelp'

interface TransferSourceSlotFieldProps {
  readonly index: number
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly sourceWarehouseId: string
  /** Tên đã biết của vị trí đã lưu, để hiện khi danh sách chưa tải xong. */
  readonly knownOption?: LookupOption
  /** Dòng đã giữ chỗ: đổi nơi lấy bằng "Điều chỉnh phân bổ" ở trang chi tiết. */
  readonly locked: boolean
}

/** Vị trí lấy hàng ưu tiên của một dòng: chỉ liệt kê vị trí kho xuất đang có tồn sản phẩm đó. */
export function TransferSourceSlotField({
  index,
  form,
  sourceWarehouseId,
  knownOption,
  locked,
}: TransferSourceSlotFieldProps) {
  const productId = form.watch(`lines.${index}.productId`)
  const slotId = form.watch(`lines.${index}.sourceSlotId`)
  const error = form.formState.errors.lines?.[index]?.sourceSlotId
  const query = useTransferSourceLocationsQuery(
    { sourceWarehouseId, productId },
    Boolean(sourceWarehouseId && productId && !locked)
  )
  const options = useMemo<LookupOption[]>(
    () =>
      (query.data ?? []).map((location) => ({
        value: location.slotId,
        label: `${location.path} · còn ${formatQuantity(location.availableQuantity)}`,
      })),
    [query.data]
  )
  const inputId = `transfer-source-slot-${index}`
  const [isMapOpen, setIsMapOpen] = useState(false)
  const allowedLocations = useMemo(
    () => options.map((option) => ({ slotId: option.value, label: option.label })),
    [options]
  )

  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-center gap-1 lg:hidden">
        <FieldLabel className="text-xs" htmlFor={inputId}>
          Vị trí đi (không bắt buộc)
        </FieldLabel>
        <TransferAllocationHelp />
      </div>
      {locked && !slotId ? (
        <span className="text-muted-foreground text-xs lg:pt-2">Hệ thống tự phân bổ</span>
      ) : (
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <LookupCombobox
              id={inputId}
              value={slotId}
              options={options}
              selectedOption={knownOption}
              placeholder={productId ? 'Hệ thống tự phân bổ' : 'Chọn sản phẩm trước'}
              emptyMessage="Sản phẩm này không còn tồn ở vị trí nào của kho xuất."
              ariaLabel={`Vị trí đi dòng ${index + 1}`}
              isLoading={query.isFetching}
              isInvalid={Boolean(error)}
              disabled={locked || !productId}
              footerAction={{
                label: 'Chọn trong sơ đồ kho',
                icon: <MapIcon aria-hidden="true" />,
                onClick: () => setIsMapOpen(true),
              }}
              onSearchChange={() => undefined}
              onChange={(value) =>
                form.setValue(`lines.${index}.sourceSlotId`, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </div>
          {slotId && !locked ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Bỏ vị trí đi dòng ${index + 1}`}
              onClick={() =>
                form.setValue(`lines.${index}.sourceSlotId`, '', { shouldDirty: true })
              }
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
      <FieldError>{error?.message}</FieldError>
      <TransferSlotMapDialog
        open={isMapOpen}
        onOpenChange={setIsMapOpen}
        title="Chọn vị trí đi trên sơ đồ kho xuất"
        description="Chỉ chọn được các ô còn tồn của sản phẩm này trong kho xuất."
        warehouseId={sourceWarehouseId}
        allowedLocations={allowedLocations}
        onConfirm={({ slotId: pickedSlotId }) =>
          form.setValue(`lines.${index}.sourceSlotId`, pickedSlotId, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
    </Field>
  )
}
