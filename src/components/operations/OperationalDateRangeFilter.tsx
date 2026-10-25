'use client'

import { CalendarRange, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { dateToIsoDateString, formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { toOperationalDateTimeInput } from '@/lib/operational-date-time'
import { cn } from '@/lib/utils'

interface OperationalDateRangeFilterProps {
  /** yyyy-MM-dd or yyyy-MM-ddTHH:mm in Vietnam time; empty when not filtered. */
  readonly from: string
  readonly to: string
  /** Tên khoảng ngày trong nhãn trợ năng và tiêu đề, ví dụ "ngày tạo". */
  readonly label: string
  readonly withTime?: boolean
  readonly onChange: (range: { readonly from: string; readonly to: string }) => void
}

/** Nút mở lịch chọn khoảng ngày cho thanh công cụ của các danh sách nghiệp vụ. */
export function OperationalDateRangeFilter({
  from,
  to,
  label,
  withTime = false,
  onChange,
}: OperationalDateRangeFilterProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from, to })
  const hasFilter = Boolean(from || to)
  const displayed = withTime && open ? draft : { from, to }
  const range: DateRange = {
    from: displayed.from
      ? withTime
        ? parseISO(displayed.from.slice(0, 10))
        : isoDateStringToDate(displayed.from)
      : undefined,
    to: displayed.to
      ? withTime
        ? parseISO(displayed.to.slice(0, 10))
        : isoDateStringToDate(displayed.to)
      : undefined,
  }
  const start = draft.from.includes('T') ? draft.from : `${draft.from}T00:00`
  const end = draft.to.includes('T') ? draft.to : `${draft.to}T23:59`
  const isReversed = Boolean(draft.from && draft.to && start > end)

  function withCurrentTime(value: string, previous = value) {
    if (!value || !withTime) return value
    const time =
      previous.split('T')[1] ?? toOperationalDateTimeInput(new Date().toISOString()).split('T')[1]
    return `${value.slice(0, 10)}T${time}`
  }

  function buildButtonText() {
    const formatValue = (value: string) =>
      value
        ? withTime
          ? `${format(parseISO(value.slice(0, 10)), 'dd/MM/yyyy')}${value.includes('T') ? ` ${value.split('T')[1]}` : ''}`
          : formatDisplayDate(isoDateStringToDate(value)!)
        : null
    const fromText = formatValue(from)
    const toText = formatValue(to)
    if (fromText && toText) return `${fromText} – ${toText}`
    if (fromText) return `Từ ${fromText}`
    if (toText) return `Đến ${toText}`
    return 'Khoảng ngày'
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && withTime) setDraft({ from, to })
        setOpen(nextOpen)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={hasFilter ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'max-w-full',
            withTime && 'h-auto min-h-8 text-left whitespace-normal max-md:min-h-11'
          )}
          aria-label={`Lọc theo khoảng ${label}`}
        >
          <CalendarRange aria-hidden="true" />
          {buildButtonText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-(--radix-popover-content-available-height) w-auto max-w-[calc(100vw-2rem)] overflow-y-auto p-0"
        align="start"
        collisionPadding={16}
      >
        <div className="border-b p-3">
          <PopoverTitle>Khoảng {label}</PopoverTitle>
        </div>
        <Calendar
          mode="range"
          locale={withTime ? vi : undefined}
          defaultMonth={withTime ? (range.from ?? range.to) : undefined}
          selected={range}
          onSelect={(selected) => {
            const next = {
              from: selected?.from
                ? withCurrentTime(
                    withTime
                      ? format(selected.from, 'yyyy-MM-dd')
                      : dateToIsoDateString(selected.from),
                    displayed.from
                  )
                : '',
              to: selected?.to
                ? withCurrentTime(
                    withTime ? format(selected.to, 'yyyy-MM-dd') : dateToIsoDateString(selected.to),
                    displayed.to
                  )
                : '',
            }
            if (withTime) setDraft(next)
            else onChange(next)
          }}
          numberOfMonths={1}
        />
        {withTime ? (
          <div className="flex flex-col gap-3 border-t p-3">
            <div className="grid grid-cols-2 gap-3">
              {(['from', 'to'] as const).map((side) => (
                <Field key={side}>
                  <FieldLabel htmlFor={`${id}-${side}`}>
                    {side === 'from' ? 'Từ giờ' : 'Đến giờ'}
                  </FieldLabel>
                  <Input
                    id={`${id}-${side}`}
                    type="time"
                    step={60}
                    className="min-h-11 min-w-0"
                    disabled={!draft[side]}
                    value={draft[side].split('T')[1] ?? ''}
                    aria-invalid={isReversed}
                    aria-describedby={isReversed ? `${id}-error` : undefined}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [side]: `${draft[side].slice(0, 10)}${event.target.value ? `T${event.target.value}` : ''}`,
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Giờ Việt Nam · Để trống giờ để lọc trọn ngày.
            </p>
            {isReversed ? (
              <FieldError id={`${id}-error`} role="alert">
                Thời điểm kết thúc phải bằng hoặc sau thời điểm bắt đầu.
              </FieldError>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  const now = toOperationalDateTimeInput(new Date().toISOString())
                  setDraft({ from: now, to: now })
                }}
              >
                Hôm nay
              </Button>
              <Button
                type="button"
                className="min-h-11"
                disabled={isReversed || (!draft.from && !draft.to)}
                onClick={() => {
                  onChange(draft)
                  setOpen(false)
                }}
              >
                Áp dụng
              </Button>
            </div>
          </div>
        ) : null}
        {hasFilter || withTime ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange({ from: '', to: '' })
                setDraft({ from: '', to: '' })
                if (withTime) setOpen(false)
              }}
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
