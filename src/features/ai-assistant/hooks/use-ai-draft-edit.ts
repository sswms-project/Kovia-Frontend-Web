import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage, logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { useAiDraftViewStore } from '@/stores/ai-draft-view.store'
import type { ApiErrorResponse } from '@/types/api'
import type { AiDraftEditorResponse, AiDraftUpdateResponse } from '../schemas/ai-draft-edit.schema'
import { aiAssistantService } from '../services/ai-assistant.service'
import { AI_DRAFT_STATUSES, type AiConversationMessages } from '../types/ai-assistant.types'
import {
  AI_DRAFT_CONFLICT_CODES,
  type AiDraftConflictCode,
  type AiDraftUpdateRequest,
} from '../types/ai-draft-edit.types'
import { patchAiDraftEdit, updateAiDraftStatus } from '../utils/ai-conversation-cache'
import {
  AI_DRAFT_CONFLICT_MESSAGES,
  getAiDraftConflictCode,
  readAiDraftEditFieldFailure,
  type AiDraftEditFieldFailure,
} from '../utils/ai-draft-edit-errors'

/**
 * What the editor opens on. Read when the editor opens and never refetched behind the user's back:
 * the values become local form state, and a newer revision is reported by the BE when saving.
 */
export function useAiDraftEditorQuery(draftId: string) {
  return useQuery<AiDraftEditorResponse, ApiErrorResponse>({
    queryKey: queryKeys.aiAssistant.actionEditor(draftId),
    queryFn: ({ signal }) => aiAssistantService.getActionEditor(draftId, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Reports a 409 of the edit or confirm endpoint. A revision mismatch becomes the card's CONFLICT state
 * (the banner is its report, so no toast); the other codes toast once and move the card to its real status.
 */
export function useAiDraftConflictHandler() {
  const queryClient = useQueryClient()
  const markConflict = useAiDraftViewStore((state) => state.markConflict)
  return (draftId: string, code: AiDraftConflictCode) => {
    if (code === AI_DRAFT_CONFLICT_CODES.revisionMismatch) {
      markConflict(draftId)
    } else {
      toast.error(AI_DRAFT_CONFLICT_MESSAGES[code])
      if (code === AI_DRAFT_CONFLICT_CODES.expired) {
        queryClient.setQueriesData<AiConversationMessages>(
          { queryKey: queryKeys.aiAssistant.messagesAll },
          (current) =>
            updateAiDraftStatus(current, {
              draftId,
              status: AI_DRAFT_STATUSES.expired,
              resultEntityId: null,
            })
        )
      }
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.messagesAll })
  }
}

interface UseUpdateAiDraftOptions {
  readonly draftId: string
  /** The edit is saved and the cache holds the new revision: the editor can close. */
  readonly onSaved: () => void
  /** The BE named fields or rows that are wrong; they are shown in place, not in a toast. */
  readonly onFieldFailure: (failure: AiDraftEditFieldFailure) => void
}

/** Saves the editor with `PUT`; the cache, the saved-revision mark and every failure report live here. */
export function useUpdateAiDraftMutation({
  draftId,
  onSaved,
  onFieldFailure,
}: UseUpdateAiDraftOptions) {
  const queryClient = useQueryClient()
  const markSaved = useAiDraftViewStore((state) => state.markSaved)
  const handleConflict = useAiDraftConflictHandler()

  return useMutation<AiDraftUpdateResponse, ApiErrorResponse, AiDraftUpdateRequest>({
    mutationKey: queryKeys.aiAssistant.updateAction(draftId),
    mutationFn: (request) => aiAssistantService.updateAction(draftId, request),
    onSuccess: async ({ draft, warnings }) => {
      // A conversation fetch still in flight would land after the patch and bring the old revision back.
      await queryClient.cancelQueries({ queryKey: queryKeys.aiAssistant.messagesAll })
      queryClient.setQueriesData<AiConversationMessages>(
        { queryKey: queryKeys.aiAssistant.messagesAll },
        (current) => patchAiDraftEdit(current, draft)
      )
      markSaved(draft.draftId, draft.revision, warnings)
      toast.success('Đã cập nhật bản nháp.')
      onSaved()
    },
    onError: (error) => {
      logApiError(error)
      const conflictCode = getAiDraftConflictCode(error)
      if (conflictCode) return handleConflict(draftId, conflictCode)
      const failure = readAiDraftEditFieldFailure(error)
      if (failure.hasMessages) return onFieldFailure(failure)
      toast.error(getApiErrorMessage(error))
    },
  })
}

/** "Tải lại bản mới nhất": refetches the conversation; the conflict stays until that has succeeded. */
export function useReloadAiDraft() {
  const queryClient = useQueryClient()
  const clearConflict = useAiDraftViewStore((state) => state.clearConflict)
  const [isReloading, setIsReloading] = useState(false)

  const reload = async (draftId: string) => {
    setIsReloading(true)
    try {
      await queryClient.refetchQueries(
        { queryKey: queryKeys.aiAssistant.messagesAll, type: 'active' },
        { throwOnError: true }
      )
      clearConflict(draftId)
    } catch (error) {
      logApiError(error)
      toast.error(getApiErrorMessage(error, 'Không tải lại được bản nháp. Hãy thử lại.'))
    } finally {
      setIsReloading(false)
    }
  }
  return { reload, isReloading }
}
