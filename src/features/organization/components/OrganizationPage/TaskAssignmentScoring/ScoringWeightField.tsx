import type { UseFormReturn } from 'react-hook-form'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type {
  TaskAssignmentScoringFormInput,
  TaskAssignmentScoringFormValues,
} from '../../../schemas/task-assignment-scoring.schema'
import { formatScore } from './scoring-fields'
import type { ScoringFieldDefinition } from './types'

interface ScoringWeightFieldProps {
  readonly definition: ScoringFieldDefinition
  readonly defaultValue: number
  readonly form: UseFormReturn<
    TaskAssignmentScoringFormInput,
    unknown,
    TaskAssignmentScoringFormValues
  >
  readonly disabled: boolean
}

export function ScoringWeightField({
  definition,
  defaultValue,
  form,
  disabled,
}: ScoringWeightFieldProps) {
  const inputId = `scoring-${definition.key}`
  const error = form.formState.errors[definition.key]
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={inputId}>{definition.label}</FieldLabel>
      <Input
        id={inputId}
        type="number"
        inputMode="decimal"
        step="0.1"
        min={definition.min}
        max={definition.max}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="tabular-nums"
        {...form.register(definition.key)}
      />
      <FieldDescription>
        {definition.hint} Mặc định{' '}
        <span className="text-foreground font-medium tabular-nums">
          {formatScore(defaultValue)}
        </span>{' '}
        · cho phép {definition.min}–{definition.max}.
      </FieldDescription>
      <FieldError>{error?.message}</FieldError>
    </Field>
  )
}
