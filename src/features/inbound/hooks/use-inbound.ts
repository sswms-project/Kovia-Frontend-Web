import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type { CreateReceiptInput, UpdateReceiptInput } from '../types/receipt-commands.types'
import { receiptCommandId, type ReceiptCommandSnapshot } from '../utils/receipt-command-id'
import type { LegacyReceiptStockRequest } from '../schemas/legacy-receipt-stock.schema'
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
  StartInboundDocumentImportRequest,
  ReviewInboundDocumentImportRequest,
  CancelPutawayTaskRequest,
  ReconcilePutawayCancellationRequest,
} from '../types/inbound.types'

interface UpdateReceiptVariables {
  receiptId: string
  request: UpdateReceiptInput
}

interface RejectReceiptVariables {
  receiptId: string
  reason: string
  expectedVersion: string
}

interface ConfirmPhysicalArrivalVariables {
  keepAtReceiving?: boolean
  receiptId: string
  expectedVersion: string
  selfApprovalAcknowledged: boolean
}

interface SubmitGoodsReceiptVariables {
  receiptId: string
  expectedVersion: string
  receivingSlotId?: string | null
  refusedGoodsHandedBack?: boolean
  refusalEvidenceIds?: string[]
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
  return async (receiptId?: string, affectsStock = true) => {
    const affected = (key: readonly unknown[]) => {
      if (key[0] === 'goods-receipts')
        return key[1] !== 'next-code' && key[1] !== 'assignable-staff'
      if (key[0] === 'inbound-requests') return key[1] !== 'next-code'
      return key[0] === 'my-warehouse-tasks' || (affectsStock && key[0] === 'inventory')
    }
    const critical = (key: readonly unknown[]) =>
      Boolean(receiptId) &&
      key[0] === 'goods-receipts' &&
      key[1] === 'detail' &&
      key[2] === receiptId &&
      (key.length === 3 || (key.length === 4 && key[3] === 'allowed-actions'))

    // Invalidate once; broad + detail invalidation cancels and restarts the same active request.
    await queryClient.invalidateQueries({
      predicate: (query) => affected(query.queryKey),
      refetchType: 'none',
    })
    void queryClient
      .refetchQueries(
        {
          predicate: (query) => affected(query.queryKey) && !critical(query.queryKey),
          type: 'active',
        },
        { throwOnError: true }
      )
      .catch((error: unknown) => logger.warn(getRefreshError(error)))
    try {
      // Keep version/actions fresh before another write, without waiting for unrelated lists.
      await queryClient.refetchQueries(
        {
          predicate: (query) => critical(query.queryKey),
          type: 'active',
        },
        { throwOnError: true }
      )
    } catch (error) {
      // The write already succeeded. Query error state prevents editing until a successful retry.
      logger.warn(getRefreshError(error))
    }
  }
}

function getRefreshError(error: unknown) {
  return isApiErrorResponse(error)
    ? formatApiError(error)
    : 'Không thể tải lại dữ liệu sau khi lưu.'
}

export function useNextGoodsReceiptCodeQuery(enabled: boolean, sessionKey?: string) {
  return useQuery({
    queryKey: [...queryKeys.goodsReceipts.nextCode, sessionKey ?? null],
    queryFn: () => inboundService.getNextReceiptCode().then((response) => response.data),
    enabled,
    staleTime: 0,
  })
}

export function useCreateGoodsReceiptMutation(deferRefresh = false) {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  const mutation = useMutation<
    ApiResponse<string> & { version?: string },
    ApiErrorResponse,
    CreateReceiptInput
  >({
    retry: false,
    mutationFn: (request) => {
      command.current = receiptCommandId(command.current, request)
      return inboundService.createReceipt({ ...request, commandId: command.current.commandId })
    },
    onSuccess: () => (deferRefresh ? undefined : invalidate(undefined, false)),
    onError: (error) => logger.warn(formatApiError(error)),
  })
  return { ...mutation, refresh: () => invalidate(undefined, false) }
}

export function useReconcileLegacyReceiptStockMutation() {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  return useMutation({
    retry: false,
    mutationFn: ({
      receiptId,
      request,
    }: {
      receiptId: string
      request: Omit<LegacyReceiptStockRequest, 'commandId'>
    }) => {
      command.current = receiptCommandId(command.current, { receiptId, ...request })
      return inboundService.reconcileArrivalStock(receiptId, {
        ...request,
        commandId: command.current.commandId,
      })
    },
    onSuccess: (_, variables) => invalidate(variables.receiptId),
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
    onSuccess: () => invalidateInbound(undefined, false),
    onError: (error) => logger.error(error),
  })
}

export function useUpdateGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateReceiptVariables>({
    retry: false,
    mutationFn: ({ receiptId, request }) => {
      command.current = receiptCommandId(command.current, { receiptId, ...request })
      return inboundService.updateReceipt(receiptId, {
        ...request,
        commandId: command.current.commandId,
      })
    },
    onSuccess: (_, variables) => invalidate(variables.receiptId, false),
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function useSubmitGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, SubmitGoodsReceiptVariables>({
    retry: false,
    mutationFn: ({
      receiptId,
      expectedVersion,
      receivingSlotId,
      refusedGoodsHandedBack,
      refusalEvidenceIds,
    }) => {
      command.current = receiptCommandId(command.current, {
        receiptId,
        expectedVersion,
        receivingSlotId,
        refusedGoodsHandedBack,
        refusalEvidenceIds,
      })
      return inboundService.submitReceipt(receiptId, {
        expectedVersion,
        receivingSlotId,
        refusedGoodsHandedBack,
        refusalEvidenceIds,
        commandId: command.current.commandId,
      })
    },
    onSuccess: (_, variables) => invalidate(variables.receiptId),
  })
}

export function useApproveGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ConfirmPhysicalArrivalVariables>({
    retry: false,
    mutationFn: ({ receiptId, expectedVersion, selfApprovalAcknowledged, keepAtReceiving }) => {
      command.current = receiptCommandId(command.current, {
        receiptId,
        expectedVersion,
        selfApprovalAcknowledged,
        keepAtReceiving,
      })
      return inboundService.approveReceipt(receiptId, {
        expectedVersion,
        commandId: command.current.commandId,
        selfApprovalAcknowledged,
        keepAtReceiving,
      })
    },
    onSuccess: (_, variables) => invalidate(variables.receiptId),
    onError: (error) => logger.error(error),
  })
}

export function useIsolateReceiptDamageMutation() {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    {
      receiptId: string
      request: Omit<Parameters<typeof inboundService.isolateDamage>[1], 'commandId'>
    }
  >({
    retry: false,
    mutationFn: ({ receiptId, request }) => {
      command.current = receiptCommandId(command.current, { receiptId, ...request })
      return inboundService.isolateDamage(receiptId, {
        ...request,
        commandId: command.current.commandId,
      })
    },
    onSuccess: (_, variables) => invalidate(variables.receiptId),
  })
}

export function useRejectGoodsReceiptMutation() {
  const invalidate = useInvalidateInbound()
  const command = useRef<ReceiptCommandSnapshot | null>(null)
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, RejectReceiptVariables>({
    retry: false,
    mutationFn: ({ receiptId, reason, expectedVersion }) => {
      const request = { reason, expectedVersion }
      command.current = receiptCommandId(command.current, { receiptId, ...request })
      return inboundService.rejectReceipt(receiptId, {
        ...request,
        commandId: command.current.commandId,
      })
    },
    onSuccess: (_, variables) => invalidate(variables.receiptId, false),
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
    onSuccess: (_, variables) => invalidate(variables.receiptId, false),
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

export function usePutawayMutation(onCommitted?: (receiptId: string) => void) {
  const invalidate = useInvalidateInbound()
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, PutawayVariables>({
    mutationFn: ({ receiptId, request }) => inboundService.putaway(receiptId, request),
    onSuccess: async (_, variables) => {
      onCommitted?.(variables.receiptId)
      const warehouseId = queryClient.getQueryData<GoodsReceiptDetail>(
        queryKeys.goodsReceipts.detail(variables.receiptId)
      )?.warehouseId
      void queryClient
        .invalidateQueries(
          {
            queryKey: warehouseId
              ? queryKeys.warehouses.detail(warehouseId)
              : queryKeys.warehouses.all,
          },
          { throwOnError: true }
        )
        .catch((error: unknown) => logger.warn(getRefreshError(error)))
      await invalidate(variables.receiptId)
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
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AssignReceivingTaskVariables>({
    mutationFn: ({ inboundRequestId, request }) =>
      inboundService.assignReceivingTask(inboundRequestId, request),
    onSuccess: (_, variables) =>
      Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.inboundRequests.detail(variables.inboundRequestId),
        }),
      ]),
    onError: (error) => {
      if (isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500)
        logger.warn(formatApiError(error))
      else logger.error(formatApiError(error))
    },
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
