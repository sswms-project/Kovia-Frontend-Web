import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { supplierReturnService } from '../services/supplier-return.service'
import type {
  ConfirmSupplierReturnDeliveryRequest,
  CreateSupplierReturnRequest,
  SupplierReturn,
  SupplierReturnListQuery,
  SupplierReturnListResponse,
  SupplierReturnReasonRequest,
} from '../types/supplier-return.types'

export function useSupplierReturnsQuery(params: SupplierReturnListQuery, enabled = true) {
  return useQuery<SupplierReturnListResponse, ApiErrorResponse>({
    queryKey: queryKeys.supplierReturns.list(params),
    queryFn: () =>
      supplierReturnService.getSupplierReturns(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useSupplierReturnSourcesQuery(
  params: Parameters<typeof supplierReturnService.getSourceReceipts>[0],
  enabled: boolean
) {
  return useQuery({
    queryKey: [...queryKeys.supplierReturns.all, 'source-receipts', params],
    queryFn: () =>
      supplierReturnService.getSourceReceipts(params).then((response) => response.data),
    enabled: enabled && Boolean(params.warehouseId && params.supplierId),
    retry: false,
  })
}

export function useSupplierReturnSourceStocksQuery(
  params: Parameters<typeof supplierReturnService.getSourceStocks>[0],
  enabled: boolean
) {
  return useQuery({
    queryKey: [...queryKeys.supplierReturns.all, 'source-stocks', params],
    queryFn: () => supplierReturnService.getSourceStocks(params).then((response) => response.data),
    enabled:
      enabled && Boolean(params.warehouseId && params.supplierId && params.sourceGoodsReceiptId),
    retry: false,
  })
}

export function useSupplierReturnQuery(supplierReturnId: string | null) {
  return useQuery<SupplierReturn, ApiErrorResponse>({
    queryKey: queryKeys.supplierReturns.detail(supplierReturnId ?? ''),
    queryFn: () =>
      supplierReturnService
        .getSupplierReturn(supplierReturnId ?? '')
        .then((response) => response.data),
    enabled: Boolean(supplierReturnId),
  })
}

// Reservations and stock change with every state transition, so inventory is refreshed too.
// The inventory prefix also covers damage cases (['inventory', 'damage-cases', …]) linked to a return.
function useInvalidateAfterTransition() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.supplierReturns.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.returnWork.all }),
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    ])
}

export function useCreateSupplierReturnMutation() {
  const invalidate = useInvalidateAfterTransition()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateSupplierReturnRequest>({
    mutationFn: supplierReturnService.createSupplierReturn,
    onSuccess: invalidate,
    onError: (error) => logger.error(error),
  })
}

export function useApproveSupplierReturnMutation() {
  const invalidate = useInvalidateAfterTransition()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { supplierReturnId: string; selfApprovalAcknowledged: boolean; expectedVersion?: string | null }
  >({
    mutationFn: ({ supplierReturnId, selfApprovalAcknowledged, expectedVersion }) =>
      supplierReturnService.approveSupplierReturn(
        supplierReturnId,
        selfApprovalAcknowledged,
        expectedVersion
      ),
    onSuccess: invalidate,
    onError: (error) => logger.error(error),
  })
}

interface SupplierReturnReasonVariables {
  readonly supplierReturnId: string
  readonly request: SupplierReturnReasonRequest
}

export function useRejectSupplierReturnMutation() {
  const invalidate = useInvalidateAfterTransition()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, SupplierReturnReasonVariables>({
    mutationFn: ({ supplierReturnId, request }) =>
      supplierReturnService.rejectSupplierReturn(supplierReturnId, request),
    onSuccess: invalidate,
    onError: (error) => logger.error(error),
  })
}

export function useCancelSupplierReturnMutation() {
  const invalidate = useInvalidateAfterTransition()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, SupplierReturnReasonVariables>({
    mutationFn: ({ supplierReturnId, request }) =>
      supplierReturnService.cancelSupplierReturn(supplierReturnId, request),
    onSuccess: invalidate,
    onError: (error) => logger.error(error),
  })
}

interface ConfirmDeliveryVariables {
  readonly supplierReturnId: string
  readonly request: ConfirmSupplierReturnDeliveryRequest
}

export function useConfirmSupplierReturnDeliveryMutation() {
  const invalidate = useInvalidateAfterTransition()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ConfirmDeliveryVariables>({
    mutationFn: ({ supplierReturnId, request }) =>
      supplierReturnService.confirmSupplierReturnDelivery(supplierReturnId, request),
    onSuccess: invalidate,
    onError: (error) => logger.error(error),
  })
}
