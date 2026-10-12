'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SelectOption } from './types'

// Radix Select không nhận value rỗng nên dùng giá trị thay thế cho lựa chọn "Tất cả"/"Chưa chọn".
const EMPTY_VALUE = '__empty__'

interface OptionSelectProps {
  readonly id: string
  readonly value: string
  readonly options: readonly SelectOption[]
  /** Bỏ trống khi trường luôn phải có giá trị (ví dụ mức ưu tiên). */
  readonly emptyLabel?: string
  readonly disabled?: boolean
  readonly invalid?: boolean
  readonly onValueChange: (value: string) => void
}

export function OptionSelect({
  id,
  value,
  options,
  emptyLabel,
  disabled,
  invalid,
  onValueChange,
}: OptionSelectProps) {
  return (
    <Select
      value={value === '' ? EMPTY_VALUE : value}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next === EMPTY_VALUE ? '' : next)}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
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
