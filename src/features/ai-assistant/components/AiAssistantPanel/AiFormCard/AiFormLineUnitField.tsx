import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { formatStockIssueQuantity } from '@/features/stock-issue/utils/stock-issue-format'
import { cn } from '@/lib/utils'
import type { AiFormLine } from '../../../schemas/ai-form-card.schema'
import { AI_FORM_TOUCH_INPUT, AI_FORM_TOUCH_SELECT } from '../../../utils/ai-form-touch-classes'

interface AiFormLineUnitFieldProps {
  readonly id: string
  readonly line: AiFormLine
  /** Show the base unit as text: the document is kept in it and the BE converts any other. */
  readonly baseUnitOnly: boolean
  readonly isInvalid: boolean
  readonly onChange: (unitId: string) => void
}

/** The unit of a row: the product's own units to choose from, or its base unit alone. */
export function AiFormLineUnitField({
  id,
  line,
  baseUnitOnly,
  isInvalid,
  onChange,
}: AiFormLineUnitFieldProps) {
  const { product } = line
  return (
    <Field>
      <FieldLabel htmlFor={id}>Đơn vị</FieldLabel>
      {baseUnitOnly ? (
        <Input
          id={id}
          readOnly
          className={cn('bg-muted/40', AI_FORM_TOUCH_INPUT)}
          value={product?.baseUnitName ?? '—'}
        />
      ) : (
        <NativeSelect
          id={id}
          className={cn('w-full', AI_FORM_TOUCH_SELECT)}
          disabled={!product}
          aria-invalid={isInvalid}
          value={line.unitId || product?.baseUnitId || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {product ? (
            product.units.map((option) => (
              <NativeSelectOption key={option.unitId} value={option.unitId}>
                {option.unitName}
                {option.conversionFactor === 1
                  ? ''
                  : ` (×${formatStockIssueQuantity(option.conversionFactor)})`}
              </NativeSelectOption>
            ))
          ) : (
            <NativeSelectOption value="">—</NativeSelectOption>
          )}
        </NativeSelect>
      )}
    </Field>
  )
}
