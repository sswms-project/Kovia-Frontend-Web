'use client'

import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  BusinessCodeField,
  type BusinessCodeFieldProps,
} from '@/components/forms/BusinessCodeField'
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
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import {
  formatEligibilityStatus,
  formatInventoryLocation,
  formatInventoryQuantity,
  formatQualityStatus,
} from '@/features/inventory/utils/inventory-format'
import type { CreateSupplierReturnFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturnStockOption } from '../../types/supplier-return.types'

interface Option {
  readonly id: string
  readonly label: string
}
interface CreateSupplierReturnDialogProps {
  readonly codeSuggestionStatus?: BusinessCodeFieldProps['suggestionStatus']
  readonly onCodeChange?: () => void
  readonly isEditing?: boolean
  /** Dòng báo dưới tiêu đề (vd. form đang điền sẵn từ bản nháp của Trợ lý AI). */
  readonly notice?: ReactNode
  readonly open: boolean
  readonly form: UseFormReturn<CreateSupplierReturnFormValues>
  readonly warehouses: readonly Option[]
  readonly suppliers: readonly Option[]
  readonly receipts: readonly Option[]
  readonly selectedReceipt?: Option
  readonly stocks: readonly SupplierReturnStockOption[]
  readonly autoSelectSingleStock?: boolean
  readonly isStocksLoading: boolean
  readonly isReceiptsLoading: boolean
  readonly receiptsError: string | null
  readonly stocksError: string | null
  readonly isPending: boolean
  readonly onStockSearchChange: (value: string) => void
  readonly onReceiptSearchChange: (value: string) => void
  readonly stockPage: number
  readonly stockPageCount: number
  readonly onStockPageChange: (page: number) => void
  readonly receiptPage: number
  readonly receiptPageCount: number
  readonly onReceiptPageChange: (page: number) => void
  readonly onRetrySources: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: CreateSupplierReturnFormValues) => void
}
function SourcePages({
  page,
  count,
  loading,
  label,
  onChange,
}: {
  readonly page: number
  readonly count: number
  readonly loading: boolean
  readonly label: string
  readonly onChange: (page: number) => void
}) {
  if (count <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Trang ${label} trước`}
        disabled={loading || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-muted-foreground text-xs tabular-nums">
        {label}: {page}/{count}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Trang ${label} sau`}
        disabled={loading || page >= count}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
function describeStock(stock: SupplierReturnStockOption): string {
  return [
    formatInventoryLocation(stock),
    stock.lotNumber ? `Lô ${stock.lotNumber}` : null,
    stock.qualityStatus === 'Good' && stock.eligibilityStatus === 'Available'
      ? null
      : `${formatQualityStatus(stock.qualityStatus)}/${formatEligibilityStatus(stock.eligibilityStatus)}`,
    `Có thể trả ${formatInventoryQuantity(stock.returnableQuantity)} ${stock.unitName ?? ''}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
function returnLineFromStock(
  stock: SupplierReturnStockOption
): CreateSupplierReturnFormValues['lines'][number] {
  return {
    inventoryStockId: stock.id,
    label: `${stock.sku} - ${stock.productName} · ${formatInventoryLocation(stock)}${stock.lotNumber ? ` · Lô ${stock.lotNumber}` : ''}`,
    maxQuantity: stock.returnableQuantity,
    unit: stock.unitName ?? '',
    quantity: 0,
    quantityPrecision: stock.quantityPrecision ?? 2,
    sourceGroupKey: `${stock.productId}:${stock.lotId ?? ''}`,
    sourceRemainingQuantity: stock.sourceRemainingQuantity,
  }
}
export function CreateSupplierReturnDialog(props: CreateSupplierReturnDialogProps) {
  const { form, isPending } = props
  const autoAddedScope = useRef<string | null>(null)
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  const { append } = lines
  const values = form.watch()
  const { errors } = form.formState
  const chosenIds = new Set(lines.fields.map((line) => line.inventoryStockId))
  const pickableStocks = props.stocks
    .map((stock) => {
      const key = `${stock.productId}:${stock.lotId ?? ''}`
      const selected = values.lines
        .filter((line) => line.sourceGroupKey === key)
        .reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? line.quantity : 0), 0)
      return {
        ...stock,
        returnableQuantity: Math.max(
          0,
          Math.min(stock.returnableQuantity, stock.sourceRemainingQuantity - selected)
        ),
      }
    })
    .filter((stock) => !chosenIds.has(stock.id) && stock.returnableQuantity > 0)
  const selectionScope = `${values.warehouseId}:${values.supplierId}:${values.sourceGoodsReceiptId}`
  useEffect(() => {
    if (!props.open || !values.sourceGoodsReceiptId) {
      autoAddedScope.current = null
      return
    }
    const stock = props.stocks[0]
    if (
      !props.autoSelectSingleStock ||
      props.isStocksLoading ||
      props.stocksError ||
      isPending ||
      lines.fields.length ||
      !stock ||
      stock.returnableQuantity <= 0 ||
      autoAddedScope.current === selectionScope
    )
      return
    autoAddedScope.current = selectionScope
    append(returnLineFromStock(stock), { shouldFocus: false })
  }, [
    props.open,
    props.autoSelectSingleStock,
    props.isStocksLoading,
    props.stocksError,
    props.stocks,
    isPending,
    values.sourceGoodsReceiptId,
    selectionScope,
    lines.fields.length,
    append,
  ])
  function clearSource() {
    lines.replace([])
    form.setValue('sourceGoodsReceiptId', '')
    props.onStockSearchChange('')
    props.onReceiptSearchChange('')
  }
  function addLine(selectedStockId: string) {
    const stock = pickableStocks.find((candidate) => candidate.id === selectedStockId)
    if (
      !stock ||
      props.isStocksLoading ||
      props.stocksError ||
      !values.sourceGoodsReceiptId ||
      isPending
    )
      return
    lines.append(
      {
        ...returnLineFromStock(stock),
        maxQuantity:
          props.stocks.find((candidate) => candidate.id === stock.id)?.returnableQuantity ??
          stock.returnableQuantity,
      },
      { shouldFocus: false }
    )
    form.clearErrors('lines')
  }
  const blocked =
    isPending ||
    props.isStocksLoading ||
    props.isReceiptsLoading ||
    Boolean(props.stocksError || props.receiptsError)
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90dvh] min-w-0 overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-6">
          <DialogTitle>
            {props.isEditing ? 'Sửa nháp trả NCC' : 'Lập phiếu trả hàng NCC'}
          </DialogTitle>
          <DialogDescription>
            {props.isEditing
              ? 'Lưu nháp chưa giữ tồn. Hệ thống kiểm tra lại khi gửi duyệt.'
              : 'Chọn phiếu nhận nguồn và tồn hiện tại để trả NCC. Hệ thống giữ lượng trả khi lập phiếu.'}
          </DialogDescription>
        </DialogHeader>
        {props.notice}
        <form
          onSubmit={form.handleSubmit((value) => {
            if (!blocked) props.onSubmit(value)
          })}
          noValidate
        >
          <FieldGroup>
            <BusinessCodeField
              label="Mã phiếu trả nhà cung cấp"
              description={
                props.isEditing
                  ? 'Mã của phiếu đã lưu.'
                  : 'Mã được gợi ý, có thể chỉnh sửa. Để trống thì hệ thống tự cấp.'
              }
              suggestionStatus={props.isEditing ? undefined : props.codeSuggestionStatus}
              error={errors.supplierReturnCode}
              inputProps={{
                ...form.register('supplierReturnCode', { onChange: props.onCodeChange }),
                id: 'supplier-return-code',
                maxLength: 40,
                placeholder: 'VD: THNCC000001',
                disabled: isPending,
                readOnly: props.isEditing,
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.warehouseId)}>
                <FieldLabel htmlFor="supplier-return-warehouse">Kho</FieldLabel>
                <NativeSelect
                  id="supplier-return-warehouse"
                  className="w-full"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.warehouseId)}
                  {...form.register('warehouseId', { onChange: clearSource })}
                >
                  <NativeSelectOption value="">Chọn kho</NativeSelectOption>
                  {props.warehouses.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.warehouseId]} />
              </Field>
              <Field data-invalid={Boolean(errors.supplierId)}>
                <FieldLabel htmlFor="supplier-return-supplier">Nhà cung cấp</FieldLabel>
                <NativeSelect
                  id="supplier-return-supplier"
                  className="w-full"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.supplierId)}
                  {...form.register('supplierId', { onChange: clearSource })}
                >
                  <NativeSelectOption value="">Chọn nhà cung cấp</NativeSelectOption>
                  {props.suppliers.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.supplierId]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.sourceGoodsReceiptId)}>
              <FieldLabel htmlFor="supplier-return-source">Phiếu nhận hàng nguồn</FieldLabel>
              <LookupCombobox
                id="supplier-return-source"
                key={`${values.warehouseId}:${values.supplierId}`}
                value={values.sourceGoodsReceiptId}
                options={props.receipts.map((item) => ({ value: item.id, label: item.label }))}
                selectedOption={
                  props.selectedReceipt
                    ? { value: props.selectedReceipt.id, label: props.selectedReceipt.label }
                    : undefined
                }
                placeholder={
                  !values.warehouseId || !values.supplierId
                    ? 'Chọn kho và NCC trước'
                    : 'Tìm mã phiếu nhận hàng…'
                }
                emptyMessage="Không có phiếu nhận phù hợp"
                ariaLabel="Phiếu nhận hàng nguồn"
                isLoading={props.isReceiptsLoading}
                isInvalid={Boolean(errors.sourceGoodsReceiptId)}
                disabled={
                  !values.warehouseId ||
                  !values.supplierId ||
                  isPending ||
                  Boolean(props.receiptsError)
                }
                onSearchChange={props.onReceiptSearchChange}
                onChange={(value) => {
                  if (value === values.sourceGoodsReceiptId) return
                  form.setValue('sourceGoodsReceiptId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  lines.replace([])
                  props.onStockSearchChange('')
                }}
              />
              <FieldError errors={[errors.sourceGoodsReceiptId]} />
              <SourcePages
                page={props.receiptPage}
                count={props.receiptPageCount}
                loading={props.isReceiptsLoading}
                label="Phiếu nhận"
                onChange={props.onReceiptPageChange}
              />
            </Field>
            {props.receiptsError || props.stocksError ? (
              <div role="alert" className="border-destructive border p-3 text-sm">
                <p>{props.receiptsError ?? props.stocksError}</p>
                <Button type="button" variant="outline" size="sm" onClick={props.onRetrySources}>
                  Thử lại
                </Button>
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-3 border p-3">
              <Field>
                <FieldLabel htmlFor="supplier-return-stock-picker">
                  {lines.fields.length ? 'Chọn thêm hàng trả' : 'Chọn hàng trả'}
                </FieldLabel>
                <LookupCombobox
                  id="supplier-return-stock-picker"
                  key={`${values.warehouseId}:${values.supplierId}:${values.sourceGoodsReceiptId}:${lines.fields.length}`}
                  value=""
                  options={pickableStocks.map((stock) => ({
                    value: stock.id,
                    label: `${stock.sku} - ${stock.productName}`,
                    description: describeStock(stock),
                  }))}
                  placeholder={
                    !values.sourceGoodsReceiptId
                      ? 'Chọn phiếu nhận hàng trước'
                      : 'Tìm mã hoặc tên hàng hóa…'
                  }
                  emptyMessage="Không còn tồn có thể trả theo phiếu nguồn"
                  ariaLabel="Chọn hàng trả"
                  isLoading={props.isStocksLoading}
                  isInvalid={false}
                  disabled={!values.sourceGoodsReceiptId || isPending || Boolean(props.stocksError)}
                  onChange={addLine}
                  onSearchChange={props.onStockSearchChange}
                />
              </Field>
              <SourcePages
                page={props.stockPage}
                count={props.stockPageCount}
                loading={props.isStocksLoading}
                label="Hàng tồn"
                onChange={(page) => {
                  props.onStockPageChange(page)
                }}
              />
              {props.stocks.some((stock) => stock.unattributedReturnedQuantity > 0) ? (
                <p className="text-muted-foreground text-xs">
                  Có phiếu trả cũ chưa gắn nguồn; số có thể trả đã trừ bảo thủ phần này.
                </p>
              ) : null}
              {props.stocks.some((stock) => !stock.lotId) ? (
                <p className="text-muted-foreground text-xs">
                  Hàng không theo lô là tồn gộp; phiếu nguồn dùng đối chiếu chứng từ.
                </p>
              ) : null}
              {lines.fields.map((line, index) => (
                <FieldGroup
                  key={line.id}
                  className="grid gap-3 border-t pt-3 sm:grid-cols-[1fr_9rem_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium wrap-anywhere">{line.label}</p>
                    <p className="text-muted-foreground text-xs">
                      Có thể trả: {formatInventoryQuantity(line.maxQuantity)} {line.unit}
                    </p>
                  </div>
                  <Field data-invalid={Boolean(errors.lines?.[index]?.quantity)}>
                    <FieldLabel htmlFor={`supplier-return-quantity-${index}`}>
                      Số lượng trả
                    </FieldLabel>
                    <Input
                      id={`supplier-return-quantity-${index}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={line.maxQuantity}
                      step={Math.min(line.quantityPrecision ?? 2, 2) === 0 ? 1 : 'any'}
                      disabled={isPending}
                      aria-invalid={Boolean(errors.lines?.[index]?.quantity)}
                      {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <FieldError errors={[errors.lines?.[index]?.quantity]} />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    aria-label={`Bỏ dòng ${line.label}`}
                    onClick={() => lines.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </FieldGroup>
              ))}
              <FieldError errors={[errors.lines?.root, { message: errors.lines?.message }]} />
            </div>
            <Field data-invalid={Boolean(errors.reason)}>
              <FieldLabel htmlFor="supplier-return-reason">Lý do trả hàng</FieldLabel>
              <Textarea
                id="supplier-return-reason"
                disabled={isPending}
                aria-invalid={Boolean(errors.reason)}
                {...form.register('reason')}
              />
              <FieldError errors={[errors.reason]} />
            </Field>
            <Field data-invalid={Boolean(errors.negotiationNote)}>
              <FieldLabel htmlFor="supplier-return-note">Ghi chú thương lượng (nếu có)</FieldLabel>
              <Textarea
                id="supplier-return-note"
                disabled={isPending}
                {...form.register('negotiationNote')}
              />
              <FieldError errors={[errors.negotiationNote]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => props.onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button type="submit" disabled={blocked || !values.sourceGoodsReceiptId}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {props.isEditing ? 'Lưu nháp' : 'Lập phiếu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
