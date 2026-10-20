import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { InventoryFilterOption, StockMovementType } from '../../types/inventory.types'
import { STOCK_MOVEMENT_TYPES } from '../../types/inventory.types'

interface StockMovementFiltersProps {
  readonly open: boolean
  readonly searchText: string
  readonly warehouseId: string
  readonly slotId: string
  readonly productId: string
  readonly movementType: StockMovementType | ''
  readonly dateFrom: string
  readonly dateTo: string
  readonly productOptions: readonly InventoryFilterOption[]
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly slotOptions: readonly InventoryFilterOption[]
  readonly isDateRangeValid: boolean
  readonly areProductsLoading: boolean
  readonly areProductsError: boolean
  readonly areLocationsLoading: boolean
  readonly areLocationsError: boolean
  readonly activeFilterCount: number
  readonly onOpenChange: (open: boolean) => void
  readonly onProductChange: (value: string) => void
  readonly onSearchChange: (value: string) => void
  readonly onWarehouseChange: (value: string) => void
  readonly onSlotChange: (value: string) => void
  readonly onMovementTypeChange: (value: StockMovementType | '') => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onResetFilters: () => void
  readonly onRetryProducts: () => void
  readonly onRetryLocations: () => void
}

const movementOptions = [
  { value: STOCK_MOVEMENT_TYPES.inbound, label: 'Nhập kho' },
  { value: STOCK_MOVEMENT_TYPES.putAway, label: 'Cất hàng' },
  { value: STOCK_MOVEMENT_TYPES.pick, label: 'Lấy hàng' },
  { value: STOCK_MOVEMENT_TYPES.issue, label: 'Xuất kho' },
  { value: STOCK_MOVEMENT_TYPES.transferOut, label: 'Điều chuyển đi' },
  { value: STOCK_MOVEMENT_TYPES.transferIn, label: 'Điều chuyển đến' },
  { value: STOCK_MOVEMENT_TYPES.adjustment, label: 'Điều chỉnh' },
  { value: STOCK_MOVEMENT_TYPES.returnIn, label: 'Nhập hàng trả lại' },
  { value: STOCK_MOVEMENT_TYPES.returnOut, label: 'Trả nhà cung cấp' },
  { value: STOCK_MOVEMENT_TYPES.scrap, label: 'Loại bỏ' },
  { value: STOCK_MOVEMENT_TYPES.opening, label: 'Tồn đầu kỳ' },
  { value: STOCK_MOVEMENT_TYPES.reclassification, label: 'Phân loại lại' },
  { value: STOCK_MOVEMENT_TYPES.correction, label: 'Sửa sai biến động' },
] as const

export function StockMovementFilters({
  open,
  searchText,
  warehouseId,
  slotId,
  productId,
  movementType,
  dateFrom,
  dateTo,
  productOptions,
  warehouseOptions,
  slotOptions,
  isDateRangeValid,
  areProductsLoading,
  areProductsError,
  areLocationsLoading,
  areLocationsError,
  activeFilterCount,
  onOpenChange,
  onProductChange,
  onSearchChange,
  onWarehouseChange,
  onSlotChange,
  onMovementTypeChange,
  onDateFromChange,
  onDateToChange,
  onResetFilters,
  onRetryProducts,
  onRetryLocations,
}: StockMovementFiltersProps) {
  function handleMovementTypeChange(value: string) {
    onMovementTypeChange(movementOptions.find((option) => option.value === value)?.value ?? '')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Lọc lịch sử biến động</SheetTitle>
          <SheetDescription>
            Thu hẹp dữ liệu theo sản phẩm, nghiệp vụ hoặc thời gian.
          </SheetDescription>
        </SheetHeader>
        <FieldGroup className="flex-1 p-4">
          {areLocationsError ? (
            <div
              className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 border p-3"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium">Không thể tải danh sách kho hoặc vị trí</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={onRetryLocations}
                >
                  Thử tải lại
                </Button>
              </div>
            </div>
          ) : null}
          {areProductsError ? (
            <div
              className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 border p-3"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium">Không thể tải danh sách sản phẩm</p>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={onRetryProducts}
                >
                  Thử tải lại
                </Button>
              </div>
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="movement-search">SKU hoặc tên sản phẩm</FieldLabel>
            <Input
              id="movement-search"
              value={searchText}
              placeholder="Nhập SKU hoặc tên sản phẩm"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="movement-warehouse">Kho</FieldLabel>
            <NativeSelect
              id="movement-warehouse"
              className="h-11 sm:h-8"
              value={warehouseId}
              disabled={areLocationsLoading}
              onChange={(event) => onWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {warehouseOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="movement-slot">Vị trí</FieldLabel>
            <NativeSelect
              id="movement-slot"
              className="h-11 sm:h-8"
              value={slotId}
              disabled={!warehouseId || areLocationsLoading}
              onChange={(event) => onSlotChange(event.target.value)}
            >
              <NativeSelectOption value="">
                {warehouseId ? 'Tất cả vị trí' : 'Chọn kho trước'}
              </NativeSelectOption>
              {slotOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="movement-product">Sản phẩm</FieldLabel>
            <NativeSelect
              id="movement-product"
              className="h-11 sm:h-8"
              value={productId}
              disabled={areProductsLoading}
              onChange={(event) => onProductChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả sản phẩm</NativeSelectOption>
              {productOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="movement-type">Loại biến động</FieldLabel>
            <NativeSelect
              id="movement-type"
              className="h-11 sm:h-8"
              value={movementType}
              onChange={(event) => handleMovementTypeChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả loại</NativeSelectOption>
              {movementOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="movement-date-from">Từ ngày</FieldLabel>
              <Input
                id="movement-date-from"
                type="date"
                className="h-11 sm:h-8"
                value={dateFrom}
                max={dateTo || undefined}
                aria-invalid={!isDateRangeValid}
                onChange={(event) => onDateFromChange(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="movement-date-to">Đến ngày</FieldLabel>
              <Input
                id="movement-date-to"
                type="date"
                className="h-11 sm:h-8"
                value={dateTo}
                min={dateFrom || undefined}
                aria-invalid={!isDateRangeValid}
                onChange={(event) => onDateToChange(event.target.value)}
              />
            </Field>
          </div>
          {!isDateRangeValid ? (
            <p className="text-destructive text-xs" role="alert">
              Ngày bắt đầu không được sau ngày kết thúc.
            </p>
          ) : null}
        </FieldGroup>
        <SheetFooter>
          <Button type="button" disabled={!isDateRangeValid} onClick={() => onOpenChange(false)}>
            Xem kết quả
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={activeFilterCount === 0}
            onClick={onResetFilters}
          >
            Đặt lại
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
