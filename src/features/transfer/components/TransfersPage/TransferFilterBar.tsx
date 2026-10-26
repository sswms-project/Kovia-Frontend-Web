import { FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

interface WarehouseOption {
  readonly id: string
  readonly name: string
}

interface TransferFilterBarProps {
  readonly sourceWarehouseId: string
  readonly destinationWarehouseId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouseOptions: readonly WarehouseOption[]
  readonly onSourceWarehouseChange: (value: string) => void
  readonly onDestinationWarehouseChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
}

function WarehouseSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  readonly label: string
  readonly allLabel: string
  readonly value: string
  readonly options: readonly WarehouseOption[]
  readonly onChange: (value: string) => void
}) {
  return (
    <NativeSelect
      aria-label={label}
      className="w-full sm:w-36"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <NativeSelectOption value="">{allLabel}</NativeSelectOption>
      {options.map((warehouse) => (
        <NativeSelectOption key={warehouse.id} value={warehouse.id}>
          {warehouse.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

/** Bộ lọc kho và ngày tạo nằm cùng hàng với tiêu đề danh sách. */
export function TransferFilterBar({
  sourceWarehouseId,
  destinationWarehouseId,
  dateFrom,
  dateTo,
  warehouseOptions,
  onSourceWarehouseChange,
  onDestinationWarehouseChange,
  onDateFromChange,
  onDateToChange,
}: TransferFilterBarProps) {
  const hasActiveFilter = Boolean(sourceWarehouseId || destinationWarehouseId || dateFrom || dateTo)

  return (
    <>
      <WarehouseSelect
        label="Kho xuất"
        allLabel="Kho xuất: tất cả"
        value={sourceWarehouseId}
        options={warehouseOptions}
        onChange={onSourceWarehouseChange}
      />
      <WarehouseSelect
        label="Kho nhập"
        allLabel="Kho nhập: tất cả"
        value={destinationWarehouseId}
        options={warehouseOptions}
        onChange={onDestinationWarehouseChange}
      />
      <Input
        type="date"
        aria-label="Từ ngày"
        className="w-[calc(50%-0.25rem)] sm:w-32"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(event) => onDateFromChange(event.target.value)}
      />
      <Input
        type="date"
        aria-label="Đến ngày"
        className="w-[calc(50%-0.25rem)] sm:w-32"
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(event) => onDateToChange(event.target.value)}
      />
      {hasActiveFilter ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onSourceWarehouseChange('')
            onDestinationWarehouseChange('')
            onDateFromChange('')
            onDateToChange('')
          }}
        >
          <FilterX aria-hidden="true" />
          Xóa lọc
        </Button>
      ) : null}
    </>
  )
}
