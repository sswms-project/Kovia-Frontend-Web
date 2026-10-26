import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ReturnDocumentAction, ReturnDocumentKind } from '@/types/return-document'
import type { ApiResponse } from '@/types/api'

export const returnDocumentService = {
  execute: async (
    kind: ReturnDocumentKind,
    id: string,
    action: ReturnDocumentAction,
    request: { expectedVersion: string; commandId: string; reason: string }
  ) => {
    const endpoint = API_ENDPOINTS.returnDocumentAction(kind, id, action)
    const response =
      action === 'DeleteDraft'
        ? await axiosClient.delete<ApiResponse<unknown>>(endpoint, { data: request })
        : await axiosClient.post<ApiResponse<unknown>>(endpoint, request)
    return response.data
  },
  save: async (
    kind: ReturnDocumentKind,
    id: string,
    expectedVersion: string,
    commandId: string,
    content: unknown
  ) => {
    const response = await axiosClient.put<ApiResponse<unknown>>(API_ENDPOINTS[kind].detail(id), {
      expectedVersion,
      commandId,
      content,
    })
    return response.data
  },
}
