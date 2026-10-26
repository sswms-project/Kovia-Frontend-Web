import type { UseFormReturn } from 'react-hook-form'
import { Field, FieldError } from '@/components/ui/field'
import type { InboundRequestFormValues } from '../../schemas/inbound-request.schema'
import type { LookupOption } from '../../types/inbound-request.types'
import { LookupCombobox } from './LookupCombobox'

interface ProductSelectProps {
  readonly inputId: string
  readonly searchScope: string
  readonly selectedOption?: LookupOption
  readonly index: number
  readonly form: UseFormReturn<InboundRequestFormValues>
  readonly options: readonly LookupOption[]
  readonly isLoading: boolean
  readonly onSearchChange: (scope: string, value: string) => void
}

export function ProductSelect({
  inputId,
  searchScope,
  selectedOption,
  index,
  form,
  options,
  isLoading,
  onSearchChange,
}: ProductSelectProps) {
  const error = form.formState.errors.lines?.[index]?.productId
  return (
    <Field data-invalid={Boolean(error)}>
      <LookupCombobox
        id={inputId}
        value={form.watch(`lines.${index}.productId`)}
        options={options}
        selectedOption={selectedOption}
        placeholder="Tìm mã hoặc tên sản phẩm"
        emptyMessage="Không tìm thấy sản phẩm phù hợp."
        ariaLabel={`Sản phẩm dòng ${index + 1}`}
        isLoading={isLoading}
        isInvalid={Boolean(error)}
        onSearchChange={(value) => onSearchChange(searchScope, value)}
        onChange={(value) => {
          form.setValue(`lines.${index}.productId`, value, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue(`lines.${index}.unitId`, '', { shouldDirty: true, shouldValidate: true })
        }}
      />
      <FieldError>{error?.message}</FieldError>
    </Field>
  )
}
