import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { inventoryService } from '../services/inventory.service'
import type {
  InventoryStock,
  InventoryStockListResponse,
  InventoryReservationListResponse,
  InventoryAbcItem,
  InventoryAbcQuery,
  InventoryForecastQuery,
  InventoryForecastResponse,
  InventoryListQuery,
  InventoryReservationQuery,
  InventoryStockHistoryQuery,
  InventoryStockHistoryResponse,
  ReportDamagedStockRequest,
  RunInventoryAbcRequest,
  ApplyInventoryAbcRequest,
  StockMovementListQuery,
  StockMovementListResponse,
  CreateForecastRunRequest,
  ForecastRun,
  ForecastRunSummary,
  RejectForecastSuggestionRequest,
  AcceptReplenishmentSuggestionRequest,
  AcceptRebalancingSuggestionRequest,
  DamageCaseQuery,
  DamageCaseListResponse,
  DecideDamageCaseDispositionRequest,
  OpeningStockQuery,
  StockDiscrepancyQuery,
  OpeningStockListResponse,
  CreateOpeningStockRequest,
  UpdateOpeningStockRequest,
  InventoryEvidence,
  StockDiscrepancyListResponse,
  CreateStockDiscrepancyRequest,
  ReviewStockDiscrepancyRequest,
  AddStockDiscrepancyEvidenceRequest,
  AddDamageCaseEvidenceRequest,
  MyWarehouseTaskListResponse,
  InventoryWarehouseOption,
  InventorySlotOption,
} from '../types/inventory.types'

export function useMyWarehouseTasksQuery(warehouseId?: string, enabled = true) {
  return useQuery<MyWarehouseTaskListResponse, ApiErrorResponse>({
    queryKey: ['my-warehouse-tasks', warehouseId ?? 'all'],
    queryFn: () =>
      inventoryService.getMyWarehouseTasks(warehouseId).then((response) => response.data),
    enabled,
  })
}

export function useUploadInventoryEvidenceMutation() {
  return useMutation<
    ApiResponse<InventoryEvidence>,
    ApiErrorResponse,
    { warehouseId: string; file: File }
  >({
    mutationFn: ({ warehouseId, file }) => inventoryService.uploadEvidence(warehouseId, file),
    onError: (error) => logger.error(error),
  })
}

export function useInventoryQuery(params: InventoryListQuery, enabled = true) {
  return useQuery<InventoryStockListResponse, ApiErrorResponse>({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => inventoryService.getInventory(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useFetchAllInventoryMutation() {
  return useMutation<
    InventoryStock[],
    ApiErrorResponse,
    Parameters<typeof inventoryService.getAllInventory>[0]
  >({
    mutationFn: inventoryService.getAllInventory,
    onError: (error) => logger.error(error),
  })
}

export function useInventoryWarehouseOptionsQuery(enabled = true) {
  return useQuery<InventoryWarehouseOption[], ApiErrorResponse>({
    queryKey: queryKeys.inventory.warehouseOptions(),
    queryFn: () => inventoryService.getWarehouseOptions().then((response) => response.data),
    enabled,
  })
}

export function useInventorySlotOptionsQuery(warehouseId: string, enabled = true) {
  return useQuery<InventorySlotOption[], ApiErrorResponse>({
    queryKey: queryKeys.inventory.slotOptions(warehouseId),
    queryFn: () => inventoryService.getSlotOptions(warehouseId).then((response) => response.data),
    enabled: enabled && Boolean(warehouseId),
  })
}

export function useStockMovementsQuery(params: StockMovementListQuery, enabled = true) {
  return useQuery<StockMovementListResponse, ApiErrorResponse>({
    queryKey: queryKeys.inventory.movements(params),
    queryFn: () => inventoryService.getStockMovements(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useInventoryReservationsQuery(params: InventoryReservationQuery, enabled = true) {
  return useQuery<InventoryReservationListResponse, ApiErrorResponse>({
    queryKey: queryKeys.inventory.reservations(params),
    queryFn: () => inventoryService.getReservations(params).then((response) => response.data),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useReportDamagedStockMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, ReportDamagedStockRequest>({
    mutationFn: inventoryService.reportDamagedStock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useDamageCasesQuery(params: DamageCaseQuery) {
  return useQuery<DamageCaseListResponse, ApiErrorResponse>({
    queryKey: ['inventory', 'damage-cases', params],
    queryFn: () => inventoryService.getDamageCases(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useStockDiscrepanciesQuery(params: StockDiscrepancyQuery) {
  return useQuery<StockDiscrepancyListResponse, ApiErrorResponse>({
    queryKey: ['inventory', 'discrepancies', params],
    queryFn: () => inventoryService.getDiscrepancies(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateStockDiscrepancyMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateStockDiscrepancyRequest>({
    mutationFn: inventoryService.createDiscrepancy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'discrepancies'] }),
    onError: (error) => logger.error(error),
  })
}

export function useReviewStockDiscrepancyMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string | null>, ApiErrorResponse, ReviewStockDiscrepancyRequest>({
    mutationFn: inventoryService.reviewDiscrepancy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'discrepancies'] }),
    onError: (error) => logger.error(error),
  })
}

export function useAddStockDiscrepancyEvidenceMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AddStockDiscrepancyEvidenceRequest>({
    mutationFn: inventoryService.addDiscrepancyEvidence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'discrepancies'] }),
    onError: (error) => logger.error(error),
  })
}

export function useDecideDamageCaseDispositionMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<string | null>,
    ApiErrorResponse,
    DecideDamageCaseDispositionRequest
  >({
    mutationFn: inventoryService.decideDamageCaseDisposition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useAddDamageCaseEvidenceMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, AddDamageCaseEvidenceRequest>({
    mutationFn: inventoryService.addDamageCaseEvidence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useOpeningStocksQuery(params: OpeningStockQuery) {
  return useQuery<OpeningStockListResponse, ApiErrorResponse>({
    queryKey: ['inventory', 'opening-stocks', params],
    queryFn: () => inventoryService.getOpeningStocks(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateOpeningStockMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateOpeningStockRequest>({
    mutationFn: inventoryService.createOpeningStock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useUpdateOpeningStockMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateOpeningStockRequest>({
    mutationFn: inventoryService.updateOpeningStock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useOpeningStockActionMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    | { action: 'submit'; id: string; expectedVersion: string }
    | {
        action: 'approve'
        id: string
        expectedVersion: string
        selfApprovalAcknowledged?: boolean
      }
    | { action: 'withdraw'; id: string; expectedVersion: string; reason: string }
    | { action: 'cancel'; id: string; expectedVersion: string; reason: string }
    | {
        action: 'review'
        id: string
        expectedVersion: string
        decision: 'Returned' | 'Rejected' | 'Cancelled'
        reason: string
        selfApprovalAcknowledged?: boolean
      }
  >({
    mutationFn: (request) => {
      if (request.action === 'submit')
        return inventoryService.submitOpeningStock(request.id, request.expectedVersion)
      if (request.action === 'approve')
        return inventoryService.approveOpeningStock(
          request.id,
          request.expectedVersion,
          request.selfApprovalAcknowledged
        )
      if (request.action === 'withdraw')
        return inventoryService.withdrawOpeningStock(
          request.id,
          request.reason,
          request.expectedVersion
        )
      if (request.action === 'cancel')
        return inventoryService.cancelOpeningStock(
          request.id,
          request.reason,
          request.expectedVersion
        )
      return inventoryService.reviewOpeningStock(request.id, {
        decision: request.decision,
        reason: request.reason,
        expectedVersion: request.expectedVersion,
        selfApprovalAcknowledged: request.selfApprovalAcknowledged,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useInventoryAbcQuery(params: InventoryAbcQuery, enabled = true) {
  return useQuery<InventoryAbcItem[], ApiErrorResponse>({
    queryKey: queryKeys.inventory.abc(params),
    queryFn: () => inventoryService.getAbcClassification(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useRunInventoryAbcMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<InventoryAbcItem[]>, ApiErrorResponse, RunInventoryAbcRequest>({
    mutationFn: inventoryService.runAbcClassification,
    onSuccess: (response, variables) =>
      queryClient.setQueryData(
        queryKeys.inventory.abc({ warehouseId: variables.warehouseId }),
        response.data
      ),
    onError: (error) => logger.error(error),
  })
}

export function useApplyInventoryAbcMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<string>, ApiErrorResponse, ApplyInventoryAbcRequest>({
    mutationFn: inventoryService.applyAbcAnalysis,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useInventoryForecastQuery(params: InventoryForecastQuery, enabled = true) {
  return useQuery<InventoryForecastResponse, ApiErrorResponse>({
    queryKey: queryKeys.inventory.forecast(params),
    queryFn: () => inventoryService.getForecast(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useForecastRunQuery(id: string) {
  return useQuery<ForecastRun, ApiErrorResponse>({
    queryKey: queryKeys.inventory.forecastRun(id),
    queryFn: () => inventoryService.getForecastRun(id).then((response) => response.data),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'Pending' || query.state.data?.status === 'Running'
        ? 1_500
        : false,
  })
}

export function useCreateForecastRunMutation() {
  return useMutation<ApiResponse<string>, ApiErrorResponse, CreateForecastRunRequest>({
    mutationFn: inventoryService.createForecastRun,
    onError: (error) => logger.error(error),
  })
}

export function useExecuteForecastRunMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, string>({
    mutationFn: inventoryService.executeForecastRun,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error) => logger.error(error),
  })
}

export function useForecastRunsQuery(warehouseId: string) {
  return useQuery<ForecastRunSummary[], ApiErrorResponse>({
    queryKey: queryKeys.inventory.forecastRuns(warehouseId),
    queryFn: () => inventoryService.getForecastRuns(warehouseId).then((response) => response.data),
    enabled: Boolean(warehouseId),
  })
}

export function useEvaluateForecastRunMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, string>({
    mutationFn: inventoryService.evaluateForecastRun,
    onSuccess: (_, id) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.forecastRun(id) }),
    onError: (error) => logger.error(error),
  })
}

export function useAcceptReplenishmentSuggestionMutation(runId: string) {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<string>,
    ApiErrorResponse,
    { id: string; request: AcceptReplenishmentSuggestionRequest }
  >({
    mutationFn: ({ id, request }) => inventoryService.acceptReplenishmentSuggestion(id, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.forecastRun(runId) }),
    onError: (error) => logger.error(error),
  })
}

export function useAcceptRebalancingSuggestionMutation(runId: string) {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<string>,
    ApiErrorResponse,
    { id: string; request: AcceptRebalancingSuggestionRequest }
  >({
    mutationFn: ({ id, request }) => inventoryService.acceptRebalancingSuggestion(id, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.forecastRun(runId) }),
    onError: (error) => logger.error(error),
  })
}

export function useRejectForecastSuggestionMutation(runId: string) {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { id: string } & RejectForecastSuggestionRequest
  >({
    mutationFn: ({ id, ...request }) => inventoryService.rejectForecastSuggestion(id, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.forecastRun(runId) }),
    onError: (error) => logger.error(error),
  })
}

export function useInventoryStockHistoryQuery(params: InventoryStockHistoryQuery, enabled = true) {
  return useQuery<InventoryStockHistoryResponse, ApiErrorResponse>({
    queryKey: queryKeys.inventory.history(params),
    queryFn: () => inventoryService.getStockHistory(params).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}
