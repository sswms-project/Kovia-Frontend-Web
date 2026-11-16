import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import type { LookupOption } from '@/features/inbound-request/components/InboundRequestFormPage'
import type { AiFormLine } from '../../../schemas/ai-form-card.schema'
import type { AiFormLineErrors } from '../../../utils/ai-form-lines'
import { AI_FORM_TOUCH_BUTTON } from '../../../utils/ai-form-touch-classes'
import { AiFormLineRow } from './AiFormLineRow'
import { AiFormLookupError } from './AiFormLookupError'

interface AiFormLineListProps {
  readonly idPrefix: string
  /** Screen-reader name of the group; the stock-issue wording unless a caller says otherwise. */
  readonly legend?: string
  /** Rows show what is available and advise a shortage. False for documents that receive goods. */
  readonly showsStock?: boolean
  /** Rows show the base unit as text instead of a unit choice. */
  readonly baseUnitOnly?: boolean
  readonly lines: readonly AiFormLine[]
  /** Products matching the current search; the one row being searched is the only one with its dropdown open. */
  readonly options: readonly LookupOption[]
  readonly isLoadingOptions: boolean
  readonly isLookupError: boolean
  readonly maxLines: number
  readonly error?: string
  /** Server messages by line key (inline draft editor only). */
  readonly lineErrors?: Readonly<Record<string, AiFormLineErrors>>
  readonly onSearchChange: (searchText: string) => void
  readonly onRetryLookup: () => void
  readonly onAdd: () => void
  /** `''` when the selection was cleared. */
  readonly onProductChange: (lineKey: string, productId: string) => void
  readonly onQuantityChange: (lineKey: string, quantity: string) => void
  readonly onUnitChange: (lineKey: string, unitId: string) => void
  readonly onRemove: (lineKey: string) => void
}

/** The product rows of the form; the product search and its results belong to AiFormProductLines. */
export function AiFormLineList({
  idPrefix,
  legend = 'Sản phẩm xuất kho',
  showsStock = true,
  baseUnitOnly = false,
  lines,
  options,
  isLoadingOptions,
  isLookupError,
  maxLines,
  error,
  lineErrors,
  onSearchChange,
  onRetryLookup,
  onAdd,
  onProductChange,
  onQuantityChange,
  onUnitChange,
  onRemove,
}: AiFormLineListProps) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="sr-only">{legend}</legend>
      <ol className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <li key={line.key} className="min-w-0 border-b pb-3 last:border-b-0 last:pb-0">
            <AiFormLineRow
              id={`${idPrefix}-${line.key}`}
              index={index}
              line={line}
              showsStock={showsStock}
              baseUnitOnly={baseUnitOnly}
              options={options}
              isLoadingOptions={isLoadingOptions}
              showErrors={Boolean(error)}
              serverErrors={lineErrors?.[line.key]}
              onSearchChange={onSearchChange}
              onProductChange={(productId) => onProductChange(line.key, productId)}
              onQuantityChange={(quantity) => onQuantityChange(line.key, quantity)}
              onUnitChange={(unitId) => onUnitChange(line.key, unitId)}
              onRemove={() => onRemove(line.key)}
            />
          </li>
        ))}
      </ol>
      {isLookupError ? <AiFormLookupError onRetry={onRetryLookup} /> : null}
      <FieldError role="status">{error}</FieldError>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={AI_FORM_TOUCH_BUTTON}
          disabled={lines.length >= maxLines}
          onClick={onAdd}
        >
          <Plus aria-hidden="true" />
          Thêm sản phẩm
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums">
          {lines.length}/{maxLines}
        </span>
      </div>
    </fieldset>
  )
}
