'use client'

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { operationalToday } from '@/lib/operational-date-time'
import { cn } from '@/lib/utils'

interface DatePickerFieldProps {
  readonly id: string
  readonly label: string
  readonly disablePastDates?: boolean
  readonly required?: boolean
  /** yyyy-MM-dd or yyyy-MM-ddTHH:mm, in Vietnam time, when enabled. */
  readonly withTime?: boolean
  /** Thông báo lỗi của trường, hiện ngay dưới ô chọn ngày. */
  readonly error?: string
  readonly value: string
  readonly onChange: (value: string) => void
}

function parseDateInputValue(value: string): Date | undefined {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DatePickerField({
  id,
  label,
  disablePastDates,
  required,
  error,
  value,
  onChange,
  withTime = false,
}: DatePickerFieldProps) {
  const selectedDate = parseDateInputValue(value)
  const today = withTime ? parseDateInputValue(operationalToday())! : new Date()
  today.setHours(0, 0, 0, 0)
  const time = withTime ? (value.split('T')[1] ?? '') : ''
  const errorId = `${id}-error`

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start gap-2 font-normal',
              withTime && 'min-h-11',
              !selectedDate && 'text-muted-foreground'
            )}
            aria-label={label}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          >
            <CalendarIcon data-icon="inline-start" aria-hidden="true" />
            {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
            {time ? ` ${time}` : ''}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            disabled={disablePastDates ? { before: today } : undefined}
            onSelect={(date) =>
              onChange(date ? `${toDateInputValue(date)}${time ? `T${time}` : ''}` : '')
            }
            locale={vi}
          />
          {withTime ? (
            <div className="flex flex-col gap-3 border-t p-3">
              <Field>
                <FieldLabel htmlFor={`${id}-time`}>Thời gian (không bắt buộc)</FieldLabel>
                <Input
                  id={`${id}-time`}
                  type="time"
                  step={60}
                  className="min-h-11"
                  disabled={!selectedDate}
                  value={time}
                  onChange={(event) => {
                    if (selectedDate)
                      onChange(
                        `${toDateInputValue(selectedDate)}${event.target.value ? `T${event.target.value}` : ''}`
                      )
                  }}
                />
              </Field>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onChange(`${toDateInputValue(today)}${time ? `T${time}` : ''}`)}
                >
                  Hôm nay
                </Button>
                {!required ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => onChange('')}
                  >
                    Xóa
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  )
}
