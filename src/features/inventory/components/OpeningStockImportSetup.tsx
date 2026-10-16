'use client'

import { Download } from 'lucide-react'
import type { Ref } from 'react'
import { DatePickerField } from '@/components/forms/DatePickerField'
import { BulkImportDelimiter } from '@/components/operations/BulkImportWorkspace'
import { BulkImportFilePicker } from '@/components/operations/BulkImportFilePicker'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { InventoryFilterOption } from '../types/inventory.types'

export interface OpeningStockSetupFieldsProps {
  readonly warehouses: readonly InventoryFilterOption[]
  readonly warehouseId: string
  readonly effectiveDate: string
  readonly busy: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onDateChange: (value: string) => void
  readonly warehouseError?: string
  readonly dateError?: string
  readonly warehouseRef?: Ref<HTMLSelectElement>
  readonly dateRef?: Ref<HTMLButtonElement>
}
export function OpeningStockImportSetupFields({
  busy,
  warehouseId,
  effectiveDate,
  warehouses,
  onWarehouseChange,
  onDateChange,
  warehouseError,
  dateError,
  warehouseRef,
  dateRef,
}: OpeningStockSetupFieldsProps) {
  return (
    <fieldset disabled={busy} className="bg-card grid gap-3 border p-4 sm:grid-cols-2">
      <Field data-invalid={Boolean(warehouseError)}>
        <FieldLabel htmlFor="opening-import-warehouse">Kho ghi nhận *</FieldLabel>
        <NativeSelect
          id="opening-import-warehouse"
          name="warehouseId"
          ref={warehouseRef}
          aria-invalid={Boolean(warehouseError)}
          aria-describedby={warehouseError ? 'opening-import-warehouse-error' : undefined}
          value={warehouseId}
          onChange={(event) => onWarehouseChange(event.target.value)}
        >
          <NativeSelectOption value="">Chọn kho</NativeSelectOption>
          {warehouses.map((warehouse) => (
            <NativeSelectOption key={warehouse.value} value={warehouse.value}>
              {warehouse.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {warehouseError ? (
          <FieldError id="opening-import-warehouse-error">{warehouseError}</FieldError>
        ) : null}
      </Field>
      <DatePickerField
        id="opening-import-date"
        label="Ngày ghi nhận tồn đầu"
        required
        value={effectiveDate}
        onChange={onDateChange}
        error={dateError}
        triggerRef={dateRef}
      />
    </fieldset>
  )
}
export function OpeningStockImportSetup(
  props: OpeningStockSetupFieldsProps & {
    readonly delimiter: string
    readonly error: string | null
    readonly onDelimiterChange: (value: string) => void
    readonly onFileChange: (file: File) => void
    readonly onTemplate: (variant: 'basic' | 'full') => void
  }
) {
  return (
    <>
      <OpeningStockImportSetupFields {...props} />
      <BulkImportDelimiter
        id="opening-import-delimiter"
        value={props.delimiter}
        disabled={props.busy}
        onChange={props.onDelimiterChange}
      />
      <BulkImportFilePicker
        entityLabel="tồn đầu kỳ"
        maxRows={200}
        pending={props.busy}
        error={props.error}
        onFileChange={props.onFileChange}
      />
      <section aria-label="Sử dụng tệp mẫu" className="space-y-3">
        <h2 className="font-semibold">Sử dụng tệp mẫu</h2>
        <p className="text-muted-foreground text-sm">
          Nhập theo đơn vị cơ sở; mỗi tệp tối đa 200 dòng.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['basic', 'full'] as const).map((variant) => (
            <Button
              key={variant}
              variant="outline"
              className="h-auto min-h-16 justify-between gap-3 p-4 text-left whitespace-normal"
              disabled={props.busy}
              onClick={() => props.onTemplate(variant)}
            >
              <span>
                <span className="block font-semibold">
                  {variant === 'basic' ? 'Mẫu cơ bản' : 'Mẫu đầy đủ'}
                </span>
                <span className="text-xs font-normal">
                  {variant === 'basic'
                    ? 'Hàng không theo lô: mã hàng, vị trí/kệ, số lượng, đơn vị'
                    : 'Thêm lô, ngày sản xuất, hạn dùng và trạng thái'}
                </span>
              </span>
              <Download aria-hidden="true" />
            </Button>
          ))}
        </div>
      </section>
    </>
  )
}
