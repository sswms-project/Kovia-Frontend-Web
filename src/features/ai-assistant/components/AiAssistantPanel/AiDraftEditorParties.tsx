import type { Dispatch } from 'react'
import { DatePickerField } from '@/components/forms/DatePickerField'
import type { AiFormValues } from '../../schemas/ai-form-card.schema'
import { AI_FORM_LOOKUPS, type AiFormFieldErrors } from '../../types/ai-form.types'
import type { AiDraftEditDescriptor } from '../../utils/ai-draft-edit-descriptors'
import type { AiFormAction } from '../../utils/ai-form-state'
import { AI_FORM_TOUCH_DATE } from '../../utils/ai-form-touch-classes'
import { AiFormEntityPicker } from './AiFormCard/AiFormEntityPicker'

interface AiDraftEditorPartiesProps {
  readonly idPrefix: string
  readonly descriptor: AiDraftEditDescriptor
  readonly values: AiFormValues
  readonly errors: AiFormFieldErrors
  readonly dispatch: Dispatch<AiFormAction>
}

/**
 * The warehouse, the second party (recipient, supplier or destination warehouse) and, where the type
 * has one, the expected date. Which of them exist and how they read comes from the descriptor of the draft's type.
 */
export function AiDraftEditorParties({
  idPrefix,
  descriptor,
  values,
  errors,
  dispatch,
}: AiDraftEditorPartiesProps) {
  const { partner } = descriptor
  const hasPickedProducts = values.lines.some((line) => line.product)

  return (
    <>
      <AiFormEntityPicker
        id={`${idPrefix}-warehouse`}
        label={descriptor.warehouseLabel}
        lookup={AI_FORM_LOOKUPS.warehouses}
        value={values.warehouse}
        error={errors.warehouse}
        description={
          descriptor.isStockBound && hasPickedProducts
            ? `Đổi ${descriptor.warehouseLabel.toLowerCase()} sẽ xóa các sản phẩm đã chọn.`
            : undefined
        }
        onChange={(value) => dispatch({ type: 'setEntity', key: 'warehouse', value })}
      />
      <AiFormEntityPicker
        id={`${idPrefix}-${partner.key}`}
        label={partner.label}
        lookup={partner.lookup}
        placeholder={partner.placeholder}
        value={values[partner.key] ?? null}
        error={errors[partner.key]}
        onChange={(value) => dispatch({ type: 'setEntity', key: partner.key, value })}
      />
      {descriptor.expectedDateLabel ? (
        <div className={AI_FORM_TOUCH_DATE}>
          <DatePickerField
            id={`${idPrefix}-expectedDate`}
            label={descriptor.expectedDateLabel}
            disablePastDates
            value={values.expectedDate ?? ''}
            error={errors.expectedDate}
            onChange={(value) => dispatch({ type: 'setExpectedDate', value })}
          />
        </div>
      ) : null}
    </>
  )
}
