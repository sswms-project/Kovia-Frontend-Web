import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AllowedActionsResponse,
  LookupListResponse,
  LookupQuery,
  InboundRequestListResponse,
  ProductOption,
  InboundRequestDetail,
  InboundRequestListQuery,
  InboundDecisionRequest,
  InboundReconciliationRequest,
  SaveInboundRequestRequest,
  CreateInboundRequestRequest,
  SupplierEmailDispatch,
  SupplierInboundResponsePreview,
  SupplierInboundResponseRequest,
  SupplierOption,
} from '../types/inbound-request.types'

export const inboundRequestService = {
  getNextCode: () =>
    axiosClient
      .get<ApiResponse<string>>(API_ENDPOINTS.inboundRequests.nextCode)
      .then((response) => response.data),
  updateCode: (
    id: string,
    request: { inboundRequestCode: string; reason: string; expectedVersion: string }
  ) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.updateCode(id), request)
      .then((response) => response.data),
  getInboundRequests: (params: InboundRequestListQuery) =>
    axiosClient
      .get<ApiResponse<InboundRequestListResponse>>(API_ENDPOINTS.inboundRequests.list, {
        params,
      })
      .then((response) => response.data),
  getInboundRequest: (inboundRequestId: string) =>
    axiosClient
      .get<
        ApiResponse<InboundRequestDetail>
      >(API_ENDPOINTS.inboundRequests.detail(inboundRequestId))
      .then((response) => response.data),
  getAllowedActions: (inboundRequestId: string) =>
    axiosClient
      .get<
        ApiResponse<AllowedActionsResponse>
      >(API_ENDPOINTS.inboundRequests.allowedActions(inboundRequestId))
      .then((response) => response.data),
  getProducts: (params: LookupQuery) =>
    axiosClient
      .get<ApiResponse<LookupListResponse<ProductOption>>>(API_ENDPOINTS.products.list, { params })
      .then((response) => response.data),
  getSuppliers: (params: LookupQuery) =>
    axiosClient
      .get<
        ApiResponse<LookupListResponse<SupplierOption>>
      >(API_ENDPOINTS.suppliers.list, { params })
      .then((response) => response.data),
  createInboundRequest: (request: CreateInboundRequestRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.inboundRequests.create, request)
      .then((response) => response.data),
  duplicateInboundRequest: (inboundRequestId: string) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.inboundRequests.duplicate(inboundRequestId))
      .then((response) => response.data),
  updateInboundRequest: (inboundRequestId: string, request: SaveInboundRequestRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.update(inboundRequestId), request)
      .then((response) => response.data),
  deleteInboundRequest: (inboundRequestId: string) =>
    axiosClient
      .delete<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.delete(inboundRequestId))
      .then((response) => response.data),
  deleteInboundRequests: (ids: readonly string[]) =>
    axiosClient
      .delete<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.deleteMany, { data: { ids } })
      .then((response) => response.data),
  submitInboundRequest: (inboundRequestId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.submit(inboundRequestId))
      .then((response) => response.data),
  submitInboundRequests: (ids: readonly string[]) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.submitMany, { ids })
      .then((response) => response.data),
  approveInboundRequest: (inboundRequestId: string, request: InboundDecisionRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.approve(inboundRequestId), request)
      .then((response) => response.data),
  approveInboundRequests: (ids: readonly string[]) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.approveMany, { ids })
      .then((response) => response.data),
  approveAndSendInboundRequest: (inboundRequestId: string, request: InboundDecisionRequest) =>
    axiosClient
      .post<
        ApiResponse<SupplierEmailDispatch>
      >(API_ENDPOINTS.inboundRequests.approveAndSend(inboundRequestId), request)
      .then((response) => response.data),
  acceptSupplierProposedDate: (inboundRequestId: string, request: InboundDecisionRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.inboundRequests.acceptSupplierProposedDate(inboundRequestId), request)
      .then((response) => response.data),
  getSupplierResponsePreview: (token: string) =>
    axiosClient
      .get<
        ApiResponse<SupplierInboundResponsePreview>
      >(API_ENDPOINTS.supplierResponses.preview(token))
      .then((response) => response.data),
  respondAsSupplier: (token: string, request: SupplierInboundResponseRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.supplierResponses.respond(token), request)
      .then((response) => response.data),
  sendInboundRequestToSupplier: (inboundRequestId: string) =>
    axiosClient
      .post<
        ApiResponse<SupplierEmailDispatch>
      >(API_ENDPOINTS.inboundRequests.sendToSupplier(inboundRequestId))
      .then((response) => response.data),
  rejectInboundRequest: (
    inboundRequestId: string,
    reason: string,
    request: InboundDecisionRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.inboundRequests.reject(inboundRequestId), { reason, ...request })
      .then((response) => response.data),
  cancelInboundRequest: (inboundRequestId: string, request: InboundReconciliationRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.inboundRequests.cancel(inboundRequestId), request)
      .then((response) => response.data),
  closeRemainingInboundQuantity: (
    inboundRequestId: string,
    request: InboundReconciliationRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.inboundRequests.closeRemaining(inboundRequestId), request)
      .then((response) => response.data),
}
