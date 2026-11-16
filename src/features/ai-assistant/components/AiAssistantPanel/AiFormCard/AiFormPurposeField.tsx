import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

interface AiFormPurposeFieldProps {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly maxLength: number
  readonly error?: string
  readonly onChange: (value: string) => void
}

/** The free-text field of a document: the purpose of an issue, the reason of a return. */
export function AiFormPurposeField({
  id,
  label,
  value,
  maxLength,
  error,
  onChange,
}: AiFormPurposeFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError role="status">{error}</FieldError>
    </Field>
  )
}
