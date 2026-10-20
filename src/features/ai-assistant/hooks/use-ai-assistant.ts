import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { aiAssistantService } from '../services/ai-assistant.service'
import {
  AI_ACTIONS,
  type AiActionExecution,
  type AiChatResponse,
  type AiConversation,
  type AiConversationMessages,
  type SendAiChatMessageRequest,
  type UpdateAiDraftQuantitiesRequest,
} from '../types/ai-assistant.types'
import { appendAiChatTurn, updateAiDraftStatus } from '../utils/ai-conversation-cache'

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

export function useAiConversationsQuery() {
  return useQuery<AiConversation[], ApiErrorResponse>({
    queryKey: queryKeys.aiAssistant.conversations,
    queryFn: () => aiAssistantService.getConversations().then((response) => response.data),
  })
}

export function useAiConversationMessagesQuery(conversationId: string | null) {
  return useQuery<AiConversationMessages, ApiErrorResponse>({
    queryKey: queryKeys.aiAssistant.messages(conversationId ?? ''),
    queryFn: () =>
      aiAssistantService.getMessages(conversationId ?? '').then((response) => response.data),
    enabled: Boolean(conversationId),
  })
}

export function useSendAiChatMessageMutation() {
  const queryClient = useQueryClient()
  return useMutation<AiChatResponse, ApiErrorResponse, SendAiChatMessageRequest>({
    mutationFn: (request) =>
      aiAssistantService.sendMessage(request).then((response) => response.data),
    onSuccess: (response) => {
      queryClient.setQueryData<AiConversationMessages>(
        queryKeys.aiAssistant.messages(response.conversationId),
        (current) => appendAiChatTurn(current, response)
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.conversations })
    },
    onError: (error) => logger.error(error),
  })
}

export function useConfirmAiActionMutation() {
  const queryClient = useQueryClient()
  return useMutation<AiActionExecution, ApiErrorResponse, AiDraftActionVariables>({
    mutationFn: ({ draftId }) =>
      aiAssistantService.confirmAction(draftId).then((response) => response.data),
    onSuccess: (execution, { conversationId }) => {
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
      // The draft may have expired or been handled elsewhere: reload its real status.
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.aiAssistant.messages(conversationId),
        })
      }
    },
  })
}

export interface AiDraftQuantitiesVariables
  extends AiDraftActionVariables, UpdateAiDraftQuantitiesRequest {}

export function useUpdateAiDraftQuantitiesMutation() {
  const queryClient = useQueryClient()
  // The BE rewrites the card stored in the conversation, so success and failure both reload it.
  const reload = (conversationId: string | null) => {
    if (conversationId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.aiAssistant.messages(conversationId),
      })
    }
  }
  return useMutation<unknown, ApiErrorResponse, AiDraftQuantitiesVariables>({
    mutationFn: ({ draftId, lines, expectedDate }) =>
      aiAssistantService.updateActionQuantities(draftId, { lines, expectedDate }),
    onSuccess: (_, { conversationId }) => reload(conversationId),
    onError: (error, { conversationId }) => {
      logger.error(error)
      reload(conversationId)
    },
  })
}

export function useCancelAiActionMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, AiDraftActionVariables>({
    mutationFn: ({ draftId }) => aiAssistantService.cancelAction(draftId),
    onSuccess: (_, { draftId, conversationId }) => {
      if (!conversationId) return
      queryClient.setQueryData<AiConversationMessages>(
        queryKeys.aiAssistant.messages(conversationId),
        (current) =>
          updateAiDraftStatus(current, { draftId, status: 'Cancelled', resultEntityId: null })
      )
    },
    onError: (error, { conversationId }) => {
      logger.error(error)
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.aiAssistant.messages(conversationId),
        })
      }
    },
  })
}
