import { useId } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { ActivityPeriodValues } from '../../schemas/activity-period.schema'

interface ActivityPeriodFilterProps {
  readonly form: UseFormReturn<ActivityPeriodValues>
  readonly onApply: (values: ActivityPeriodValues) => void
}

export function ActivityPeriodFilter({ form, onApply }: ActivityPeriodFilterProps) {
  const id = useId()
  const period = form.watch('period')
  const error = form.formState.errors.period?.message
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onApply)}
      className="shrink-0"
      aria-label="Bộ lọc kỳ hoạt động"
    >
      <FieldGroup className="flex-row flex-wrap items-end justify-end gap-3">
        <Field className="w-auto min-w-32" data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-period`}>Kỳ hoạt động</FieldLabel>
          <NativeSelect
            id={`${id}-period`}
            {...form.register('period')}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <NativeSelectOption value="week">Tuần</NativeSelectOption>
            <NativeSelectOption value="month">Tháng</NativeSelectOption>
            <NativeSelectOption value="quarter">Quý</NativeSelectOption>
            <NativeSelectOption value="year">Năm</NativeSelectOption>
            <NativeSelectOption value="custom">Từ ngày – đến ngày</NativeSelectOption>
          </NativeSelect>
        </Field>
        {period === 'week' ? (
          <Field className="w-auto min-w-40">
            <FieldLabel htmlFor={`${id}-week`}>Chọn tuần</FieldLabel>
            <Input id={`${id}-week`} type="week" {...form.register('week')} />
          </Field>
        ) : null}
        {period === 'month' ? (
          <Field className="w-auto min-w-40">
            <FieldLabel htmlFor={`${id}-month`}>Chọn tháng</FieldLabel>
            <Input
              id={`${id}-month`}
              type="month"
              min="1900-01"
              max="9998-12"
              {...form.register('month')}
            />
          </Field>
        ) : null}
        {period === 'quarter' ? (
          <Field className="w-auto min-w-24">
            <FieldLabel htmlFor={`${id}-quarter`}>Chọn quý</FieldLabel>
            <NativeSelect id={`${id}-quarter`} {...form.register('quarter')}>
              {[1, 2, 3, 4].map((quarter) => (
                <NativeSelectOption key={quarter} value={String(quarter)}>
                  Quý {quarter}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        {period === 'quarter' || period === 'year' ? (
          <Field className="w-28">
            <FieldLabel htmlFor={`${id}-year`}>Chọn năm</FieldLabel>
            <Input
              id={`${id}-year`}
              type="number"
              min={1900}
              max={9998}
              step={1}
              {...form.register('year')}
            />
          </Field>
        ) : null}
        {period === 'custom'
          ? (['dateFrom', 'dateTo'] as const).map((name) => (
              <Field key={name} className="w-auto min-w-40">
                <FieldLabel htmlFor={`${id}-${name}`}>
                  {name === 'dateFrom' ? 'Từ ngày' : 'Đến ngày'}
                </FieldLabel>
                <Input
                  id={`${id}-${name}`}
                  type="date"
                  min="1900-01-01"
                  max="9998-12-31"
                  {...form.register(name)}
                />
              </Field>
            ))
          : null}
        <Button type="submit" size="sm">
          Áp dụng
        </Button>
      </FieldGroup>
      {error ? (
        <FieldError id={`${id}-error`} role="alert" className="mt-2">
          {error}
        </FieldError>
      ) : null}
    </form>
  )
}
