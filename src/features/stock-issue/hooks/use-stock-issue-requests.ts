import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { stockIssueService } from '../services/stock-issue.service'
import type { AuditLogListResponse } from '@/features/platform-services/types/platform-services.types'
import type {
  AssignStockIssuePickerRequest,
  CancelStockIssueRequestRequest,
  StockIssueAuditLogQuery,
  CreateStockIssueRequestRequest,
  StockIssueImportPreview,
  RecordStockPickingRequest,
  ReportStockIssuePickIssueRequest,
  StockIssueRequestListQuery,
  StockIssueRequestListResponse,
  StockIssueRequestSummary,
  CreateGoodsReturnRequestRequest,
  RejectGoodsReturnRequestRequest,
  GoodsReturnRequestListQuery,
  GoodsReturnRequestListResponse,
  GoodsReturnRequestSummary,
  ReleaseStockIssueRequestRequest,
  RestockGoodsReturnRequest,
} from '../types/stock-issue.types'
import type {
  StockRecipientListQuery,
  StockRecipientListResponse,
} from '@/features/stock-recipient/types/stock-recipient.types'
import { stockRecipientService } from '@/features/stock-recipient/services/stock-recipient.service'

interface ConfirmStockDispatchVariables {
  stockIssueRequestId: string
  scannedBarcodes: string[]
}

interface RecordStockPickingVariables {
  stockIssueRequestId: string
  request: RecordStockPickingRequest
}

interface CreateGoodsReturnRequestVariables {
  stockIssueRequestId: string
  request: CreateGoodsReturnRequestRequest
}

interface RemovePickDetailVariables {
  stockIssueRequestId: string
  pickDetailId: string
}

interface RejectGoodsReturnRequestVariables {
  goodsReturnRequestId: string
  request: RejectGoodsReturnRequestRequest
}

interface RestockGoodsReturnRequestVariables {
  goodsReturnRequestId: string
  request: RestockGoodsReturnRequest
}

export function useStockIssueRequestsQuery(params: StockIssueRequestListQuery, enabled = true) {
  return useQuery<StockIssueRequestListResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockIssueRequests.list(params),
    queryFn: () =>
      stockIssueService.getStockIssueRequests(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useStockIssueRequestQuery(stockIssueRequestId: string | null) {
  return useQuery<StockIssueRequestSummary, ApiErrorResponse>({
    queryKey: queryKeys.stockIssueRequests.detail(stockIssueRequestId ?? ''),
    queryFn: () =>
      stockIssueService
        .getStockIssueRequest(stockIssueRequestId ?? '')
        .then((response) => response.data),
    enabled: Boolean(stockIssueRequestId),
  })
}

export function useStockIssueImportPreviewMutation() {
  return useMutation<ApiResponse<StockIssueImportPreview>, ApiErrorResponse, File>({
    mutationFn: stockIssueService.previewImport,
    onError: (error) => logger.error(error),
  })
}

export function useCreateStockIssueRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateStockIssueRequestRequest>({
    mutationFn: stockIssueService.createStockIssueRequest,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockRecipients.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useRecordStockPickingMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RecordStockPickingVariables>({
    mutationFn: ({ stockIssueRequestId, request }) =>
      stockIssueService.recordStockPicking(stockIssueRequestId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
    onError: (error) => logger.error(error),
  })
}

export function useReleaseStockIssueRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ReleaseStockIssueRequestRequest>({
    mutationFn: stockIssueService.releaseForPicking,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useAssignStockIssuePickerMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AssignStockIssuePickerRequest>({
    mutationFn: stockIssueService.assignPicker,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
    onError: (error) => logger.error(error),
  })
}

export function useUploadStockIssueAttachmentMutation(stockIssueRequestId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, File>({
    mutationFn: (file) => stockIssueService.uploadAttachment(stockIssueRequestId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
    onError: (error) => logger.error(error),
  })
}

export function useDeleteStockIssueAttachmentMutation(stockIssueRequestId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: (attachmentId) =>
      stockIssueService.deleteAttachment(stockIssueRequestId, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
    onError: (error) => logger.error(error),
  })
}

export function useCancelStockIssueRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, CancelStockIssueRequestRequest>({
    mutationFn: stockIssueService.cancelStockIssueRequest,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useStockIssueRequestAuditLogsQuery(
  stockIssueRequestId: string | null,
  params: StockIssueAuditLogQuery
) {
  return useQuery<ApiResponse<AuditLogListResponse>, ApiErrorResponse>({
    queryKey: queryKeys.stockIssueRequests.auditLogs(stockIssueRequestId ?? '', params),
    queryFn: () => stockIssueService.getStockIssueRequestAuditLogs(stockIssueRequestId!, params),
    enabled: Boolean(stockIssueRequestId),
  })
}

export function useRemovePickDetailMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RemovePickDetailVariables>({
    mutationFn: ({ stockIssueRequestId, pickDetailId }) =>
      stockIssueService.removePickDetail(stockIssueRequestId, pickDetailId),
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.stockIssueRequests.detail(variables.stockIssueRequestId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useConfirmStockDispatchMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ConfirmStockDispatchVariables>({
    mutationFn: ({ stockIssueRequestId, scannedBarcodes }) =>
      stockIssueService.confirmDispatch(stockIssueRequestId, { scannedBarcodes }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useAuthorizeStockDispatchMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, string>({
    mutationFn: stockIssueService.authorizeDispatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
    onError: (error) => logger.error(error),
  })
}

export function useCreateGoodsReturnRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateGoodsReturnRequestVariables>({
    mutationFn: ({ stockIssueRequestId, request }) =>
      stockIssueService.createGoodsReturnRequest(stockIssueRequestId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goodsReturnRequests.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all })
    },
    onError: (error) => logger.error(error),
  })
}

export function useGoodsReturnRequestsQuery(params: GoodsReturnRequestListQuery, enabled = true) {
  return useQuery<GoodsReturnRequestListResponse, ApiErrorResponse>({
    queryKey: queryKeys.goodsReturnRequests.list(params),
    queryFn: () =>
      stockIssueService.getGoodsReturnRequests(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useGoodsReturnRequestQuery(goodsReturnRequestId: string | null) {
  return useQuery<GoodsReturnRequestSummary, ApiErrorResponse>({
    queryKey: queryKeys.goodsReturnRequests.detail(goodsReturnRequestId ?? ''),
    queryFn: () =>
      stockIssueService
        .getGoodsReturnRequest(goodsReturnRequestId ?? '')
        .then((response) => response.data),
    enabled: Boolean(goodsReturnRequestId),
  })
}

export function useApproveGoodsReturnRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, string>({
    mutationFn: stockIssueService.approveGoodsReturnRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goodsReturnRequests.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all })
    },
    onError: (error) => logger.error(error),
  })
}

export function useRejectGoodsReturnRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RejectGoodsReturnRequestVariables>({
    mutationFn: ({ goodsReturnRequestId, request }) =>
      stockIssueService.rejectGoodsReturnRequest(goodsReturnRequestId, request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.goodsReturnRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useRestockGoodsReturnRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RestockGoodsReturnRequestVariables>({
    mutationFn: ({ goodsReturnRequestId, request }) =>
      stockIssueService.restockGoodsReturnRequest(goodsReturnRequestId, request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.goodsReturnRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
      ]),
    onError: (error) => logger.error(error),
  })
}

export function useStockRecipientOptionsQuery(params: StockRecipientListQuery, enabled = true) {
  return useQuery<StockRecipientListResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockRecipients.list(params),
    queryFn: () =>
      stockRecipientService.getStockRecipients(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useReportStockIssuePickIssueMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ReportStockIssuePickIssueRequest>({
    mutationFn: stockIssueService.reportPickIssue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockIssueRequests.all }),
    onError: (error) => logger.error(error),
  })
}
