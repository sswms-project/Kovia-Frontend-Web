import { useEffect, useMemo, useReducer } from 'react'
import type { AiFormCardData } from '../schemas/ai-form-card.schema'
import {
  AI_FORM_FLOW_TYPES,
  type AiFormFieldErrors,
  type AiFormSubmitRequest,
} from '../types/ai-form.types'
import { getAiDraftEditDescriptor } from '../utils/ai-draft-edit-descriptors'
import { AI_FORM_FLOWS } from '../utils/ai-form-flows'
import { toAiFormSubmitLines } from '../utils/ai-form-lines'
import { aiFormReducer, createInitialAiFormState } from '../utils/ai-form-state'
import { loadAiFormDraft, saveAiFormDraft } from '../utils/ai-form-storage'
import { getAiFormLimits, validateAiFormStep } from '../utils/ai-form-validation'
import { useAiFormSubmit } from './use-ai-form-submit'

const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * Values, step, status and submit of one form flow. The values are mirrored to sessionStorage by flow
 * id, so a reload of the panel keeps what the user typed; the BE flow id decides when it all goes stale.
 */
export function useAiFormFlow(form: AiFormCardData) {
  const [state, dispatch] = useReducer(aiFormReducer, form, (initial) =>
    createInitialAiFormState(initial, loadAiFormDraft(initial.flowId))
  )
  const limits = useMemo(() => getAiFormLimits(form), [form])
  const { values, step, status, lineSequence } = state

  const submitMutation = useAiFormSubmit({
    flowId: form.flowId,
    onSubmitted: () => dispatch({ type: 'finish', status: 'submitted' }),
    onFieldErrors: (errors) => dispatch({ type: 'setErrors', errors }),
    onRestartRequired: () => dispatch({ type: 'finish', status: 'expired' }),
  })
  const isSubmitting = submitMutation.isPending

  useEffect(() => {
    // Validation errors are not stored: they are recomputed from the values.
    saveAiFormDraft(form.flowId, { step, status, lineSequence, values })
  }, [form.flowId, values, step, status, lineSequence])

  useEffect(() => {
    // A submit in flight settles first: the BE decides whether it still counts. When it ends and the
    // form is still open, this runs again and an elapsed deadline expires the form right away.
    if (status !== 'open' || isSubmitting) return
    const delay = Math.max(0, Date.parse(form.expiresAt) - Date.now())
    // A longer delay overflows setTimeout and would fire at once; the BE still rejects a late submit.
    if (delay > MAX_TIMEOUT_MS) return
    const timerId = window.setTimeout(() => dispatch({ type: 'finish', status: 'expired' }), delay)
    return () => window.clearTimeout(timerId)
  }, [form.expiresAt, status, isSubmitting])

  // Every flow but the stock issue one checks and builds its values like the draft editor of its type.
  const descriptor =
    form.flowType === AI_FORM_FLOW_TYPES.stockIssueCreate
      ? undefined
      : getAiDraftEditDescriptor(AI_FORM_FLOWS[form.flowType].action)

  const validateAll = (): AiFormFieldErrors =>
    descriptor
      ? descriptor.validate(values, limits)
      : { ...validateAiFormStep(1, values, limits), ...validateAiFormStep(2, values, limits) }

  /** Moves to the products step once the first step's fields are chosen. */
  const goNext = () => {
    const firstStep: readonly string[] = AI_FORM_FLOWS[form.flowType].steps[0]?.fields ?? []
    const errors: AiFormFieldErrors = descriptor
      ? Object.fromEntries(Object.entries(validateAll()).filter(([key]) => firstStep.includes(key)))
      : validateAiFormStep(1, values, limits)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'setErrors', errors })
      return
    }
    dispatch({ type: 'goToStep', step: 2 })
  }

  /** Validates every step, then sends the form; what is still wrong is shown instead of sending. */
  const submit = () => {
    if (isSubmitting) return
    const errors = validateAll()
    if (!values.warehouse || Object.keys(errors).length > 0) {
      dispatch({ type: 'setErrors', errors })
      return
    }
    if (descriptor) {
      const built = descriptor.toRequest('', values)
      if (!built) return
      // The form body uses the draft editor's field names; the BE submit reads the ones of its flow.
      const { revision, ...fields } = built
      void revision // the form has no revision: its flow token and state version stand for it
      submitMutation.mutate({ ...fields, stateVersion: form.stateVersion })
      return
    }
    if (!values.recipient) return
    const request: AiFormSubmitRequest = {
      stateVersion: form.stateVersion,
      warehouseId: values.warehouse.id,
      recipientId: values.recipient.id,
      purpose: values.purpose.trim(),
      lines: toAiFormSubmitLines(values.lines),
    }
    submitMutation.mutate(request)
  }

  return { state, dispatch, limits, goNext, submit, isSubmitting, descriptor }
}
