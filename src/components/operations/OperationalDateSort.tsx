import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { OrderType } from '@/types/api'

interface OperationalDateSortProps {
  readonly value: OrderType
  readonly onChange: (value: OrderType) => void
}

export function OperationalDateSort({ value, onChange }: OperationalDateSortProps) {
  return (
    <NativeSelect
      aria-label="Sắp xếp theo ngày tạo"
      value={value}
      onChange={(event) => onChange(Number(event.target.value) as OrderType)}
    >
      <NativeSelectOption value={OrderType.Descending}>Mới nhất trước</NativeSelectOption>
      <NativeSelectOption value={OrderType.Ascending}>Cũ nhất trước</NativeSelectOption>
    </NativeSelect>
  )
}
