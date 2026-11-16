import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage'
import type { AiFormEntityValue } from '../../schemas/ai-form-card.schema'
import type { AiEntityOption } from '../../types/ai-entity-selector.types'
import { AI_FORM_TOUCH_COMBOBOX } from '../../utils/ai-form-touch-classes'
import { AiFormLookupError } from '../AiAssistantPanel/AiFormCard/AiFormLookupError'

// Keep the popup inside a 320px panel (the shared one is 28px wider than its input) and skip its
// zoom/fade entry for people who ask for reduced motion.
const POPUP_CLASS_NAME = 'min-w-(--anchor-width) motion-reduce:animate-none'

interface AiEntitySelectorProps {
  readonly id: string
  readonly label: string
  /** The chosen record; its label is kept here, so it shows even when a search no longer lists it. */
  readonly value: AiFormEntityValue | null
  /** Matches of the current search; empty while they load. */
  readonly options: readonly AiEntityOption[]
  readonly placeholder: string
  readonly emptyMessage: string
  readonly isLoading: boolean
  readonly isError: boolean
  readonly hasMore: boolean
  readonly isLoadingMore: boolean
  /** Why the selector cannot be used right now (no permission, missing scope); disables it. */
  readonly disabledReason?: string
  readonly error?: string
  readonly description?: string
  readonly onSearchChange: (searchText: string) => void
  readonly onRetry: () => void
  readonly onLoadMore: () => void
  readonly onChange: (value: AiFormEntityValue | null) => void
}

/** One searchable, paged single-select; the options and the search belong to AiEntitySelect. */
export function AiEntitySelector({
  id,
  label,
  value,
  options,
  placeholder,
  emptyMessage,
  isLoading,
  isError,
  hasMore,
  isLoadingMore,
  disabledReason,
  error,
  description,
  onSearchChange,
  onRetry,
  onLoadMore,
  onChange,
}: AiEntitySelectorProps) {
  const helperText = disabledReason ?? description
  return (
    <Field data-invalid={Boolean(error)} data-disabled={Boolean(disabledReason)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className={AI_FORM_TOUCH_COMBOBOX}>
        <LookupCombobox
          id={id}
          value={value?.id ?? ''}
          options={options}
          selectedOption={value ? { value: value.id, label: value.label } : undefined}
          placeholder={placeholder}
          emptyMessage={isError ? 'Không tải được danh sách.' : emptyMessage}
          ariaLabel={label}
          isLoading={isLoading}
          isInvalid={Boolean(error)}
          disabled={Boolean(disabledReason)}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          contentClassName={POPUP_CLASS_NAME}
          onSearchChange={onSearchChange}
          onChange={(nextId, option) =>
            onChange(option ? { id: nextId, label: option.label } : null)
          }
        />
      </div>
      {isError ? <AiFormLookupError onRetry={onRetry} /> : null}
      {helperText ? <FieldDescription role="status">{helperText}</FieldDescription> : null}
      <FieldError role="status">{error}</FieldError>
    </Field>
  )
}
