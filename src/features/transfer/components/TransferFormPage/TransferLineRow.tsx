import { Trash2 } from 'lucide-react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import { lineGridColumns } from './line-grid'
import { TransferDestinationSlotField } from './TransferDestinationSlotField'
import { TransferSourceSlotField } from './TransferSourceSlotField'
import type { TransferLineUnits } from '../../types/transfer.types'
import {
  exceedsAvailability as isOverAvailability,
  transferUnitLabel,
} from '../../utils/transfer-line-units'

export interface TransferLineLockInfo {
  /** Phần đã xuất (theo ĐVT đã chọn) không được sửa. */
  readonly dispatched: number
  readonly unitName: string
}

interface TransferLineRowProps {
  readonly field: FieldArrayWithId<TransferRequestFormValues, 'lines', 'id'>
  readonly index: number
  readonly lineCount: number
  readonly form: UseFormReturn<TransferRequestFormValues>
  readonly unitInfo?: TransferLineUnits
  readonly isUnitLoading: boolean
  readonly isUnitError: boolean
  readonly hasWarehouses: boolean
  readonly selectedOption?: LookupOption
  readonly options: readonly LookupOption[]
  readonly isProductSearchLoading: boolean
  /** Dòng đã gửi: không đổi được sản phẩm và đơn vị tính, chỉ đổi số lượng hoặc bỏ dòng. */
  readonly isIdentityLocked: boolean
  readonly lockInfo?: TransferLineLockInfo
  readonly showAvailabilityWarning: boolean
  readonly onProductSearchChange: (scope: string, value: string) => void
  readonly onRemove: (index: number) => void
  /** Chỉ chủ và người kho xuất thấy "Vị trí đi"; người kho nhập không biết nơi lấy. */
  readonly showSourceSlot: boolean
  readonly sourceWarehouseId: string
  readonly selectedSourceSlot?: LookupOption
  /** Dòng đã giữ chỗ thì vị trí đi chỉ đổi được bằng "Điều chỉnh phân bổ". */
  readonly isSourceSlotLocked: boolean
  /** Chỉ chủ và người kho nhập thấy cột này; người kho xuất không biết nơi cất. */
  readonly showDestinationSlot: boolean
  readonly destinationSlotOptions: readonly LookupOption[]
  readonly selectedDestinationSlot?: LookupOption
  readonly isDestinationSlotLoading: boolean
  /** Dòng đã bắt đầu nhận hàng thì vị trí đến không đổi nữa. */
  readonly isDestinationSlotLocked: boolean
  readonly onDestinationSlotSearchChange: (value: string) => void
}

export function TransferLineRow({
  field,
  index,
  lineCount,
  form,
  unitInfo,
  isUnitLoading,
  isUnitError,
  hasWarehouses,
  selectedOption,
  options,
  isProductSearchLoading,
  isIdentityLocked,
  lockInfo,
  showAvailabilityWarning,
  onProductSearchChange,
  onRemove,
  showSourceSlot,
  sourceWarehouseId,
  selectedSourceSlot,
  isSourceSlotLocked,
  showDestinationSlot,
  destinationSlotOptions,
  selectedDestinationSlot,
  isDestinationSlotLoading,
  isDestinationSlotLocked,
  onDestinationSlotSearchChange,
}: TransferLineRowProps) {
  const line = form.watch(`lines.${index}`)
  const errors = form.formState.errors.lines?.[index]
  const units = unitInfo?.units ?? []
  const selectedUnitId = line.unitId || unitInfo?.baseUnitId || ''
  const selectedUnit = units.find((unit) => unit.unitId === selectedUnitId)
  const factor = selectedUnit?.conversionFactor
  const baseQuantity = factor !== undefined ? line.quantity * factor : Number.NaN
  const availableInUnit = selectedUnit?.availableQuantity
  const exceedsAvailability =
    showAvailabilityWarning && isOverAvailability(line.quantity, selectedUnitId, unitInfo)

  const unitPlaceholder = !line.productId
    ? 'Chọn sản phẩm trước'
    : isUnitLoading
      ? 'Đang tải đơn vị…'
      : isUnitError
        ? 'Không tải được đơn vị'
        : 'Sản phẩm chưa có đơn vị'

  return (
    <div
      className={`grid gap-3 p-3 sm:p-4 ${lineGridColumns(showSourceSlot, showDestinationSlot)} lg:items-start lg:gap-3 lg:px-3 lg:py-2`}
    >
      <div className="flex items-center justify-between lg:justify-center lg:pt-2">
        <span className="text-muted-foreground text-xs">{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label={`Xóa dòng ${index + 1}`}
          disabled={lineCount === 1}
          onClick={() => onRemove(index)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <Field data-invalid={Boolean(errors?.productId)}>
        <FieldLabel className="text-xs lg:sr-only" htmlFor={`transfer-product-${index}`}>
          Sản phẩm
        </FieldLabel>
        <LookupCombobox
          id={`transfer-product-${index}`}
          value={line.productId}
          options={options}
          selectedOption={selectedOption}
          placeholder={
            hasWarehouses ? 'Tìm mã hoặc tên sản phẩm' : 'Chọn kho nhập và kho xuất trước'
          }
          emptyMessage="Kho xuất không có sản phẩm còn tồn khả dụng phù hợp."
          ariaLabel={`Sản phẩm dòng ${index + 1}`}
          isLoading={isProductSearchLoading}
          isInvalid={Boolean(errors?.productId)}
          disabled={isIdentityLocked || !hasWarehouses}
          onSearchChange={(value) => onProductSearchChange(field.id, value)}
          onChange={(value) => {
            form.setValue(`lines.${index}.productId`, value, {
              shouldDirty: true,
              shouldValidate: true,
            })
            form.setValue(`lines.${index}.unitId`, '', { shouldDirty: true })
            form.setValue(`lines.${index}.sourceSlotId`, '', { shouldDirty: true })
          }}
        />
        <FieldError>{errors?.productId?.message}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors?.unitId)}>
        <FieldLabel className="text-xs lg:sr-only" htmlFor={`transfer-unit-${index}`}>
          Đơn vị tính
        </FieldLabel>
        <NativeSelect
          id={`transfer-unit-${index}`}
          className="w-full"
          disabled={!unitInfo || isIdentityLocked}
          value={selectedUnitId}
          onChange={(event) =>
            form.setValue(`lines.${index}.unitId`, event.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          {units.length === 0 ? (
            <NativeSelectOption value="">{unitPlaceholder}</NativeSelectOption>
          ) : null}
          {units.map((unit) => (
            <NativeSelectOption key={unit.unitId} value={unit.unitId}>
              {transferUnitLabel(unit, unitInfo?.baseUnitName ?? '', formatQuantity)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {selectedUnit && !selectedUnit.isBase && unitInfo ? (
          <p className="text-muted-foreground text-xs">
            1 {selectedUnit.unitName} = {formatQuantity(selectedUnit.conversionFactor)}{' '}
            {unitInfo.baseUnitName}
          </p>
        ) : null}
        <FieldError>{errors?.unitId?.message}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors?.quantity)}>
        <FieldLabel className="text-xs lg:sr-only" htmlFor={`transfer-quantity-${index}`}>
          Số lượng
        </FieldLabel>
        <Input
          id={`transfer-quantity-${index}`}
          type="number"
          min="0"
          step={selectedUnit ? 10 ** -selectedUnit.quantityPrecision : 'any'}
          inputMode="decimal"
          aria-invalid={Boolean(errors?.quantity)}
          {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
        />
        <FieldError>{errors?.quantity?.message}</FieldError>
      </Field>
      <div aria-live="polite">
        <span className="text-muted-foreground mb-0.5 block text-xs lg:hidden">
          Quy đổi về đơn vị chính
        </span>
        <span className="text-sm font-medium tabular-nums lg:inline-block lg:pt-2">
          {unitInfo && Number.isFinite(baseQuantity) ? (
            `${formatQuantity(baseQuantity)} ${unitInfo.baseUnitName}`
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-1 lg:pt-2" aria-live="polite">
        <span className="text-muted-foreground block text-xs lg:hidden">
          Tồn khả dụng ở kho xuất
        </span>
        {unitInfo && availableInUnit !== undefined ? (
          <span className="text-sm tabular-nums">
            {formatQuantity(availableInUnit)} {selectedUnit?.unitName}
          </span>
        ) : unitInfo && !hasWarehouses ? (
          <span className="text-muted-foreground text-xs">
            Chọn kho nhập và kho xuất để xem tồn
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
        {exceedsAvailability ? (
          <span className="text-warning text-xs">
            Vượt tồn khả dụng của kho xuất. Giảm số lượng để tạo yêu cầu.
          </span>
        ) : null}
        {lockInfo && lockInfo.dispatched > 0 ? (
          <span className="text-muted-foreground text-xs">
            Đã xuất {formatQuantity(lockInfo.dispatched)} {lockInfo.unitName} (không sửa được)
          </span>
        ) : null}
      </div>
      {showSourceSlot ? (
        <TransferSourceSlotField
          index={index}
          form={form}
          sourceWarehouseId={sourceWarehouseId}
          knownOption={selectedSourceSlot}
          locked={isSourceSlotLocked}
        />
      ) : null}
      {showDestinationSlot ? (
        <TransferDestinationSlotField
          index={index}
          form={form}
          options={destinationSlotOptions}
          knownOption={selectedDestinationSlot}
          isLoading={isDestinationSlotLoading}
          locked={isDestinationSlotLocked}
          onSearchChange={onDestinationSlotSearchChange}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="hidden lg:inline-flex"
        aria-label={`Xóa dòng ${index + 1}`}
        disabled={lineCount === 1}
        onClick={() => onRemove(index)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}
