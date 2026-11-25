import { Info, Trash2 } from 'lucide-react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { revalidateEnteredQuantity } from '@/lib/quantity-rules'
import type {
  ProductResponse,
  ProductUnitConversion,
  UnitResponse,
} from '@/features/product/types/product.types'
import {
  resolveInboundLineUnits,
  type InboundRequestFormValues,
} from '../../schemas/inbound-request.schema'
import type { LookupOption } from '../../types/inbound-request.types'
import { formatQuantity } from '../../utils/inbound-request-format'
import { ProductSelect } from './ProductSelect'

interface InboundRequestLineRowProps {
  readonly field: FieldArrayWithId<InboundRequestFormValues, 'lines', 'id'>
  readonly index: number
  readonly lineCount: number
  readonly form: UseFormReturn<InboundRequestFormValues>
  readonly product?: ProductResponse
  readonly options: readonly LookupOption[]
  readonly conversions: readonly ProductUnitConversion[]
  readonly units: readonly UnitResponse[]
  readonly isProductSearchLoading: boolean
  readonly isUnitLoading: boolean
  readonly onProductSearchChange: (scope: string, value: string) => void
  readonly onRemove: (index: number) => void
}

export function InboundRequestLineRow({
  field,
  index,
  lineCount,
  form,
  product,
  options,
  conversions,
  units,
  isProductSearchLoading,
  isUnitLoading,
  onProductSearchChange,
  onRemove,
}: InboundRequestLineRowProps) {
  const line = form.watch(`lines.${index}`)
  const { alternatives, baseUnit, factor } = resolveInboundLineUnits(
    product,
    line.unitId,
    units,
    conversions
  )
  const baseQuantity = line.quantity * (factor ?? 0)
  const errors = form.formState.errors.lines?.[index]

  return (
    <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[28px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_32px] lg:items-center lg:gap-3 lg:px-3 lg:py-2">
      <div className="flex items-center justify-between lg:justify-center">
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
      <div>
        <FieldLabel className="mb-1 block text-xs lg:sr-only" htmlFor={`product-${index}`}>
          Sản phẩm
        </FieldLabel>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <ProductSelect
              inputId={`product-${index}`}
              searchScope={field.id}
              index={index}
              form={form}
              options={options}
              isLoading={isProductSearchLoading}
              selectedOption={
                product
                  ? { value: product.id, label: `${product.sku} - ${product.productName}` }
                  : undefined
              }
              onSearchChange={onProductSearchChange}
            />
          </div>
          {product ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Chi tiết sản phẩm ${product.productName}`}
                >
                  <Info className="text-muted-foreground size-3.5" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="font-medium">{product.productName}</div>
                <div className="text-muted-foreground">{product.sku}</div>
                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {product.categoryName ? (
                    <>
                      <span className="text-muted-foreground">Danh mục</span>
                      <span>{product.categoryName}</span>
                    </>
                  ) : null}
                  <span className="text-muted-foreground">Đơn vị cơ sở</span>
                  <span>{product.unitName}</span>
                  <span className="text-muted-foreground">Tồn kho</span>
                  <span className="tabular-nums">
                    {formatQuantity(product.availableQuantity)} {product.unitName}
                  </span>
                  <span className="text-muted-foreground">Theo lô</span>
                  <span>{product.isLotTracked ? 'Có' : 'Không'}</span>
                  {product.shelfLifeDays ? (
                    <>
                      <span className="text-muted-foreground">Hạn sử dụng</span>
                      <span>{product.shelfLifeDays} ngày</span>
                    </>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </div>
      <Field data-invalid={Boolean(errors?.unitId)}>
        <FieldLabel className="lg:sr-only" htmlFor={`unit-${index}`}>
          Đơn vị tính
        </FieldLabel>
        <NativeSelect
          id={`unit-${index}`}
          className="w-full"
          disabled={!product || isUnitLoading}
          aria-invalid={Boolean(errors?.unitId)}
          value={line.unitId}
          onChange={(event) => {
            form.setValue(`lines.${index}.unitId`, event.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            })
            revalidateEnteredQuantity(form, `lines.${index}.quantity`)
          }}
        >
          <NativeSelectOption value={product?.unitId ?? ''}>
            {baseUnit?.unitName ?? 'Đơn vị cơ sở'}
          </NativeSelectOption>
          {alternatives.map((conversion) => (
            <NativeSelectOption key={conversion.unitId} value={conversion.unitId}>
              {conversion.unitName} (×{formatQuantity(conversion.conversionFactor)})
            </NativeSelectOption>
          ))}
          {line.unitId &&
          line.unitId !== product?.unitId &&
          !alternatives.some((conversion) => conversion.unitId === line.unitId) ? (
            <NativeSelectOption value={line.unitId} disabled>
              Đơn vị đã ngừng sử dụng
            </NativeSelectOption>
          ) : null}
        </NativeSelect>
        <FieldError>{errors?.unitId?.message}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors?.quantity)}>
        <FieldLabel className="lg:sr-only" htmlFor={`quantity-${index}`}>
          Số lượng
        </FieldLabel>
        <Input
          id={`quantity-${index}`}
          type="number"
          min="0"
          step="any"
          aria-invalid={Boolean(errors?.quantity)}
          {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
        />
        <FieldError>{errors?.quantity?.message}</FieldError>
      </Field>
      <div aria-live="polite">
        <span className="text-muted-foreground mb-0.5 block text-xs lg:hidden">
          Quy đổi về đơn vị cơ sở
        </span>
        <span className="text-sm font-medium tabular-nums">
          {product && factor !== undefined && Number.isFinite(baseQuantity) ? (
            `${formatQuantity(baseQuantity)} ${baseUnit?.unitName ?? ''}`
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </span>
        {product &&
        factor !== undefined &&
        baseUnit &&
        Math.abs(baseQuantity - Number(baseQuantity.toFixed(2))) > 1e-9 ? (
          <span className="text-warning mt-1 block text-xs">
            Phiếu nhận hàng hiện chỉ hỗ trợ 2 chữ số thập phân.
          </span>
        ) : null}
      </div>
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
