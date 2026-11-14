import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { aiAssistantService } from '../services/ai-assistant.service'
import type { AiConversation, AiConversationMessages } from '../types/ai-assistant.types'

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
