import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { cycleCountService } from '../services/cycle-count.service'
import type {
  AllowedActionsResponse,
  CancelCycleCountRequest,
  CreateCycleCountRequest,
  CreateStockAdjustmentRequest,
  CycleCountDetail,
  CycleCountListQuery,
  CycleCountListResponse,
  RejectStockAdjustmentRequest,
  RequestRecountRequest,
  StockAdjustment,
  StockAdjustmentListQuery,
  StockAdjustmentListResponse,
  StockAdjustmentVoucher,
  StockAdjustmentVoucherListQuery,
  StockAdjustmentVoucherListResponse,
} from '../types/cycle-count.types'

export function useCycleCountsQuery(params: CycleCountListQuery) {
  return useQuery<CycleCountListResponse, ApiErrorResponse>({
    queryKey: queryKeys.cycleCounts.list(params),
    queryFn: () => cycleCountService.getCycleCounts(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

// Nạp sẵn chi tiết + allowed-actions khi rê chuột lên dòng để mở trang gần như tức thì (DB ở xa).
export function usePrefetchCycleCount() {
  const queryClient = useQueryClient()
  return (cycleCountId: string) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.cycleCounts.detail(cycleCountId),
      queryFn: () =>
        cycleCountService.getCycleCount(cycleCountId).then((response) => response.data),
      staleTime: 30_000,
    })
    void queryClient.prefetchQuery({
      queryKey: queryKeys.cycleCounts.allowedActions(cycleCountId),
      queryFn: () =>
        cycleCountService
          .getCycleCountAllowedActions(cycleCountId)
          .then((response) => response.data),
      staleTime: 30_000,
    })
  }
}

export function useCycleCountQuery(cycleCountId: string) {
  return useQuery<CycleCountDetail, ApiErrorResponse>({
    queryKey: queryKeys.cycleCounts.detail(cycleCountId),
    queryFn: () => cycleCountService.getCycleCount(cycleCountId).then((response) => response.data),
    enabled: Boolean(cycleCountId),
  })
}

export function useCycleCountAllowedActionsQuery(cycleCountId: string) {
  return useQuery<AllowedActionsResponse, ApiErrorResponse>({
    queryKey: queryKeys.cycleCounts.allowedActions(cycleCountId),
    queryFn: () =>
      cycleCountService.getCycleCountAllowedActions(cycleCountId).then((response) => response.data),
    enabled: Boolean(cycleCountId),
  })
}

export function useInvalidateCycleCount() {
  const queryClient = useQueryClient()
  // ponytail: key `all` là prefix của detail + allowed-actions nên một lần invalidate là đủ;
  // invalidate thêm từng key con sẽ huỷ request đang chạy và gọi lại (3x allowed-actions).
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.all })
  }
}

export function useCreateCycleCountMutation() {
  const invalidate = useInvalidateCycleCount()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateCycleCountRequest>({
    mutationFn: cycleCountService.createCycleCount,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

// Không invalidate ở đây: trang lưu nhiều dòng tuần tự và invalidate một lần sau cùng.
export function useRecordCycleCountItemMutation() {
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    {
      cycleCountId: string
      itemId: string
      countedQuantity: number
      countedDamagedQuantity: number | null
      note: string | null
    }
  >({
    mutationFn: cycleCountService.recordCycleCountItem,
    onError: (error) => logger.error(error),
  })
}

function useCycleCountActionMutation(
  mutationFn: (cycleCountId: string) => Promise<ApiResponse<unknown>>
) {
  const invalidate = useInvalidateCycleCount()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, string>({
    mutationFn,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useStartCycleCountMutation() {
  return useCycleCountActionMutation(cycleCountService.startCycleCount)
}

export function useSubmitCycleCountMutation() {
  return useCycleCountActionMutation(cycleCountService.submitCycleCount)
}

export function useCancelCycleCountMutation() {
  const invalidate = useInvalidateCycleCount()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { cycleCountId: string; request: CancelCycleCountRequest }
  >({
    mutationFn: cycleCountService.cancelCycleCount,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useFinalizeCycleCountMutation() {
  return useCycleCountActionMutation(cycleCountService.finalizeCycleCount)
}

export function useRequestRecountMutation() {
  const invalidate = useInvalidateCycleCount()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { cycleCountId: string; request: RequestRecountRequest }
  >({
    mutationFn: cycleCountService.requestRecount,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useStockAdjustmentsQuery(params: StockAdjustmentListQuery) {
  return useQuery<StockAdjustmentListResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockAdjustments.list(params),
    queryFn: () => cycleCountService.getStockAdjustments(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useStockAdjustmentQuery(adjustmentId: string) {
  return useQuery<StockAdjustment, ApiErrorResponse>({
    queryKey: queryKeys.stockAdjustments.detail(adjustmentId),
    queryFn: () =>
      cycleCountService.getStockAdjustment(adjustmentId).then((response) => response.data),
    enabled: Boolean(adjustmentId),
  })
}

export function useStockAdjustmentAllowedActionsQuery(adjustmentId: string) {
  return useQuery<AllowedActionsResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockAdjustments.allowedActions(adjustmentId),
    queryFn: () =>
      cycleCountService
        .getStockAdjustmentAllowedActions(adjustmentId)
        .then((response) => response.data),
    enabled: Boolean(adjustmentId),
  })
}

function useInvalidateStockAdjustment() {
  const queryClient = useQueryClient()
  return async (adjustmentId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAdjustments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ...(adjustmentId
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.stockAdjustments.detail(adjustmentId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.stockAdjustments.allowedActions(adjustmentId),
            }),
          ]
        : []),
    ])
  }
}

export function useCreateStockAdjustmentMutation() {
  const invalidate = useInvalidateStockAdjustment()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateStockAdjustmentRequest>({
    mutationFn: cycleCountService.createStockAdjustment,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useApproveStockAdjustmentMutation() {
  const invalidate = useInvalidateStockAdjustment()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    Parameters<typeof cycleCountService.approveStockAdjustment>[0]
  >({
    mutationFn: cycleCountService.approveStockAdjustment,
    onSuccess: async (_, { adjustmentId }) => invalidate(adjustmentId),
    onError: (error) => logger.error(error),
  })
}

export function useRejectStockAdjustmentMutation() {
  const invalidate = useInvalidateStockAdjustment()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { adjustmentId: string; request: RejectStockAdjustmentRequest }
  >({
    mutationFn: cycleCountService.rejectStockAdjustment,
    onSuccess: async (_, variables) => invalidate(variables.adjustmentId),
    onError: (error) => logger.error(error),
  })
}

export function useStockAdjustmentVouchersQuery(params: StockAdjustmentVoucherListQuery) {
  return useQuery<StockAdjustmentVoucherListResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockAdjustments.voucherList(params),
    queryFn: () =>
      cycleCountService.getStockAdjustmentVouchers(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useStockAdjustmentVoucherQuery(voucherId: string) {
  return useQuery<StockAdjustmentVoucher, ApiErrorResponse>({
    queryKey: queryKeys.stockAdjustments.voucherDetail(voucherId),
    queryFn: () =>
      cycleCountService.getStockAdjustmentVoucher(voucherId).then((response) => response.data),
    enabled: Boolean(voucherId),
  })
}

export function useStockAdjustmentVoucherAllowedActionsQuery(voucherId: string) {
  return useQuery<AllowedActionsResponse, ApiErrorResponse>({
    queryKey: queryKeys.stockAdjustments.voucherAllowedActions(voucherId),
    queryFn: () =>
      cycleCountService
        .getStockAdjustmentVoucherAllowedActions(voucherId)
        .then((response) => response.data),
    enabled: Boolean(voucherId),
  })
}

// Phiếu điều chỉnh tạo từ kiểm kê nên banner/dòng của phiếu kiểm kê cũng phải tải lại.
function useInvalidateStockAdjustmentVoucher() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAdjustments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleCounts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    ])
  }
}

export function useCreateStockAdjustmentVoucherMutation() {
  const invalidate = useInvalidateStockAdjustmentVoucher()
  return useMutation<
    ApiResponse<string>,
    ApiErrorResponse,
    Parameters<typeof cycleCountService.createStockAdjustmentVoucher>[0]
  >({
    mutationFn: cycleCountService.createStockAdjustmentVoucher,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useApproveStockAdjustmentVoucherMutation() {
  const invalidate = useInvalidateStockAdjustmentVoucher()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    Parameters<typeof cycleCountService.approveStockAdjustmentVoucher>[0]
  >({
    mutationFn: cycleCountService.approveStockAdjustmentVoucher,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}

export function useRejectStockAdjustmentVoucherMutation() {
  const invalidate = useInvalidateStockAdjustmentVoucher()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    Parameters<typeof cycleCountService.rejectStockAdjustmentVoucher>[0]
  >({
    mutationFn: cycleCountService.rejectStockAdjustmentVoucher,
    onSuccess: async () => invalidate(),
    onError: (error) => logger.error(error),
  })
}
