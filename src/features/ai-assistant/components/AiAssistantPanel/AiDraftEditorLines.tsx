import type { Dispatch } from 'react'
import type { AiFormValues } from '../../schemas/ai-form-card.schema'
import type { AiFormFieldErrors } from '../../types/ai-form.types'
import type { AiDraftEditDescriptor } from '../../utils/ai-draft-edit-descriptors'
import type { AiFormLineErrors } from '../../utils/ai-form-lines'
import type { AiFormAction } from '../../utils/ai-form-state'
import { AiCatalogProductLines } from './AiFormCard/AiCatalogProductLines'
import { AiFormProductLines } from './AiFormCard/AiFormProductLines'
import { AiFormPurposeField } from './AiFormCard/AiFormPurposeField'

interface AiDraftEditorLinesProps {
  readonly idPrefix: string
  readonly descriptor: AiDraftEditDescriptor
  readonly values: AiFormValues
  readonly errors: AiFormFieldErrors
  readonly lineErrors: Readonly<Record<string, AiFormLineErrors>>
  readonly dispatch: Dispatch<AiFormAction>
}

/**
 * The product rows and, where the type has one, the purpose or reason text. Products are searched in
 * the chosen warehouse's stock for a stock-bound type and in the whole catalog otherwise; shortage is
 * advice and never stops a save.
 */
export function AiDraftEditorLines({
  idPrefix,
  descriptor,
  values,
  errors,
  lineErrors,
  dispatch,
}: AiDraftEditorLinesProps) {
  const { limits } = descriptor
  if (!descriptor.isStockBound) {
    return (
      <AiCatalogProductLines
        idPrefix={`${idPrefix}-line`}
        legend={descriptor.linesLegend}
        lines={values.lines}
        maxLines={limits.maxLines}
        error={errors.lines}
        lineErrors={lineErrors}
        dispatch={dispatch}
      />
    )
  }
  return (
    <>
      <AiFormProductLines
        idPrefix={`${idPrefix}-line`}
        legend={descriptor.linesLegend}
        baseUnitOnly={descriptor.baseUnitOnly}
        lines={values.lines}
        warehouseId={values.warehouse?.id ?? ''}
        maxLines={limits.maxLines}
        error={errors.lines}
        lineErrors={lineErrors}
        dispatch={dispatch}
      />
      {descriptor.purposeLabel ? (
        <AiFormPurposeField
          id={`${idPrefix}-purpose`}
          label={descriptor.purposeLabel}
          value={values.purpose}
          maxLength={limits.purposeMaxLength}
          error={errors.purpose}
          onChange={(value) => dispatch({ type: 'setPurpose', value })}
        />
      ) : null}
    </>
  )
}
