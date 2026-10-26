'use client'

import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import {
  formatEligibilityStatus,
  formatInventoryLocation,
  formatInventoryQuantity,
  formatQualityStatus,
} from '@/features/inventory/utils/inventory-format'
import type { CreateSupplierReturnFormValues } from '../../schemas/supplier-return.schema'

interface Option {
  readonly id: string
  readonly label: string
}

function returnableQuantity(stock: InventoryStock): number {
  return stock.quantityOnHand - stock.reservedQuantity
}

function describeStock(stock: InventoryStock): string {
  return [
    stock.sku,
    stock.productName,
    formatInventoryLocation(stock),
    stock.lotNumber ? `Lô ${stock.lotNumber}` : null,
    stock.qualityStatus === 'Good' && stock.eligibilityStatus === 'Available'
      ? null
      : `${formatQualityStatus(stock.qualityStatus)}/${formatEligibilityStatus(stock.eligibilityStatus)}`,
    `có thể trả ${formatInventoryQuantity(returnableQuantity(stock))}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function CreateSupplierReturnDialog({
  isEditing = false,
  open,
  form,
  warehouses,
  suppliers,
  stocks,
  stockSearch,
  isStocksLoading,
  isPending,
  onStockSearchChange,
  stockPage,
  stockPageCount,
  onStockPageChange,
  onOpenChange,
  onSubmit,
}: {
  readonly isEditing?: boolean
  readonly open: boolean
  readonly form: UseFormReturn<CreateSupplierReturnFormValues>
  readonly warehouses: readonly Option[]
  readonly suppliers: readonly Option[]
  readonly stocks: readonly InventoryStock[]
  readonly stockSearch: string
  readonly isStocksLoading: boolean
  readonly isPending: boolean
  readonly onStockSearchChange: (value: string) => void
  /** Vị trí tồn được tải theo trang (tối đa 100 dòng/trang) để không dòng nào bị khuất. */
  readonly stockPage: number
  readonly stockPageCount: number
  readonly onStockPageChange: (page: number) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: CreateSupplierReturnFormValues) => void
}) {
  const [selectedStockId, setSelectedStockId] = useState('')
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  const { errors } = form.formState
  const warehouseId = form.watch('warehouseId')
  const chosenIds = new Set(lines.fields.map((line) => line.inventoryStockId))
  const pickableStocks = stocks.filter(
    (stock) => !chosenIds.has(stock.id) && returnableQuantity(stock) > 0
  )

  function addLine() {
    const stock = stocks.find((candidate) => candidate.id === selectedStockId)
    if (!stock || chosenIds.has(stock.id)) return
    lines.append({
      inventoryStockId: stock.id,
      label: `${stock.sku} · ${stock.productName} · ${formatInventoryLocation(stock)}${stock.lotNumber ? ` · Lô ${stock.lotNumber}` : ''}`,
      maxQuantity: returnableQuantity(stock),
      unit: stock.unitName ?? '',
      quantity: returnableQuantity(stock),
      quantityPrecision: stock.quantityPrecision ?? 2,
    })
    setSelectedStockId('')
    form.clearErrors('lines')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Sửa nháp trả NCC' : 'Lập phiếu trả hàng NCC'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Lưu nháp chưa giữ tồn. Hệ thống kiểm tra lại tồn khả dụng khi bạn gửi duyệt lại.'
              : 'Số lượng trả được giữ trên tồn kho ngay khi lập phiếu. Có thể trả = tồn − đã giữ, kể cả hàng đang bị giữ do hư hỏng.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.warehouseId)}>
                <FieldLabel htmlFor="supplier-return-warehouse">Kho</FieldLabel>
                <NativeSelect
                  id="supplier-return-warehouse"
                  aria-invalid={Boolean(errors.warehouseId)}
                  {...form.register('warehouseId', {
                    onChange: () => {
                      lines.replace([])
                      setSelectedStockId('')
                    },
                  })}
                >
                  <NativeSelectOption value="">Chọn kho</NativeSelectOption>
                  {warehouses.map((warehouse) => (
                    <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                      {warehouse.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.warehouseId]} />
              </Field>
              <Field data-invalid={Boolean(errors.supplierId)}>
                <FieldLabel htmlFor="supplier-return-supplier">Nhà cung cấp</FieldLabel>
                <NativeSelect
                  id="supplier-return-supplier"
                  aria-invalid={Boolean(errors.supplierId)}
                  {...form.register('supplierId')}
                >
                  <NativeSelectOption value="">Chọn nhà cung cấp</NativeSelectOption>
                  {suppliers.map((supplier) => (
                    <NativeSelectOption key={supplier.id} value={supplier.id}>
                      {supplier.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.supplierId]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.reason)}>
              <FieldLabel htmlFor="supplier-return-reason">Lý do trả hàng</FieldLabel>
              <Textarea
                id="supplier-return-reason"
                aria-invalid={Boolean(errors.reason)}
                {...form.register('reason')}
              />
              <FieldError errors={[errors.reason]} />
            </Field>
            <Field data-invalid={Boolean(errors.negotiationNote)}>
              <FieldLabel htmlFor="supplier-return-note">Ghi chú thương lượng (nếu có)</FieldLabel>
              <Textarea id="supplier-return-note" {...form.register('negotiationNote')} />
              <FieldError errors={[errors.negotiationNote]} />
            </Field>
            <div className="grid gap-3 border p-3">
              <Field>
                <FieldLabel htmlFor="supplier-return-stock-search">Tìm hàng tồn</FieldLabel>
                <Input
                  id="supplier-return-stock-search"
                  autoComplete="off"
                  placeholder="Tên hoặc SKU sản phẩm…"
                  disabled={!warehouseId}
                  value={stockSearch}
                  onChange={(event) => onStockSearchChange(event.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field className="min-w-0 flex-1">
                  <FieldLabel htmlFor="supplier-return-stock-picker">Chọn vị trí tồn</FieldLabel>
                  <NativeSelect
                    id="supplier-return-stock-picker"
                    disabled={!warehouseId || isStocksLoading}
                    value={selectedStockId}
                    onChange={(event) => setSelectedStockId(event.target.value)}
                  >
                    <NativeSelectOption value="">
                      {!warehouseId
                        ? 'Chọn kho trước'
                        : isStocksLoading
                          ? 'Đang tải tồn kho…'
                          : pickableStocks.length === 0
                            ? 'Không có vị trí tồn phù hợp'
                            : 'Chọn vị trí tồn'}
                    </NativeSelectOption>
                    {pickableStocks.map((stock) => (
                      <NativeSelectOption key={stock.id} value={stock.id}>
                        {describeStock(stock)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedStockId}
                  onClick={addLine}
                >
                  <Plus data-icon="inline-start" />
                  Thêm dòng
                </Button>
              </div>
              {stockPageCount > 1 ? (
                <div className="flex items-center justify-end gap-2 text-sm">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Trang tồn trước"
                    disabled={isStocksLoading || stockPage <= 1}
                    onClick={() => {
                      setSelectedStockId('')
                      onStockPageChange(stockPage - 1)
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="text-muted-foreground tabular-nums">
                    Trang {stockPage}/{stockPageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Trang tồn sau"
                    disabled={isStocksLoading || stockPage >= stockPageCount}
                    onClick={() => {
                      setSelectedStockId('')
                      onStockPageChange(stockPage + 1)
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              ) : null}
              {lines.fields.map((line, index) => {
                const quantityError = errors.lines?.[index]?.quantity
                return (
                  <FieldGroup
                    key={line.id}
                    className="grid gap-3 border p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-start"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium wrap-anywhere">{line.label}</p>
                      <p className="text-muted-foreground text-xs">
                        Có thể trả: {formatInventoryQuantity(line.maxQuantity)} {line.unit}
                      </p>
                    </div>
                    <Field data-invalid={Boolean(quantityError)}>
                      <FieldLabel htmlFor={`supplier-return-quantity-${index}`}>
                        Số lượng trả
                      </FieldLabel>
                      <Input
                        id={`supplier-return-quantity-${index}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={line.maxQuantity}
                        step={10 ** -Math.min(line.quantityPrecision ?? 2, 2)}
                        aria-invalid={Boolean(quantityError)}
                        {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                      />
                      <FieldError errors={[quantityError]} />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Bỏ dòng ${line.label}`}
                      onClick={() => lines.remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </FieldGroup>
                )
              })}
              <FieldError errors={[errors.lines?.root ?? (errors.lines as { message?: string })]} />
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isEditing ? 'Lưu nháp' : 'Lập phiếu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
