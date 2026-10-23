import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { inventoryAnomalyService } from '../services/inventory-anomaly.service'
import type {
  InventoryAnomaly,
  InventoryAnomalyListQuery,
  InventoryAnomalyListResponse,
  InventoryAnomalyScan,
  InventoryAnomalySummary,
  ReviewInventoryAnomalyRequest,
} from '../types/inventory-anomaly.types'

const RUNNING_SCAN_POLL_MS = 3_000

export function isAnomalyScanRunning(scan: InventoryAnomalyScan | null | undefined) {
  return scan?.status === 'Running'
}

export function useInventoryAnomaliesQuery(params: InventoryAnomalyListQuery, enabled = true) {
  return useQuery<InventoryAnomalyListResponse, ApiErrorResponse>({
    queryKey: queryKeys.inventoryAnomalies.list(params),
    queryFn: () => inventoryAnomalyService.getAnomalies(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

/** Polls while the warehouse's latest scan runs; the backend reports a scan stuck Running as Failed, so polling ends. */
export function useInventoryAnomalySummaryQuery(warehouseId: string, enabled = true) {
  return useQuery<InventoryAnomalySummary, ApiErrorResponse>({
    queryKey: queryKeys.inventoryAnomalies.summary(warehouseId),
    queryFn: () =>
      inventoryAnomalyService.getSummary(warehouseId).then((response) => response.data),
    enabled,
    refetchInterval: (query) =>
      isAnomalyScanRunning(query.state.data?.latestScan) ? RUNNING_SCAN_POLL_MS : false,
  })
}

export function useStartAnomalyScanMutation() {
  const queryClient = useQueryClient()
  return useMutation<InventoryAnomalyScan, ApiErrorResponse, string>({
    mutationFn: (warehouseId) =>
      inventoryAnomalyService.startScan(warehouseId).then((response) => response.data),
    onSuccess: (_, warehouseId) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryAnomalies.summary(warehouseId),
      }),
    onError: logApiError,
  })
}

export function useReviewInventoryAnomalyMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    InventoryAnomaly,
    ApiErrorResponse,
    { id: string; request: ReviewInventoryAnomalyRequest }
  >({
    mutationFn: ({ id, request }) =>
      inventoryAnomalyService.review(id, request).then((response) => response.data),
    // Both outcomes change the list and the counts: a 409 means someone else reviewed it first.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventoryAnomalies.all }),
    onError: logApiError,
  })
}
