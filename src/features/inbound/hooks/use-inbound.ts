import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { formatApiError, isApiErrorResponse } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { inboundService } from '../services/inbound.service'
import type { InventoryEvidence } from '@/features/inventory/types/inventory.types'
import type {
  AssignableWarehouseStaff,
  AssignWarehouseTaskRequest,
  UnassignReceivingTaskRequest,
  InboundAllowedActionsResponse,
  InboundDocumentImport,
  InboundListQuery,
  GoodsReceiptDetail,
  GoodsReceiptListResponse,
  PutawayRequest,
  PutAwayDeviationReport,
  PutAwayDeviationReportQuery,
  PutAwayHeldSlot,
  PutAwaySuggestionsResponse,
  PutawayTaskQuery,
  SavePutAwayPlanRequest,
  ReceivingTaskListResponse,
  ReceivingTaskQuery,
  SaveGoodsReceiptRequest,
  StartInboundDocumentImportRequest,
  ReviewInboundDocumentImportRequest,
  CancelPutawayTaskRequest,
  ReconcilePutawayCancellationRequest,
} from '../types/inbound.types'

interface UpdateReceiptVariables {
  receiptId: string
  request: Omit<SaveGoodsReceiptRequest, 'inboundRequestId'>
}

interface RejectReceiptVariables {
  receiptId: string
  reason: string
}

interface ConfirmPhysicalArrivalVariables {
  receiptId: string
  expectedVersion: string
  selfApprovalAcknowledged: boolean
}

interface SubmitGoodsReceiptVariables {
  receiptId: string
  expectedVersion: string
}

interface PutawayVariables {
  receiptId: string
  request: PutawayRequest
}

interface CancelPutawayTaskVariables {
  receiptId: string
  request: CancelPutawayTaskRequest
}

interface UnassignReceivingTaskVariables {
  inboundRequestId: string
  request: UnassignReceivingTaskRequest
}

interface AssignReceivingTaskVariables {
  inboundRequestId: string
  request: AssignWarehouseTaskRequest
}

interface AssignPutawayTaskVariables {
  receiptId: string
  request: AssignWarehouseTaskRequest
}

interface ReconcilePutawayCancellationVariables {
  receiptId: string
  request: ReconcilePutawayCancellationRequest
}

export function useReceivingTasksQuery(params: ReceivingTaskQuery) {
  return useQuery<ReceivingTaskListResponse, ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.receivingTasks(params),
    queryFn: () => inboundService.getReceivingTasks(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useGoodsReceiptsQuery(params: InboundListQuery) {
  return useQuery<GoodsReceiptListResponse, ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.list(params),
    queryFn: () => inboundService.getReceipts(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function usePutawayTasksQuery(params: PutawayTaskQuery) {
  return useQuery<GoodsReceiptListResponse, ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.putawayTasks(params),
    queryFn: () => inboundService.getPutawayTasks(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useAssignableStaffQuery(warehouseId: string | null) {
  return useQuery<AssignableWarehouseStaff[], ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.assignableStaff(warehouseId ?? ''),
    queryFn: () =>
      inboundService.getAssignableStaff(warehouseId ?? '').then((response) => response.data),
    enabled: Boolean(warehouseId),
  })
}

const NULL_GUID = '00000000-0000-0000-0000-000000000000'

export function useGoodsReceiptQuery(receiptId: string) {
  return useQuery<GoodsReceiptDetail, ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.detail(receiptId),
    queryFn: () => inboundService.getReceipt(receiptId).then((response) => response.data),
    enabled: Boolean(receiptId) && receiptId !== NULL_GUID,
  })
}

/** Vị trí đang chừa cho hàng sắp về trong kho của phiếu; chỉ để cảnh báo, không chặn. */
export function usePutawayHeldSlotsQuery(receiptId: string, enabled = true) {
  return useQuery<PutAwayHeldSlot[], ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.putawayHeldSlots(receiptId),
    queryFn: () => inboundService.getPutawayHeldSlots(receiptId).then((response) => response.data),
    enabled: enabled && Boolean(receiptId) && receiptId !== NULL_GUID,
  })
}

/** Ảnh minh họa khi cất khác khuyến nghị; dùng quyền cất hàng, không cần quyền xem tồn kho. */
export function useUploadPutawayEvidenceMutation() {
  return useMutation<
    ApiResponse<InventoryEvidence>,
    ApiErrorResponse,
    { warehouseId: string; file: File }
  >({
    mutationFn: ({ warehouseId, file }) => inboundService.uploadPutawayEvidence(warehouseId, file),
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function usePutawayDeviationReportQuery(
  params: PutAwayDeviationReportQuery,
  enabled: boolean
) {
  return useQuery<PutAwayDeviationReport, ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.putawayDeviationReport(params),
    queryFn: () =>
      inboundService.getPutawayDeviationReport(params).then((response) => response.data),
    enabled,
  })
}

export function useInboundDocumentImportQuery(importId: string) {
  return useQuery<InboundDocumentImport, ApiErrorResponse>({
    queryKey: queryKeys.inboundDocumentImports.detail(importId),
    queryFn: () => inboundService.getDocumentImport(importId).then((response) => response.data),
    enabled: Boolean(importId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'Pending' ||
        status === 'Uploaded' ||
        status === 'Scanning' ||
        status === 'Processing'
        ? 1_500
        : false
    },
  })
}

export function useInboundAllowedActionsQuery(receiptId: string) {
  return useQuery<InboundAllowedActionsResponse, ApiErrorResponse>({
    queryKey: queryKeys.goodsReceipts.allowedActions(receiptId),
    queryFn: () => inboundService.getAllowedActions(receiptId).then((response) => response.data),
    enabled: Boolean(receiptId) && receiptId !== NULL_GUID,
  })
}

function useInvalidateInbound() {
  const queryClient = useQueryClient()
  return async (receiptId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsReceipts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inboundRequests.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ...(receiptId
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.goodsReceipts.detail(receiptId),
            }),
          ]
        : []),
    ])
  }
}

export function useNextGoodsReceiptCodeQuery(enabled: boolean, sessionKey?: string) {
  return useQuery({
    queryKey: [...queryKeys.goodsReceipts.nextCode, sessionKey ?? null],
    queryFn: () => inboundService.getNextReceiptCode().then((response) => response.data),
    enabled,
    staleTime: 0,
  })
}

export function useCreateGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<string>, ApiErrorResponse, SaveGoodsReceiptRequest>({
    mutationFn: inboundService.createReceipt,
    onSuccess: () => invalidate(),
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function useStartInboundDocumentImportMutation() {
  return useMutation<ApiResponse<string>, ApiErrorResponse, StartInboundDocumentImportRequest>({
    mutationFn: inboundService.startDocumentImport,
    onError: (error) => logger.error(error),
  })
}

export function useReviewInboundDocumentImportMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ReviewInboundDocumentImportRequest>({
    mutationFn: inboundService.reviewDocumentImport,
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inboundDocumentImports.detail(variables.id),
      }),
    onError: (error) => logger.error(error),
  })
}

export function useCreateDraftFromDocumentMutation() {
  const invalidateInbound = useInvalidateInbound()
  return useMutation<ApiResponse<string>, ApiErrorResponse, string>({
    mutationFn: inboundService.createDraftFromDocument,
    onSuccess: () => invalidateInbound(),
    onError: (error) => logger.error(error),
  })
}

export function useUpdateGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateReceiptVariables>({
    mutationFn: ({ receiptId, request }) => inboundService.updateReceipt(receiptId, request),
    onSuccess: (_, variables) => invalidate(variables.receiptId),
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function useSubmitGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, SubmitGoodsReceiptVariables>({
    mutationFn: ({ receiptId, expectedVersion }) =>
      inboundService.submitReceipt(receiptId, {
        expectedVersion,
        commandId: crypto.randomUUID(),
      }),
    onSuccess: (_, variables) => invalidate(variables.receiptId),
  })
}

export function useApproveGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ConfirmPhysicalArrivalVariables>({
    mutationFn: ({ receiptId, expectedVersion, selfApprovalAcknowledged }) =>
      inboundService.approveReceipt(receiptId, {
        expectedVersion,
        commandId: crypto.randomUUID(),
        selfApprovalAcknowledged,
      }),
    onSuccess: (_, variables) => invalidate(variables.receiptId),
    onError: (error) => logger.error(error),
  })
}

export function useRejectGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RejectReceiptVariables>({
    mutationFn: ({ receiptId, reason }) => inboundService.rejectReceipt(receiptId, reason),
    onSuccess: (_, variables) => invalidate(variables.receiptId),
    onError: (error) => logger.error(error),
  })
}

export function useSavePutawayPlanMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { receiptId: string; request: SavePutAwayPlanRequest }
  >({
    mutationFn: ({ receiptId, request }) => inboundService.savePutawayPlan(receiptId, request),
    onSuccess: (_, variables) => invalidate(variables.receiptId),
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function usePutawaySuggestionsMutation() {
  return useMutation<ApiResponse<PutAwaySuggestionsResponse>, ApiErrorResponse, string>({
    mutationFn: inboundService.suggestPutawaySlots,
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function usePutawayFormSuggestionsMutation() {
  return useMutation<ApiResponse<PutAwaySuggestionsResponse>, ApiErrorResponse, string>({
    mutationFn: inboundService.suggestPutawaySlotsForPutaway,
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function usePutawayMutation() {
  const invalidate = useInvalidateInbound()
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, PutawayVariables>({
    mutationFn: ({ receiptId, request }) => inboundService.putaway(receiptId, request),
    onSuccess: async (_, variables) => {
      const warehouseId = queryClient.getQueryData<GoodsReceiptDetail>(
        queryKeys.goodsReceipts.detail(variables.receiptId)
      )?.warehouseId
      await Promise.all([
        invalidate(variables.receiptId),
        queryClient.invalidateQueries({
          queryKey: warehouseId
            ? queryKeys.warehouses.detail(warehouseId)
            : queryKeys.warehouses.all,
        }),
      ])
    },
    onError: (error) => {
      if (isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500)
        logger.warn(formatApiError(error))
      else logger.error(formatApiError(error))
    },
  })
}

export function useCancelPutawayTaskMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, CancelPutawayTaskVariables>({
    mutationFn: ({ receiptId, request }) => inboundService.cancelPutawayTask(receiptId, request),
    onSuccess: (_, variables) => invalidate(variables.receiptId),
    onError: (error) => logger.error(error),
  })
}

export function useReconcilePutawayCancellationMutation() {
  const invalidate = useInvalidateInbound()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ReconcilePutawayCancellationVariables>(
    {
      mutationFn: ({ receiptId, request }) =>
        inboundService.reconcilePutawayCancellation(receiptId, request),
      onSuccess: (_, variables) => invalidate(variables.receiptId),
      onError: (error) => logger.error(error),
    }
  )
}

function useInvalidateAssignments() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.goodsReceipts.all }),
      queryClient.invalidateQueries({ queryKey: ['my-warehouse-tasks'] }),
    ])
}

export function useAssignReceivingTaskMutation() {
  const invalidate = useInvalidateAssignments()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AssignReceivingTaskVariables>({
    mutationFn: ({ inboundRequestId, request }) =>
      inboundService.assignReceivingTask(inboundRequestId, request),
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useUnassignReceivingTaskMutation() {
  const invalidate = useInvalidateAssignments()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UnassignReceivingTaskVariables>({
    mutationFn: ({ inboundRequestId, request }) =>
      inboundService.unassignReceivingTask(inboundRequestId, request),
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useAssignPutawayTaskMutation() {
  const invalidate = useInvalidateAssignments()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AssignPutawayTaskVariables>({
    mutationFn: ({ receiptId, request }) => inboundService.assignPutawayTask(receiptId, request),
    onSuccess: () => invalidate(),
    onError: (error) => logger.error(error),
  })
}
