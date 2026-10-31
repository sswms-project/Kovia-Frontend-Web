import { useEffect, useRef } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import type { ApiErrorResponse } from '@/types/api'
import { AI_DRAFT_STATUSES, type AiAction } from '../types/ai-assistant.types'
import { useAiActionDraftQuery, useCompleteAiActionMutation } from './use-ai-draft-actions'

const UNUSABLE_DRAFT_ERROR: ApiErrorResponse = {
  statusCode: 409,
  message: 'Bản nháp này đã được dùng, đã hủy, hết hạn hoặc không dành cho biểu mẫu này.',
}

/**
 * Loads the AI draft named in the URL for a create form. `payload` is only returned for a pending
 * draft of the expected action, so a form never prefills from the wrong or an already used draft.
 */
function useAiDraftPrefill<TPayload>(draftId: string | null, expectedAction: AiAction) {
  const query = useAiActionDraftQuery<TPayload>(draftId)
  const draft = query.data
  const isUsable = draft?.action === expectedAction && draft.status === AI_DRAFT_STATUSES.pending
  const error: ApiErrorResponse | null = query.isError
    ? query.error
    : draft && !isUsable
      ? UNUSABLE_DRAFT_ERROR
      : null

  return {
    draftId: draftId && isUsable ? draftId : null,
    payload: isUsable ? draft.payload : null,
    isLoading: query.isLoading,
    error,
  }
}

interface UseAiDraftFormPrefillOptions<TPayload, TValues extends FieldValues> {
  /** Draft named in the URL; null when the form is not a create form. */
  readonly draftId: string | null
  readonly expectedAction: AiAction
  readonly form: UseFormReturn<TValues>
  /** Maps the draft to form values; `current` is what the form shows now (e.g. the suggested code). */
  readonly toFormValues: (payload: TPayload, current: TValues) => TValues
}

/**
 * Prefills a create form from an AI draft once per draft (input typed before the draft arrived is
 * not overwritten) and reports the created document back through `complete`, at most once.
 */
export function useAiDraftFormPrefill<TPayload, TValues extends FieldValues>({
  draftId,
  expectedAction,
  form,
  toFormValues,
}: UseAiDraftFormPrefillOptions<TPayload, TValues>) {
  const draft = useAiDraftPrefill<TPayload>(draftId, expectedAction)
  const completeMutation = useCompleteAiActionMutation()
  const hydratedDraftId = useRef<string | null>(null)
  const completedDraftId = useRef<string | null>(null)

  useEffect(() => {
    if (!draft.payload || !draft.draftId || hydratedDraftId.current === draft.draftId) return
    hydratedDraftId.current = draft.draftId
    if (form.formState.isDirty) return
    form.reset(toFormValues(draft.payload, form.getValues()))
  }, [draft.draftId, draft.payload, form, toFormValues])

  function complete(resultEntityId: string) {
    if (!draft.draftId || completedDraftId.current === draft.draftId) return
    completedDraftId.current = draft.draftId
    completeMutation.mutate({ draftId: draft.draftId, resultEntityId })
  }

  return { ...draft, complete }
}
