import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage, logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { aiAssistantService } from '../services/ai-assistant.service'
import type { AiConversationMessages } from '../types/ai-assistant.types'
import type {
  AiFormFieldErrors,
  AiFormSubmitRequest,
  AiFormSubmitResponse,
} from '../types/ai-form.types'
import { appendAiFormResult } from '../utils/ai-form-cache'
import { readAiFormSubmitFailure } from '../utils/ai-form-errors'

interface UseAiFormSubmitOptions {
  readonly flowId: string
  readonly onSubmitted: () => void
  readonly onFieldErrors: (errors: AiFormFieldErrors) => void
  /** The flow expired, is invalid or outdated: the form cannot be sent any more. */
  readonly onRestartRequired: () => void
}

/**
 * Sends the form to the BE, which only prepares the draft and saves the turn. The confirmation card
 * joins the chat here, so it appears even if the panel was closed meanwhile; confirming stays a
 * separate step.
 */
export function useAiFormSubmit({
  flowId,
  onSubmitted,
  onFieldErrors,
  onRestartRequired,
}: UseAiFormSubmitOptions) {
  const queryClient = useQueryClient()
  return useMutation<AiFormSubmitResponse, ApiErrorResponse, AiFormSubmitRequest>({
    mutationFn: (request) => aiAssistantService.submitForm(flowId, request),
    onSuccess: async (response) => {
      const messagesKey = queryKeys.aiAssistant.messages(response.conversationId)
      // The saved messages are the source of truth; the form stays locked until they have loaded.
      if (response.messageId) await queryClient.invalidateQueries({ queryKey: messagesKey })
      // Fallback for a BE that did not save the turn (or a reload that failed). A card already in
      // the chat is left alone, so the confirmation never shows twice.
      queryClient.setQueryData<AiConversationMessages>(messagesKey, (current) =>
        appendAiFormResult(current, response)
      )
      onSubmitted()
    },
    onError: (error) => {
      logApiError(error)
      const { mustRestart, fieldErrors } = readAiFormSubmitFailure(error)
      if (mustRestart) {
        onRestartRequired()
      } else if (Object.keys(fieldErrors).length > 0) {
        // Shown next to the fields; a toast on top would report the same failure twice.
        onFieldErrors(fieldErrors)
      } else {
        toast.error(getApiErrorMessage(error))
      }
    },
  })
}
