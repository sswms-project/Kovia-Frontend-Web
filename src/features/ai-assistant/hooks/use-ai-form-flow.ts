import { useEffect, useMemo, useReducer } from 'react'
import type { AiFormCardData } from '../schemas/ai-form-card.schema'
import type { AiFormSubmitRequest } from '../types/ai-form.types'
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

  /** Moves to the products step once warehouse and recipient are chosen. */
  const goNext = () => {
    const errors = validateAiFormStep(1, values, limits)
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'setErrors', errors })
      return
    }
    dispatch({ type: 'goToStep', step: 2 })
  }

  /** Validates every step, then sends the form; what is still wrong is shown instead of sending. */
  const submit = () => {
    if (isSubmitting) return
    const errors = {
      ...validateAiFormStep(1, values, limits),
      ...validateAiFormStep(2, values, limits),
    }
    if (!values.warehouse || !values.recipient || Object.keys(errors).length > 0) {
      dispatch({ type: 'setErrors', errors })
      return
    }
    const request: AiFormSubmitRequest = {
      stateVersion: form.stateVersion,
      warehouseId: values.warehouse.id,
      recipientId: values.recipient.id,
      purpose: values.purpose.trim(),
      lines: toAiFormSubmitLines(values.lines),
    }
    submitMutation.mutate(request)
  }

  return { state, dispatch, limits, goNext, submit, isSubmitting }
}
