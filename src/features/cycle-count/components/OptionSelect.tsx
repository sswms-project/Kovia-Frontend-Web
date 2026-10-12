'use client'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Radix Select không nhận value rỗng nên dùng giá trị thay thế cho lựa chọn "Tất cả"/"Chưa chọn".
const EMPTY_VALUE = '__empty__'

interface OptionSelectItem {
  readonly value: string
  readonly label: string
}

interface OptionSelectProps {
  readonly id: string
  readonly value: string
  readonly options: readonly OptionSelectItem[]
  /** Bỏ trống khi trường luôn phải có giá trị (ví dụ mức ưu tiên). */
  readonly emptyLabel?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly invalid?: boolean
  readonly onValueChange: (value: string) => void
}

export function OptionSelect({
  id,
  value,
  options,
  emptyLabel,
  disabled,
  className,
  invalid,
  onValueChange,
}: OptionSelectProps) {
  return (
    <Select
      value={value === '' ? EMPTY_VALUE : value}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next === EMPTY_VALUE ? '' : next)}
    >
      <SelectTrigger id={id} className={cn('w-full', className)} aria-invalid={invalid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={4}>
        {emptyLabel === undefined ? null : (
          <SelectItem value={EMPTY_VALUE}>{emptyLabel}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
