import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatApiError, isApiErrorResponse } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { stockRecipientService } from '../services/stock-recipient.service'
import type {
  CreateStockRecipientRequest,
  ImportStockRecipientsRequest,
  StockRecipient,
  StockRecipientImportPreview,
  StockRecipientListQuery,
  StockRecipientListResponse,
  StockRecipientIssueHistoryQuery,
  StockRecipientIssueHistoryResponse,
  UpdateStockRecipientRequest,
} from '../types/stock-recipient.types'

interface UpdateStockRecipientVariables {
  stockRecipientId: string
  request: UpdateStockRecipientRequest
}

function logStockRecipientMutationError(error: unknown) {
  const message = formatApiError(error)
  if (isApiErrorResponse(error) && (error.statusCode === 400 || error.statusCode === 409)) {
    logger.warn(message)
    return
  }

  logger.error(message)
}

export function useStockRecipientsQuery(params: StockRecipientListQuery) {
  return useQuery<StockRecipientListResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockRecipients.list(params),
    queryFn: () =>
      stockRecipientService.getStockRecipients(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useNextStockRecipientCodeQuery(enabled: boolean, sessionKey?: string) {
  return useQuery<ApiResponse<string>, ApiErrorResponse>({
    queryKey: [...queryKeys.stockRecipients.nextCode, sessionKey ?? null],
    queryFn: stockRecipientService.getNextCode,
    enabled,
    staleTime: 0,
  })
}

export function useStockRecipientQuery(stockRecipientId: string) {
  return useQuery<StockRecipient, ApiErrorResponse>({
    queryKey: queryKeys.stockRecipients.detail(stockRecipientId),
    queryFn: () =>
      stockRecipientService.getStockRecipient(stockRecipientId).then((response) => response.data),
  })
}

export function useStockRecipientIssueHistoryQuery(
  stockRecipientId: string,
  params: StockRecipientIssueHistoryQuery
) {
  return useQuery<StockRecipientIssueHistoryResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockRecipients.issueHistory(stockRecipientId, params),
    queryFn: () =>
      stockRecipientService
        .getIssueHistory(stockRecipientId, params)
        .then((response) => response.data),
  })
}

export function useCreateStockRecipientMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateStockRecipientRequest>({
    mutationFn: stockRecipientService.createStockRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockRecipients.all }),
    onError: logStockRecipientMutationError,
  })
}

export function useImportStockRecipientsMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ImportStockRecipientsRequest>({
    mutationFn: stockRecipientService.importStockRecipients,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockRecipients.all }),
    onError: logStockRecipientMutationError,
  })
}

export function useInspectStockRecipientImportMutation() {
  return useMutation({
    mutationFn: stockRecipientService.inspectImport,
    retry: false,
  })
}

export function usePreviewStockRecipientImportMutation() {
  return useMutation<
    ApiResponse<StockRecipientImportPreview>,
    ApiErrorResponse,
    Parameters<typeof stockRecipientService.previewImport>[0]
  >({
    mutationFn: stockRecipientService.previewImport,
    retry: false,
    onError: logStockRecipientMutationError,
  })
}

export function useStockRecipientImportTemplateMutation() {
  return useMutation<void, ApiErrorResponse, void>({
    mutationFn: stockRecipientService.downloadImportTemplate,
    onError: logStockRecipientMutationError,
  })
}

export function useUpdateStockRecipientMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateStockRecipientVariables>({
    mutationFn: ({ stockRecipientId, request }) =>
      stockRecipientService.updateStockRecipient(stockRecipientId, request),
    onSuccess: (_, { stockRecipientId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockRecipients.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stockRecipients.detail(stockRecipientId),
        }),
      ]),
    onError: logStockRecipientMutationError,
  })
}

export function useChangeStockRecipientStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { stockRecipientId: string; status: 'Active' | 'Inactive' }
  >({
    mutationFn: ({ stockRecipientId, status }) =>
      stockRecipientService.changeStatus(stockRecipientId, status),
    onSuccess: (_, { stockRecipientId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockRecipients.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stockRecipients.detail(stockRecipientId),
        }),
      ]),
    onError: logStockRecipientMutationError,
  })
}
