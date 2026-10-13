'use client'

import { CalendarRange, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { dateToIsoDateString, formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'

interface OperationalDateRangeFilterProps {
  /** yyyy-MM-dd, rỗng khi chưa lọc. */
  readonly from: string
  readonly to: string
  /** Tên khoảng ngày trong nhãn trợ năng và tiêu đề, ví dụ "ngày tạo". */
  readonly label: string
  readonly onChange: (range: { readonly from: string; readonly to: string }) => void
}

/** Nút mở lịch chọn khoảng ngày cho thanh công cụ của các danh sách nghiệp vụ. */
export function OperationalDateRangeFilter({
  from,
  to,
  label,
  onChange,
}: OperationalDateRangeFilterProps) {
  const hasFilter = Boolean(from || to)
  const range: DateRange = { from: isoDateStringToDate(from), to: isoDateStringToDate(to) }

  function buildButtonText() {
    const fromText = range.from ? formatDisplayDate(range.from) : null
    const toText = range.to ? formatDisplayDate(range.to) : null
    if (fromText && toText) return `${fromText} – ${toText}`
    if (fromText) return `Từ ${fromText}`
    if (toText) return `Đến ${toText}`
    return 'Khoảng ngày'
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={hasFilter ? 'default' : 'outline'}
          size="sm"
          aria-label={`Lọc theo khoảng ${label}`}
        >
          <CalendarRange aria-hidden="true" />
          {buildButtonText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="border-b p-3">
          <PopoverTitle>Khoảng {label}</PopoverTitle>
        </div>
        <Calendar
          mode="range"
          selected={range}
          onSelect={(selected) =>
            onChange({
              from: selected?.from ? dateToIsoDateString(selected.from) : '',
              to: selected?.to ? dateToIsoDateString(selected.to) : '',
            })
          }
          numberOfMonths={1}
        />
        {hasFilter ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange({ from: '', to: '' })}
            >
              <X aria-hidden="true" />
              Xoá lọc ngày
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
