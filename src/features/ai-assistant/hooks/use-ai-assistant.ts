import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import type { ApiErrorResponse } from '@/types/api'
import { aiAssistantService } from '../services/ai-assistant.service'
import type {
  AiChatResponse,
  AiConversation,
  AiConversationMessages,
  SendAiChatMessageRequest,
} from '../types/ai-assistant.types'
import { appendAiChatTurn } from '../utils/ai-conversation-cache'

export function useAiConversationsQuery() {
  return useQuery<AiConversation[], ApiErrorResponse>({
    queryKey: queryKeys.aiAssistant.conversations,
    queryFn: () => aiAssistantService.getConversations(),
  })
}

export function useAiConversationMessagesQuery(conversationId: string | null) {
  return useQuery<AiConversationMessages, ApiErrorResponse>({
    queryKey: queryKeys.aiAssistant.messages(conversationId ?? ''),
    queryFn: () => aiAssistantService.getMessages(conversationId ?? ''),
    enabled: Boolean(conversationId),
  })
}

// Toast, cache and the open conversation are handled here, not in the caller's mutate() callbacks:
// closing the panel while a request is in flight unmounts the caller, and v5 skips those callbacks.
export function useSendAiChatMessageMutation() {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const setConversationId = useAiAssistantPanelStore((state) => state.setConversationId)
  return useMutation<AiChatResponse, ApiErrorResponse, SendAiChatMessageRequest>({
    mutationFn: (request) =>
      aiAssistantService.sendMessage({ ...request, pagePath: request.pagePath ?? pathname }),
    onSuccess: (response) => {
      queryClient.setQueryData<AiConversationMessages>(
        queryKeys.aiAssistant.messages(response.conversationId),
        (current) => appendAiChatTurn(current, response)
      )
      setConversationId(response.conversationId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.conversations })
    },
    onError: (error) => {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Trợ lý AI chưa trả lời được. Vui lòng thử lại.'))
    },
  })
}
