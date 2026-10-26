'use client'

import { LoaderCircle } from 'lucide-react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { DatePickerField } from '@/components/forms/DatePickerField'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  supplierResponseDecisionLabels,
  type SupplierResponseFormValues,
} from '../../schemas/supplier-response.schema'
import { SUPPLIER_RESPONSE_DECISION } from '../../types/inbound-request.types'

// Rejection goes last so the destructive choice is never the first one a supplier lands on.
const DECISION_OPTIONS = [
  SUPPLIER_RESPONSE_DECISION.Confirmed,
  SUPPLIER_RESPONSE_DECISION.ProposedNewDate,
  SUPPLIER_RESPONSE_DECISION.Rejected,
] as const

const DECISION_HINTS: Record<SupplierResponseFormValues['decision'], string> = {
  Confirmed: 'Chúng tôi sẽ giao đúng hàng và đúng ngày dự kiến.',
  ProposedNewDate: 'Chúng tôi giao được nhưng cần đổi sang ngày khác.',
  Rejected: 'Chúng tôi không thể đáp ứng đơn hàng này.',
}

interface SupplierResponseFormProps {
  readonly form: UseFormReturn<SupplierResponseFormValues>
  readonly isPending: boolean
  readonly errorMessage?: string
  readonly onSubmit: (values: SupplierResponseFormValues) => Promise<void>
}

export function SupplierResponseForm({
  form,
  isPending,
  errorMessage,
  onSubmit,
}: SupplierResponseFormProps) {
  const decision = useWatch({ control: form.control, name: 'decision' })
  const errors = form.formState.errors
  const isRejecting = decision === SUPPLIER_RESPONSE_DECISION.Rejected

  return (
    <form className="space-y-5 border-t pt-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <h2 className="text-base font-semibold">Phản hồi của quý công ty</h2>
      <Controller
        control={form.control}
        name="decision"
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            aria-label="Phản hồi đơn hàng"
            disabled={isPending}
            className="gap-2"
          >
            {DECISION_OPTIONS.map((option) => (
              <label
                key={option}
                htmlFor={`supplier-decision-${option}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 border p-3',
                  field.value === option && 'border-primary bg-primary/5'
                )}
              >
                <RadioGroupItem
                  id={`supplier-decision-${option}`}
                  value={option}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    {supplierResponseDecisionLabels[option]}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {DECISION_HINTS[option]}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
      />

      {decision === SUPPLIER_RESPONSE_DECISION.ProposedNewDate ? (
        <Controller
          control={form.control}
          name="proposedDate"
          render={({ field }) => (
            <DatePickerField
              id="supplier-proposed-date"
              label="Ngày giao đề xuất"
              required
              disablePastDates
              error={errors.proposedDate?.message}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      ) : null}

      <Field data-invalid={Boolean(errors.note)}>
        <FieldLabel htmlFor="supplier-response-note">
          {isRejecting ? 'Lý do từ chối' : 'Ghi chú (không bắt buộc)'}
        </FieldLabel>
        <Textarea
          id="supplier-response-note"
          maxLength={500}
          disabled={isPending}
          aria-invalid={Boolean(errors.note)}
          placeholder={isRejecting ? 'VD: Hết hàng mã SKU-1 đến cuối tháng' : undefined}
          {...form.register('note')}
        />
        <FieldError>{errors.note?.message}</FieldError>
      </Field>

      {errorMessage ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Chưa gửi được phản hồi</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        variant={isRejecting ? 'destructive' : 'default'}
        className="w-full sm:w-auto"
        disabled={isPending}
      >
        {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Gửi phản hồi
      </Button>
    </form>
  )
}
