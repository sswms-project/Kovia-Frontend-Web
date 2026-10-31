'use client'

import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import { useStockIssueSourceOptions } from '../../hooks/use-stock-issue-source-options'
import type { StockIssueSourcesValues } from '../../schemas/stock-issue-sources.schema'
import type { StockIssueRequestItem, StockIssueRequestSummary } from '../../types/stock-issue.types'

export function StockIssueSourceRow({
  order,
  item,
  scope,
  form,
  index,
  disabled,
  onRemove,
}: {
  readonly order: StockIssueRequestSummary
  readonly item: StockIssueRequestItem
  readonly scope: string
  readonly form: UseFormReturn<StockIssueSourcesValues>
  readonly index: number
  readonly disabled: boolean
  readonly onRemove: () => void
}) {
  const value = useWatch({ control: form.control, name: `allocations.${index}` })
  const { sources, options, setSearch } = useStockIssueSourceOptions(
    order,
    item,
    scope,
    value?.inventoryStockId
  )
  const error = form.formState.errors.allocations?.[index]
  return (
    <div className="grid min-w-0 gap-3 border-b py-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] [&_input]:min-h-11 sm:[&_input]:min-h-9">
      <div className="min-w-0">
        <Controller
          control={form.control}
          name={`allocations.${index}.inventoryStockId`}
          render={({ field }) => (
            <LookupCombobox
              value={field.value}
              options={options}
              selectedOption={value?.path ? { value: field.value, label: value.path } : undefined}
              placeholder="Tìm khu vực, kệ, vị trí hoặc lô…"
              emptyMessage="Không có nguồn còn khả dụng. Thử từ khóa khác."
              ariaLabel={`Nguồn lấy ${item.sku} dòng ${index + 1}`}
              isLoading={sources.isFetching}
              isInvalid={Boolean(error?.inventoryStockId)}
              disabled={disabled}
              onSearchChange={setSearch}
              onChange={(id, option) => {
                field.onChange(id)
                form.setValue(`allocations.${index}.path`, option?.label ?? '')
              }}
            />
          )}
        />
        {error?.inventoryStockId && (
          <p role="alert" className="text-destructive text-sm">
            {error.inventoryStockId.message}
          </p>
        )}
        {sources.isError && (
          <div role="alert" className="mt-1 text-sm">
            Chưa tải được nguồn.{' '}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void sources.refetch()}
            >
              Thử lại
            </Button>
          </div>
        )}
        {options.find((option) => option.value === value?.inventoryStockId)?.description && (
          <p className="text-muted-foreground mt-1 text-xs">
            {options.find((option) => option.value === value?.inventoryStockId)?.description}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`source-quantity-${index}`} className="text-sm">
          SL ({item.enteredUnitName})
        </label>
        <Input
          id={`source-quantity-${index}`}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          disabled={disabled}
          aria-invalid={Boolean(error?.quantity)}
          {...form.register(`allocations.${index}.quantity`, { valueAsNumber: true })}
        />
        {error?.quantity && (
          <p role="alert" className="text-destructive text-sm">
            {error.quantity.message}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 self-end sm:min-h-9"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Bỏ nguồn ${index + 1} của ${item.sku}`}
      >
        Bỏ
      </Button>
    </div>
  )
}
