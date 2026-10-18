import type { UseFormReturn } from 'react-hook-form'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ExpiryDaysValues } from '../../schemas/stock-alert.schema'

interface ExpiryDaysSettingsProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly form: UseFormReturn<ExpiryDaysValues>
  readonly onApply: (values: ExpiryDaysValues) => void
}

export function ExpiryDaysSettings({ open, onOpenChange, form, onApply }: ExpiryDaysSettingsProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="Cài đặt số ngày sắp hết hạn"
          title="Cài đặt số ngày sắp hết hạn"
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}>
        <form noValidate onSubmit={form.handleSubmit(onApply)} className="flex flex-col gap-3">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.days)}>
              <FieldLabel htmlFor="overview-expiry-days">Số ngày trước hạn</FieldLabel>
              <Input
                id="overview-expiry-days"
                type="number"
                min={1}
                max={365}
                step={1}
                aria-invalid={Boolean(form.formState.errors.days)}
                aria-describedby="overview-days-error"
                {...form.register('days', { valueAsNumber: true })}
              />
              <FieldError id="overview-days-error">
                {form.formState.errors.days?.message}
              </FieldError>
            </Field>
          </FieldGroup>
          <p className="text-muted-foreground text-xs">
            Gồm hôm nay và số ngày tới, theo ngày đánh giá UTC.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Áp dụng</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
