import type { AiFormCardData, AiFormLine, AiFormValues } from '../schemas/ai-form-card.schema'
import type { AiFormFieldErrors, AiFormStep } from '../types/ai-form.types'
import { validateAiFormLine } from './ai-form-lines'

export interface AiFormLimits {
  readonly maxLines: number
  readonly purposeMaxLength: number
}

// Exported so the inline draft editor, which has no form card carrying limits, uses the same numbers.
export const DEFAULT_LIMITS: AiFormLimits = { maxLines: 50, purposeMaxLength: 500 }

/** Limits from the field definitions of the card; the BE stays the source of truth. */
export function getAiFormLimits(form: AiFormCardData): AiFormLimits {
  let limits = DEFAULT_LIMITS
  for (const field of form.fields) {
    if (field.key === 'lines' && field.constraints?.maxItems) {
      limits = { ...limits, maxLines: field.constraints.maxItems }
    }
    if (field.key === 'purpose' && field.constraints?.maxLength) {
      limits = { ...limits, purposeMaxLength: field.constraints.maxLength }
    }
  }
  return limits
}

export function validateAiFormLines(lines: readonly AiFormLine[]): string | undefined {
  if (lines.length === 0) return 'Thêm ít nhất một sản phẩm.'
  return lines.some((line) => Object.keys(validateAiFormLine(line)).length > 0)
    ? 'Kiểm tra lại các dòng sản phẩm bên dưới.'
    : undefined
}

/** Errors of the fields shown on `step`; an empty object means the step may continue. */
export function validateAiFormStep(
  step: AiFormStep,
  values: AiFormValues,
  limits: AiFormLimits
): AiFormFieldErrors {
  if (step === 1) {
    return {
      ...(values.warehouse ? {} : { warehouse: 'Chọn kho xuất.' }),
      ...(values.recipient ? {} : { recipient: 'Chọn người nhận.' }),
    }
  }

  const purpose = values.purpose.trim()
  const linesError = validateAiFormLines(values.lines)
  return {
    ...(linesError ? { lines: linesError } : {}),
    ...(purpose ? {} : { purpose: 'Nhập mục đích xuất.' }),
    ...(purpose.length > limits.purposeMaxLength
      ? { purpose: `Mục đích xuất tối đa ${limits.purposeMaxLength} ký tự.` }
      : {}),
  }
}
