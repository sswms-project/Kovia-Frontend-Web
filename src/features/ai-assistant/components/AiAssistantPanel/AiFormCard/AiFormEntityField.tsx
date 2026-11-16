import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import {
  LookupCombobox,
  type LookupOption,
} from '@/features/inbound-request/components/InboundRequestFormPage'
import type { AiFormEntityValue } from '../../../schemas/ai-form-card.schema'
import { AI_FORM_TOUCH_COMBOBOX } from '../../../utils/ai-form-touch-classes'
import { AiFormLookupError } from './AiFormLookupError'

interface AiFormEntityFieldProps {
  readonly id: string
  readonly label: string
  /** The chosen record; its label is kept here, so it shows even when a search no longer lists it. */
  readonly value: AiFormEntityValue | null
  /** Matches of the current search; empty while they load. */
  readonly options: readonly LookupOption[]
  readonly isLoading: boolean
  readonly isError: boolean
  readonly error?: string
  readonly description?: string
  readonly placeholder?: string
  readonly onSearchChange: (searchText: string) => void
  readonly onRetry: () => void
  readonly onChange: (value: AiFormEntityValue | null) => void
}

/** One searchable selector; the matches and the search itself belong to AiFormEntityPicker. */
export function AiFormEntityField({
  id,
  label,
  value,
  options,
  isLoading,
  isError,
  error,
  description,
  placeholder = 'Tìm theo mã hoặc tên',
  onSearchChange,
  onRetry,
  onChange,
}: AiFormEntityFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className={AI_FORM_TOUCH_COMBOBOX}>
        <LookupCombobox
          id={id}
          value={value?.id ?? ''}
          options={options}
          selectedOption={value ? { value: value.id, label: value.label } : undefined}
          placeholder={placeholder}
          emptyMessage={isError ? 'Không tải được danh sách.' : 'Không có kết quả phù hợp.'}
          ariaLabel={label}
          isLoading={isLoading}
          isInvalid={Boolean(error)}
          onSearchChange={onSearchChange}
          onChange={(nextId, option) =>
            onChange(option ? { id: nextId, label: option.label } : null)
          }
        />
      </div>
      {isError ? <AiFormLookupError onRetry={onRetry} /> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError role="status">{error}</FieldError>
    </Field>
  )
}
