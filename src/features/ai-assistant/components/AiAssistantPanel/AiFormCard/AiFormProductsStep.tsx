import type { Dispatch } from 'react'
import type { AiFormValues } from '../../../schemas/ai-form-card.schema'
import type { AiFormFieldErrors, AiFormFieldKey } from '../../../types/ai-form.types'
import type { AiFormLineErrors } from '../../../utils/ai-form-lines'
import type { AiFormAction } from '../../../utils/ai-form-state'
import type { AiFormLimits } from '../../../utils/ai-form-validation'
import { AiFormProductLines } from './AiFormProductLines'
import { AiFormPurposeField } from './AiFormPurposeField'

interface AiFormProductsStepProps {
  readonly idPrefix: string
  readonly values: AiFormValues
  readonly errors: AiFormFieldErrors
  readonly limits: AiFormLimits
  readonly lineErrors?: Readonly<Record<string, AiFormLineErrors>>
  readonly labelOf: (key: AiFormFieldKey) => string
  readonly dispatch: Dispatch<AiFormAction>
}

/** Step 2: the products to issue and why. */
export function AiFormProductsStep({
  idPrefix,
  values,
  errors,
  limits,
  lineErrors,
  labelOf,
  dispatch,
}: AiFormProductsStepProps) {
  return (
    <>
      <AiFormProductLines
        idPrefix={`${idPrefix}-line`}
        lines={values.lines}
        warehouseId={values.warehouse?.id ?? ''}
        maxLines={limits.maxLines}
        error={errors.lines}
        lineErrors={lineErrors}
        dispatch={dispatch}
      />
      <AiFormPurposeField
        id={`${idPrefix}-purpose`}
        label={labelOf('purpose')}
        value={values.purpose}
        maxLength={limits.purposeMaxLength}
        error={errors.purpose}
        onChange={(value) => dispatch({ type: 'setPurpose', value })}
      />
    </>
  )
}
