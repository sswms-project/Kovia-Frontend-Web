import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AiActionExecution,
  AiChatResponse,
  AiConversation,
  AiConversationMessages,
  SendAiChatMessageRequest,
  UpdateAiDraftQuantitiesRequest,
} from '../types/ai-assistant.types'

// The assistant may run several tool calls (and a forecast) before answering; the BE allows 90s.
const AI_CHAT_TIMEOUT_MS = 100_000

export const aiAssistantService = {
  sendMessage: (request: SendAiChatMessageRequest) =>
    axiosClient
      .post<ApiResponse<AiChatResponse>>(API_ENDPOINTS.aiAssistant.chat, request, {
        timeout: AI_CHAT_TIMEOUT_MS,
      })
      .then((response) => response.data),
  getConversations: () =>
    axiosClient
      .get<ApiResponse<AiConversation[]>>(API_ENDPOINTS.aiAssistant.conversations)
      .then((response) => response.data),
  getMessages: (conversationId: string) =>
    axiosClient
      .get<ApiResponse<AiConversationMessages>>(API_ENDPOINTS.aiAssistant.messages(conversationId))
      .then((response) => response.data),
  confirmAction: (draftId: string) =>
    axiosClient
      .post<ApiResponse<AiActionExecution>>(API_ENDPOINTS.aiAssistant.confirmAction(draftId))
      .then((response) => response.data),
  updateActionQuantities: (draftId: string, request: UpdateAiDraftQuantitiesRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.aiAssistant.updateActionQuantities(draftId), request)
      .then((response) => response.data),
  cancelAction: (draftId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.aiAssistant.cancelAction(draftId))
      .then((response) => response.data),
}
