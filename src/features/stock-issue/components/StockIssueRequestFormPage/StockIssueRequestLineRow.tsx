import { Trash2 } from 'lucide-react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage'
import { formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import type { CreateStockIssueRequestFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueProductOption } from '../../types/stock-issue.types'
import { formatStockIssueQuantity } from '../../utils/stock-issue-format'

export const STOCK_ISSUE_LINE_GRID_CLASS =
  'lg:grid-cols-[28px_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_32px]'

interface StockIssueRequestLineRowProps {
  readonly field: FieldArrayWithId<CreateStockIssueRequestFormValues, 'lines', 'id'>
  readonly index: number
  readonly lineCount: number
  readonly form: UseFormReturn<CreateStockIssueRequestFormValues>
  readonly options: readonly LookupOption[]
  readonly selectedOption?: LookupOption
  readonly product?: StockIssueProductOption
  readonly hasWarehouse: boolean
  readonly isProductSearchLoading: boolean
  readonly isPending: boolean
  readonly onProductSearchChange: (scope: string, value: string) => void
  readonly onProductSelect: (option?: LookupOption) => void
  readonly onRemove: (index: number) => void
}

function formatExpiry(value: string | null): string {
  const date = value ? isoDateStringToDate(value.slice(0, 10)) : undefined
  return date ? `HSD ${formatDisplayDate(date)}` : 'không có HSD'
}

export function StockIssueRequestLineRow({
  field,
  index,
  lineCount,
  form,
  options,
  selectedOption,
  product,
  hasWarehouse,
  isProductSearchLoading,
  isPending,
  onProductSearchChange,
  onProductSelect,
  onRemove,
}: StockIssueRequestLineRowProps) {
  const line = form.watch(`lines.${index}`)
  const errors = form.formState.errors.lines?.[index]
  const selectedUnitId = line.unitId || product?.unitId || ''
  const selectedUnit = product?.units.find((unit) => unit.unitId === selectedUnitId)
  const factor = selectedUnit?.conversionFactor ?? 1
  const baseQuantity = (Number.isFinite(line.quantity) ? line.quantity : 0) * factor
  const exceedsAvailable = Boolean(product) && baseQuantity > (product?.availableQuantity ?? 0)

  return (
    <div
      className={cn(
        'grid gap-3 p-3 sm:p-4 lg:items-start lg:gap-3 lg:px-3 lg:py-2',
        STOCK_ISSUE_LINE_GRID_CLASS
      )}
    >
      <div className="flex items-center justify-between lg:justify-center lg:pt-2">
        <span className="text-muted-foreground text-xs">{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label={`Xóa dòng ${index + 1}`}
          disabled={lineCount === 1 || isPending}
          onClick={() => onRemove(index)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <Field data-invalid={Boolean(errors?.productId)}>
        <FieldLabel className="lg:sr-only" htmlFor={`stock-issue-product-${index}`}>
          Sản phẩm
        </FieldLabel>
        <LookupCombobox
          id={`stock-issue-product-${index}`}
          value={line.productId}
          options={options}
          selectedOption={selectedOption}
          placeholder={hasWarehouse ? 'Tìm tên, SKU hoặc mã vạch' : 'Chọn kho xuất trước'}
          emptyMessage="Kho này không có sản phẩm còn tồn khả dụng phù hợp."
          ariaLabel={`Sản phẩm dòng ${index + 1}`}
          isLoading={isProductSearchLoading}
          isInvalid={Boolean(errors?.productId)}
          disabled={isPending || !hasWarehouse}
          onSearchChange={(value) => onProductSearchChange(field.id, value)}
          onChange={(value, option) => {
            form.setValue(`lines.${index}.productId`, value, {
              shouldDirty: true,
              shouldValidate: true,
            })
            // Đổi sản phẩm thì đơn vị cũ không còn hợp lệ; bỏ trống để dùng đơn vị cơ sở của sản phẩm mới.
            form.setValue(`lines.${index}.unitId`, '', { shouldDirty: true })
            onProductSelect(option)
          }}
        />
        <FieldError>{errors?.productId?.message}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors?.unitId)}>
        <FieldLabel className="lg:sr-only" htmlFor={`stock-issue-unit-${index}`}>
          Đơn vị
        </FieldLabel>
        <NativeSelect
          id={`stock-issue-unit-${index}`}
          className="w-full"
          disabled={!product || isPending}
          value={selectedUnitId}
          onChange={(event) =>
            form.setValue(`lines.${index}.unitId`, event.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          {product ? (
            product.units.map((unit) => (
              <NativeSelectOption key={unit.unitId} value={unit.unitId}>
                {unit.unitName}
                {unit.conversionFactor === 1
                  ? ''
                  : ` (×${formatStockIssueQuantity(unit.conversionFactor)})`}
              </NativeSelectOption>
            ))
          ) : (
            <NativeSelectOption value="">—</NativeSelectOption>
          )}
        </NativeSelect>
      </Field>
      <Field data-invalid={Boolean(errors?.quantity)}>
        <FieldLabel className="lg:sr-only" htmlFor={`stock-issue-quantity-${index}`}>
          Số lượng
        </FieldLabel>
        <Input
          id={`stock-issue-quantity-${index}`}
          type="number"
          min="0"
          step={
            selectedUnit && selectedUnit.quantityPrecision > 0
              ? 10 ** -selectedUnit.quantityPrecision
              : 1
          }
          inputMode="decimal"
          disabled={isPending}
          aria-invalid={Boolean(errors?.quantity)}
          {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
        />
        <FieldError>{errors?.quantity?.message}</FieldError>
      </Field>
      <div aria-live="polite" className="text-xs lg:pt-2">
        <span className="text-muted-foreground mb-0.5 block lg:hidden">Quy đổi và tồn kho</span>
        {product ? (
          <>
            {factor !== 1 ? (
              <p className="text-sm font-medium tabular-nums">
                = {formatStockIssueQuantity(baseQuantity)} {product.unitName}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Tồn khả dụng {formatStockIssueQuantity(product.availableQuantity)} {product.unitName}
            </p>
            {product.firstExpiringLotNumber ? (
              <p className="text-muted-foreground">
                Xuất trước lô{' '}
                <span className="font-mono" translate="no">
                  {product.firstExpiringLotNumber}
                </span>{' '}
                · {formatExpiry(product.firstExpiringLotDate)}
              </p>
            ) : null}
            {exceedsAvailable ? (
              <p className="text-warning mt-0.5">
                Vượt tồn khả dụng — chưa giao việc lấy hàng được cho đến khi đủ tồn.
              </p>
            ) : null}
            {factor !== 1 ? (
              <p className="text-muted-foreground">Chỉ lấy nguyên {selectedUnit?.unitName}.</p>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <Field data-invalid={Boolean(errors?.note)}>
        <FieldLabel className="lg:sr-only" htmlFor={`stock-issue-line-note-${index}`}>
          Ghi chú dòng
        </FieldLabel>
        <Input
          id={`stock-issue-line-note-${index}`}
          maxLength={500}
          placeholder="Ghi chú (tùy chọn)"
          disabled={isPending}
          aria-invalid={Boolean(errors?.note)}
          {...form.register(`lines.${index}.note`)}
        />
        <FieldError>{errors?.note?.message}</FieldError>
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="hidden lg:inline-flex"
        aria-label={`Xóa dòng ${index + 1}`}
        disabled={lineCount === 1 || isPending}
        onClick={() => onRemove(index)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}
