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

interface WarehouseOption {
  readonly id: string
  readonly name: string
}

interface TransferFilterSheetProps {
  readonly open: boolean
  readonly sourceWarehouseId: string
  readonly destinationWarehouseId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouseOptions: readonly WarehouseOption[]
  readonly onOpenChange: (open: boolean) => void
  readonly onSourceWarehouseChange: (value: string) => void
  readonly onDestinationWarehouseChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
}

export function TransferFilterSheet({
  open,
  sourceWarehouseId,
  destinationWarehouseId,
  dateFrom,
  dateTo,
  warehouseOptions,
  onOpenChange,
  onSourceWarehouseChange,
  onDestinationWarehouseChange,
  onDateFromChange,
  onDateToChange,
}: TransferFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Bộ lọc phiếu điều chuyển</SheetTitle>
          <SheetDescription>Thu hẹp danh sách theo kho và ngày tạo.</SheetDescription>
        </SheetHeader>
        <FieldGroup className="flex-1 p-4">
          <Field>
            <FieldLabel htmlFor="transfer-filter-source">Kho xuất</FieldLabel>
            <NativeSelect
              id="transfer-filter-source"
              className="w-full"
              value={sourceWarehouseId}
              onChange={(event) => onSourceWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {warehouseOptions.map((warehouse) => (
                <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="transfer-filter-destination">Kho nhập</FieldLabel>
            <NativeSelect
              id="transfer-filter-destination"
              className="w-full"
              value={destinationWarehouseId}
              onChange={(event) => onDestinationWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {warehouseOptions.map((warehouse) => (
                <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="transfer-date-from">Từ ngày</FieldLabel>
              <Input
                id="transfer-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => onDateFromChange(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="transfer-date-to">Đến ngày</FieldLabel>
              <Input
                id="transfer-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => onDateToChange(event.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
        <SheetFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Xem kết quả
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onSourceWarehouseChange('')
              onDestinationWarehouseChange('')
              onDateFromChange('')
              onDateToChange('')
            }}
          >
            Đặt lại
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
