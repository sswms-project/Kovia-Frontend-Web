'use client'

import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerFieldProps {
  readonly id: string
  readonly label: string
  readonly disablePastDates?: boolean
  readonly required?: boolean
  /** Thông báo lỗi của trường, hiện ngay dưới ô chọn ngày. */
  readonly error?: string
  readonly value: string
  readonly onChange: (value: string) => void
}

function parseDateInputValue(value: string): Date | undefined {
  const [year, month, day] = value.split('-').map(Number)
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
}: DatePickerFieldProps) {
  const selectedDate = parseDateInputValue(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

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
              !selectedDate && 'text-muted-foreground'
            )}
            aria-label={label}
            aria-required={required}
            aria-invalid={Boolean(error)}
          >
            <CalendarIcon data-icon="inline-start" aria-hidden="true" />
            {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            disabled={disablePastDates ? { before: today } : undefined}
            onSelect={(date) => onChange(date ? toDateInputValue(date) : '')}
            locale={vi}
          />
        </PopoverContent>
      </Popover>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
