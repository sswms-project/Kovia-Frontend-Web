import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { aiAssistantService } from '../services/ai-assistant.service'
import {
  AI_ACTIONS,
  AI_DRAFT_STATUSES,
  type AiActionDraft,
  type AiActionExecution,
  type AiConversationMessages,
} from '../types/ai-assistant.types'
import { updateAiDraftStatus } from '../utils/ai-conversation-cache'

export interface AiDraftActionVariables {
  readonly draftId: string
  readonly conversationId: string | null
}

// Lists that change once a confirmed draft has been executed.
const ACTION_RESULT_QUERY_KEYS: Record<string, QueryKey> = {
  [AI_ACTIONS.createInboundRequest]: queryKeys.inboundRequests.all,
  [AI_ACTIONS.createTransfer]: queryKeys.transfers.all,
  [AI_ACTIONS.createStockAdjustment]: queryKeys.stockAdjustments.all,
  [AI_ACTIONS.createStockIssueRequest]: queryKeys.stockIssueRequests.all,
  [AI_ACTIONS.createSupplierReturn]: queryKeys.supplierReturns.all,
}

export function useConfirmAiActionMutation() {
  const queryClient = useQueryClient()
  return useMutation<AiActionExecution, ApiErrorResponse, AiDraftActionVariables>({
    mutationFn: ({ draftId }) => aiAssistantService.confirmAction(draftId),
    onSuccess: (execution, { conversationId }) => {
      toast.success('Đã thực hiện thao tác.')
      if (conversationId) {
        queryClient.setQueryData<AiConversationMessages>(
          queryKeys.aiAssistant.messages(conversationId),
          (current) => updateAiDraftStatus(current, execution)
        )
      }
      const resultQueryKey = ACTION_RESULT_QUERY_KEYS[execution.action]
      if (resultQueryKey) void queryClient.invalidateQueries({ queryKey: resultQueryKey })
    },
    onError: (error, { conversationId }) => {
      logger.error(error)
      toast.error(getApiErrorMessage(error))
      // The draft may have expired or been handled elsewhere: reload its real status.
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.aiAssistant.messages(conversationId),
        })
      }
    },
  })
}

export function useCancelAiActionMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, AiDraftActionVariables>({
    mutationFn: ({ draftId }) => aiAssistantService.cancelAction(draftId),
    onSuccess: (_, { draftId, conversationId }) => {
      toast.success('Đã hủy bản nháp.')
      if (!conversationId) return
      queryClient.setQueryData<AiConversationMessages>(
        queryKeys.aiAssistant.messages(conversationId),
        (current) =>
          updateAiDraftStatus(current, {
            draftId,
            status: AI_DRAFT_STATUSES.cancelled,
            resultEntityId: null,
          })
      )
    },
    onError: (error, { conversationId }) => {
      logger.error(error)
      toast.error(getApiErrorMessage(error))
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.aiAssistant.messages(conversationId),
        })
      }
    },
  })
}

/** Bản nháp mà form tạo phiếu đang điền sẵn; `retry: false` vì hết hạn hay đã dùng không tự hết. */
export function useAiActionDraftQuery<TPayload>(draftId: string | null) {
  return useQuery<AiActionDraft<TPayload>, ApiErrorResponse>({
    queryKey: queryKeys.aiAssistant.actionDraft(draftId ?? ''),
    queryFn: () => aiAssistantService.getAction<TPayload>(draftId ?? ''),
    enabled: Boolean(draftId),
    retry: false,
  })
}

export interface CompleteAiActionVariables {
  readonly draftId: string
  readonly resultEntityId: string
}

// Called after the user created the document from the form. The document already exists, so a
// failure here is only a warning; the reporting lives here because the form navigates away.
export function useCompleteAiActionMutation() {
  const queryClient = useQueryClient()
  return useMutation<AiActionExecution, ApiErrorResponse, CompleteAiActionVariables>({
    mutationFn: ({ draftId, resultEntityId }) =>
      aiAssistantService.completeAction(draftId, { resultEntityId }),
    onSuccess: () => {
      // The draft query is left alone: refetching a completed draft only returns 409 while the form is
      // still mounted; reopening its link later refetches on mount and shows that error properly.
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.messagesAll })
    },
    onError: (error) => {
      logger.error(error)
      toast.warning(
        'Phiếu đã được tạo nhưng chưa cập nhật được trạng thái bản nháp của Trợ lý AI.',
        {
          description: getApiErrorMessage(error),
        }
      )
    },
  })
}
