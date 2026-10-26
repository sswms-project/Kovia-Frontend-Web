import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/features/product/services/product.service'
import { logger } from '@/lib/logger'
import { formatApiError, isApiErrorResponse, logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { inboundRequestService } from '../services/inbound-request.service'
import type {
  AllowedActionsResponse,
  LookupListResponse,
  LookupQuery,
  InboundRequestListResponse,
  ProductOption,
  InboundRequestDetail,
  InboundRequestListQuery,
  SaveInboundRequestRequest,
  SupplierEmailDispatch,
  SupplierInboundResponsePreview,
  SupplierInboundResponseRequest,
  SupplierOption,
} from '../types/inbound-request.types'

interface UpdateInboundRequestVariables {
  inboundRequestId: string
  request: SaveInboundRequestRequest
}

interface RejectInboundRequestVariables {
  inboundRequestId: string
  reason: string
  expectedVersion: string
  selfApprovalAcknowledged: boolean
}

interface ApproveInboundRequestVariables {
  inboundRequestId: string
  expectedVersion: string
  selfApprovalAcknowledged: boolean
}

interface ReconcileInboundRequestVariables {
  inboundRequestId: string
  action: 'cancel' | 'closeRemaining' | 'withdraw'
  reason: string
  expectedVersion: string
}

export function useInboundRequestsQuery(params: InboundRequestListQuery) {
  return useQuery<InboundRequestListResponse, ApiErrorResponse>({
    queryKey: queryKeys.inboundRequests.list(params),
    queryFn: () =>
      inboundRequestService.getInboundRequests(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useNextInboundRequestCodeQuery(enabled: boolean, sessionKey?: string) {
  return useQuery({
    queryKey: [...queryKeys.inboundRequests.nextCode, sessionKey ?? null],
    queryFn: () => inboundRequestService.getNextCode().then((response) => response.data),
    enabled,
    staleTime: 0,
  })
}

export function useUpdateInboundRequestCodeMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string
      request: { inboundRequestCode: string; reason: string; expectedVersion: string }
    }) => inboundRequestService.updateCode(id, request),
    onSuccess: (_, variables) => invalidate(variables.id),
    onError: (error) => {
      if (isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500)
        logger.warn(formatApiError(error))
      else logger.error(formatApiError(error))
    },
  })
}

export function useInboundRequestQuery(inboundRequestId: string) {
  return useQuery<InboundRequestDetail, ApiErrorResponse>({
    queryKey: queryKeys.inboundRequests.detail(inboundRequestId),
    queryFn: () =>
      inboundRequestService.getInboundRequest(inboundRequestId).then((response) => response.data),
    enabled: Boolean(inboundRequestId),
  })
}

export function useInboundRequestAllowedActionsQuery(inboundRequestId: string) {
  return useQuery<AllowedActionsResponse, ApiErrorResponse>({
    queryKey: queryKeys.inboundRequests.allowedActions(inboundRequestId),
    queryFn: () =>
      inboundRequestService.getAllowedActions(inboundRequestId).then((response) => response.data),
    enabled: Boolean(inboundRequestId),
  })
}

export function useProductOptionsQuery(params: LookupQuery) {
  return useQuery<LookupListResponse<ProductOption>, ApiErrorResponse>({
    queryKey: queryKeys.inboundRequests.products(params),
    queryFn: () => inboundRequestService.getProducts(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useSupplierOptionsQuery(params: LookupQuery) {
  return useQuery<LookupListResponse<SupplierOption>, ApiErrorResponse>({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: () => inboundRequestService.getSuppliers(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useInboundRequestProductDetails(productIds: readonly string[]) {
  return useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.products.detail(id),
      queryFn: () => productService.getProductById(id).then((response) => response.data),
    })),
  })
}

export function useInboundRequestUnitConversions(productIds: readonly string[]) {
  return useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.products.unitConversions(id),
      queryFn: () => productService.getUnitConversions(id).then((response) => response.data),
    })),
  })
}

function useInvalidateInboundRequests() {
  const queryClient = useQueryClient()
  return async (inboundRequestId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.inboundRequests.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsReceipts.all }),
      ...(inboundRequestId
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.inboundRequests.detail(inboundRequestId),
            }),
          ]
        : []),
    ])
  }
}

export function useCreateInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<
    ApiResponse<string>,
    ApiErrorResponse,
    Parameters<typeof inboundRequestService.createInboundRequest>[0]
  >({
    mutationFn: inboundRequestService.createInboundRequest,
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useDuplicateInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<string>, ApiErrorResponse, string>({
    mutationFn: inboundRequestService.duplicateInboundRequest,
    onSuccess: (_, inboundRequestId) => invalidate(inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

export function useUpdateInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateInboundRequestVariables>({
    mutationFn: ({ inboundRequestId, request }) =>
      inboundRequestService.updateInboundRequest(inboundRequestId, request),
    onSuccess: (_, variables) => invalidate(variables.inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

export function useDeleteInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { id: string; expectedVersion: string }
  >({
    mutationFn: ({ id, expectedVersion }) =>
      inboundRequestService.deleteInboundRequest(id, expectedVersion),
    onSuccess: (_, variables) => invalidate(variables.id),
    onError: (error) => logger.error(error),
  })
}

export function useDeleteInboundRequestsMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { ids: readonly string[]; expectedVersions: Readonly<Record<string, string>> }
  >({
    mutationFn: ({ ids, expectedVersions }) =>
      inboundRequestService.deleteInboundRequests(ids, expectedVersions),
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useSubmitInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, string>({
    mutationFn: inboundRequestService.submitInboundRequest,
    onSuccess: (_, inboundRequestId) => invalidate(inboundRequestId),
    onError: logApiError,
  })
}

export function useSubmitInboundRequestsMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, readonly string[]>({
    mutationFn: inboundRequestService.submitInboundRequests,
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useApproveInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ApproveInboundRequestVariables>({
    mutationFn: ({ inboundRequestId, ...request }) =>
      inboundRequestService.approveInboundRequest(inboundRequestId, request),
    onSuccess: (_, variables) => invalidate(variables.inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

export function useApproveInboundRequestsMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, readonly string[]>({
    mutationFn: inboundRequestService.approveInboundRequests,
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useApproveAndSendInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<
    ApiResponse<SupplierEmailDispatch>,
    ApiErrorResponse,
    ApproveInboundRequestVariables
  >({
    mutationFn: ({ inboundRequestId, ...request }) =>
      inboundRequestService.approveAndSendInboundRequest(inboundRequestId, request),
    onSuccess: (_, variables) => invalidate(variables.inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

export function useSendInboundRequestToSupplierMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<SupplierEmailDispatch>, ApiErrorResponse, string>({
    mutationFn: inboundRequestService.sendInboundRequestToSupplier,
    onSuccess: (_, inboundRequestId) => invalidate(inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

interface AcceptSupplierProposedDateVariables {
  inboundRequestId: string
  expectedVersion: string
}

export function useAcceptSupplierProposedDateMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AcceptSupplierProposedDateVariables>({
    mutationFn: ({ inboundRequestId, expectedVersion }) =>
      inboundRequestService.acceptSupplierProposedDate(inboundRequestId, {
        expectedVersion,
        selfApprovalAcknowledged: false,
      }),
    onSuccess: (_, { inboundRequestId }) => invalidate(inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

export function useSupplierResponsePreviewQuery(token: string) {
  return useQuery<SupplierInboundResponsePreview, ApiErrorResponse>({
    queryKey: queryKeys.inboundRequests.supplierResponse(token),
    queryFn: () =>
      inboundRequestService.getSupplierResponsePreview(token).then((response) => response.data),
    enabled: Boolean(token),
    retry: false,
  })
}

interface RespondAsSupplierVariables {
  token: string
  request: SupplierInboundResponseRequest
}

export function useRespondAsSupplierMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RespondAsSupplierVariables>({
    mutationFn: ({ token, request }) => inboundRequestService.respondAsSupplier(token, request),
    onSettled: (_, __, { token }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inboundRequests.supplierResponse(token),
      }),
    onError: (error) => logger.error(error),
  })
}

export function useRejectInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RejectInboundRequestVariables>({
    mutationFn: ({ inboundRequestId, reason, expectedVersion, selfApprovalAcknowledged }) =>
      inboundRequestService.rejectInboundRequest(inboundRequestId, reason, {
        expectedVersion,
        selfApprovalAcknowledged,
      }),
    onSuccess: (_, variables) => invalidate(variables.inboundRequestId),
    onError: (error) => logger.error(error),
  })
}

export function useReconcileInboundRequestMutation() {
  const invalidate = useInvalidateInboundRequests()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ReconcileInboundRequestVariables>({
    mutationFn: ({ inboundRequestId, action, reason, expectedVersion }) => {
      const request = { reason, expectedVersion, commandId: crypto.randomUUID() }
      if (action === 'withdraw')
        return inboundRequestService.withdrawInboundRequest(inboundRequestId, request)
      return action === 'cancel'
        ? inboundRequestService.cancelInboundRequest(inboundRequestId, request)
        : inboundRequestService.closeRemainingInboundQuantity(inboundRequestId, request)
    },
    onSuccess: (_, variables) => invalidate(variables.inboundRequestId),
    onError: logApiError,
  })
}
