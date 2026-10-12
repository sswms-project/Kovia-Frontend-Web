import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { logTransferError } from '../utils/transfer-errors'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse, QueryResult } from '@/types/api'
import type { WarehouseResponse } from '@/types/warehouse'
import { transferService } from '../services/transfer.service'
import type {
  AddTransferFeedbackRequest,
  CancelTransferRequest,
  ReplyTransferFeedbackRequest,
  SaveTransferDraftRequest,
  SubmitTransferRequest,
  TransferAvailability,
  TransferAvailabilityQuery,
  TransferReceivableSlotOption,
  TransferReceivableSlotsQuery,
  TransferSourceLocation,
  TransferSourceLocationsQuery,
  TransferSourceProduct,
  TransferSourceProductsQuery,
  TransferDetail,
  TransferListQuery,
  TransferListResponse,
  TransferRequesterOption,
  TransferSourceWarehouseQuery,
  UpdateTransferRequest,
} from '../types/transfer.types'

/** Khóa chung của mọi lệnh ghi điều chuyển để nhận biết tín hiệu realtime dội lại từ chính trình duyệt này. */
export const TRANSFER_MUTATION_KEY = ['transfers', 'write'] as const

/** Mọi thao tác trên phiếu có thể đổi tồn kho, giữ chỗ và công việc được giao. */
export function invalidateTransferQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
  ])
}

export function useTransfersQuery(params: TransferListQuery, enabled = true) {
  return useQuery<TransferListResponse, ApiErrorResponse>({
    queryKey: queryKeys.transfers.list(params),
    queryFn: () => transferService.getTransfers(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useTransferQuery(transferId: string | null) {
  return useQuery<TransferDetail, ApiErrorResponse>({
    queryKey: queryKeys.transfers.detail(transferId ?? ''),
    queryFn: () => transferService.getTransfer(transferId ?? '').then((response) => response.data),
    enabled: Boolean(transferId),
  })
}

/** Gợi ý mã phiếu kế tiếp; sessionKey đổi thì lấy lại (mỗi lần mở form tạo mới). */
export function useNextTransferCodeQuery(enabled: boolean, sessionKey: string) {
  return useQuery<string, ApiErrorResponse>({
    queryKey: [...queryKeys.transfers.nextCode, sessionKey],
    queryFn: () => transferService.getNextCode().then((response) => response.data),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useTransferRequesterOptionsQuery(enabled = true) {
  return useQuery<TransferRequesterOption[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.requesterOptions,
    queryFn: () => transferService.getRequesterOptions().then((response) => response.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTransferSourceWarehousesQuery(
  params: TransferSourceWarehouseQuery,
  enabled = true
) {
  return useQuery<QueryResult<WarehouseResponse>, ApiErrorResponse>({
    queryKey: queryKeys.transfers.sourceWarehouses(params),
    queryFn: () => transferService.getSourceWarehouses(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useTransferReceivableSlotsQuery(
  query: TransferReceivableSlotsQuery,
  enabled = true
) {
  return useQuery<TransferReceivableSlotOption[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.receivableSlots(query),
    queryFn: () => transferService.getReceivableSlots(query).then((response) => response.data),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useTransferSourceLocationsQuery(
  query: TransferSourceLocationsQuery,
  enabled = true
) {
  return useQuery<TransferSourceLocation[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.sourceLocations(query),
    queryFn: () => transferService.getSourceLocations(query).then((response) => response.data),
    enabled,
  })
}

export function useTransferSourceProductsQuery(query: TransferSourceProductsQuery, enabled = true) {
  return useQuery<TransferSourceProduct[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.sourceProducts(query),
    queryFn: () => transferService.getSourceProducts(query).then((response) => response.data),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useTransferAvailabilityQuery(query: TransferAvailabilityQuery, enabled = true) {
  return useQuery<TransferAvailability[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.availability(query),
    queryFn: () => transferService.getAvailability(query).then((response) => response.data),
    enabled: enabled && query.productIds.length > 0,
    placeholderData: (previousData) => previousData,
  })
}

interface SaveDraftVariables {
  transferId: string | null
  request: SaveTransferDraftRequest
}

interface SubmitDraftVariables {
  transferId: string
  request: SubmitTransferRequest
}

interface UpdateTransferVariables {
  transferId: string
  request: UpdateTransferRequest
}

interface CancelTransferVariables {
  transferId: string
  request: CancelTransferRequest
}

interface AddFeedbackVariables {
  transferId: string
  request: AddTransferFeedbackRequest
}

interface ReplyFeedbackVariables {
  transferId: string
  feedbackId: string
  request: ReplyTransferFeedbackRequest
}

export function useSaveTransferDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, SaveDraftVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) =>
      transferId
        ? transferService.updateDraft(transferId, request)
        : transferService.createDraft(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all }),
    onError: (error) => logTransferError(error),
  })
}

export function useSubmitTransferDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, SubmitDraftVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.submitDraft(transferId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useUpdateTransferMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateTransferVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.updateTransfer(transferId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useCancelTransferMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, CancelTransferVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.cancelTransfer(transferId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useStopTransferRemainingMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, CancelTransferVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.stopRemaining(transferId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useAddTransferFeedbackMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, AddFeedbackVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.addFeedback(transferId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all }),
    onError: (error) => logTransferError(error),
  })
}

export function useReplyTransferFeedbackMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ReplyFeedbackVariables>({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, feedbackId, request }) =>
      transferService.replyFeedback(transferId, feedbackId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all }),
    onError: (error) => logTransferError(error),
  })
}
