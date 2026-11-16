import { useEffect, useRef, type Dispatch } from 'react'
import type { AiFormValues } from '../../../schemas/ai-form-card.schema'
import {
  AI_FORM_LOOKUPS,
  type AiFormFieldErrors,
  type AiFormFieldKey,
} from '../../../types/ai-form.types'
import type { AiFormAction } from '../../../utils/ai-form-state'
import { AiFormEntityPicker } from './AiFormEntityPicker'
import { AiFormResolvedField } from './AiFormResolvedField'

interface AiFormPartiesStepProps {
  readonly idPrefix: string
  readonly values: AiFormValues
  readonly errors: AiFormFieldErrors
  /** Fields the card already resolved: a chip with "Đổi" instead of a picker. */
  readonly compactKeys?: readonly AiFormFieldKey[]
  readonly labelOf: (key: AiFormFieldKey) => string
  readonly dispatch: Dispatch<AiFormAction>
}

// Stable default: the focus effect below depends on this array.
const NO_COMPACT_KEYS: readonly AiFormFieldKey[] = []

/** Step 1: the warehouse the goods leave and who receives them. */
export function AiFormPartiesStep({
  idPrefix,
  values,
  errors,
  compactKeys = NO_COMPACT_KEYS,
  labelOf,
  dispatch,
}: AiFormPartiesStepProps) {
  const hasPickedProducts = values.lines.some((line) => line.product)

  // The chip that was pressed disappears: keep keyboard focus on the picker that replaces it.
  const focusAfterExpand = useRef<string | null>(null)
  useEffect(() => {
    if (!focusAfterExpand.current) return
    document.getElementById(focusAfterExpand.current)?.focus()
    focusAfterExpand.current = null
  }, [compactKeys])

  const warehouseId = `${idPrefix}-warehouse`
  const recipientId = `${idPrefix}-recipient`
  const expand = (key: 'warehouse' | 'recipient', id: string) => {
    focusAfterExpand.current = id
    dispatch({ type: 'expandField', key })
  }
  // A field with a server error is a picker again, so the error sits next to what fixes it.
  const warehouseChip =
    compactKeys.includes('warehouse') && !errors.warehouse ? values.warehouse : null
  const recipientChip =
    compactKeys.includes('recipient') && !errors.recipient ? values.recipient : null

  return (
    <>
      {warehouseChip ? (
        <AiFormResolvedField
          label={labelOf('warehouse')}
          value={warehouseChip}
          onChange={() => expand('warehouse', warehouseId)}
        />
      ) : (
        <AiFormEntityPicker
          id={warehouseId}
          label={labelOf('warehouse')}
          lookup={AI_FORM_LOOKUPS.warehouses}
          value={values.warehouse}
          error={errors.warehouse}
          description={hasPickedProducts ? 'Đổi kho xuất sẽ xóa các sản phẩm đã chọn.' : undefined}
          onChange={(value) => dispatch({ type: 'setEntity', key: 'warehouse', value })}
        />
      )}
      {recipientChip ? (
        <AiFormResolvedField
          label={labelOf('recipient')}
          value={recipientChip}
          onChange={() => expand('recipient', recipientId)}
        />
      ) : (
        <AiFormEntityPicker
          id={recipientId}
          label={labelOf('recipient')}
          lookup={AI_FORM_LOOKUPS.recipients}
          value={values.recipient}
          error={errors.recipient}
          onChange={(value) => dispatch({ type: 'setEntity', key: 'recipient', value })}
        />
      )}
    </>
  )
}
