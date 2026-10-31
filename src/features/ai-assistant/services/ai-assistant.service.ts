import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AiActionDraft,
  AiActionExecution,
  AiChatResponse,
  AiConversation,
  AiConversationMessages,
  CompleteAiActionRequest,
  SendAiChatMessageRequest,
} from '../types/ai-assistant.types'

// The assistant may run several tool calls (and a forecast) before answering; the BE allows 90s.
const AI_CHAT_TIMEOUT_MS = 100_000

export const aiAssistantService = {
  sendMessage: (request: SendAiChatMessageRequest) =>
    axiosClient
      .post<ApiResponse<AiChatResponse>>(API_ENDPOINTS.aiAssistant.chat, request, {
        timeout: AI_CHAT_TIMEOUT_MS,
      })
      .then((response) => response.data.data),
  getConversations: () =>
    axiosClient
      .get<ApiResponse<AiConversation[]>>(API_ENDPOINTS.aiAssistant.conversations)
      .then((response) => response.data.data),
  getMessages: (conversationId: string) =>
    axiosClient
      .get<ApiResponse<AiConversationMessages>>(API_ENDPOINTS.aiAssistant.messages(conversationId))
      .then((response) => response.data.data),
  confirmAction: (draftId: string) =>
    axiosClient
      .post<ApiResponse<AiActionExecution>>(API_ENDPOINTS.aiAssistant.confirmAction(draftId))
      .then((response) => response.data.data),
  getAction: <TPayload>(draftId: string) =>
    axiosClient
      .get<ApiResponse<AiActionDraft<TPayload>>>(API_ENDPOINTS.aiAssistant.getAction(draftId))
      .then((response) => response.data.data),
  completeAction: (draftId: string, request: CompleteAiActionRequest) =>
    axiosClient
      .post<
        ApiResponse<AiActionExecution>
      >(API_ENDPOINTS.aiAssistant.completeAction(draftId), request)
      .then((response) => response.data.data),
  cancelAction: (draftId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.aiAssistant.cancelAction(draftId))
      .then((response) => response.data.data),
}
