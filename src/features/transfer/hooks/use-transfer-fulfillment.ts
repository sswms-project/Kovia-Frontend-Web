import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logTransferError } from '../utils/transfer-errors'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { transferService } from '../services/transfer.service'
import type {
  AdjustTransferAllocationRequest,
  CancelTransferShipmentRequest,
  CreateTransferShipmentRequest,
  CompleteTransferPickingRequest,
  DispatchTransferShipmentRequest,
  ReopenTransferPickingRequest,
  EscalateTransferPickRequest,
  ReceiveTransferShipmentRequest,
  RecordTransferPickRequest,
  ResolveTransferDiscrepancyRequest,
  ResolveTransferEscalationRequest,
  ReturnTransferPickRequest,
  SwitchTransferPickRequest,
  TransferAllocationOption,
  TransferPickAlternative,
  TransferPickSheet,
  TransferReceiveSheet,
} from '../types/transfer.types'
import type { ReceivableSlot } from '../utils/transfer-receive'
import { TRANSFER_MUTATION_KEY, invalidateTransferQueries } from './use-transfers'

interface ShipmentScope {
  transferId: string
  shipmentId: string
}

export function useTransferPickSheetQuery(transferId: string | null, shipmentId: string | null) {
  return useQuery<TransferPickSheet, ApiErrorResponse>({
    queryKey: queryKeys.transfers.pickSheet(transferId ?? '', shipmentId ?? ''),
    queryFn: () =>
      transferService
        .getPickSheet(transferId ?? '', shipmentId ?? '')
        .then((response) => response.data),
    enabled: Boolean(transferId && shipmentId),
  })
}

export function useTransferPickAlternativesQuery(
  transferId: string | null,
  shipmentId: string | null,
  lineId: string | null,
  enabled = true
) {
  return useQuery<TransferPickAlternative[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.pickAlternatives(
      transferId ?? '',
      shipmentId ?? '',
      lineId ?? ''
    ),
    queryFn: () =>
      transferService
        .getPickAlternatives(transferId ?? '', shipmentId ?? '', lineId ?? '')
        .then((response) => response.data),
    enabled: enabled && Boolean(transferId && shipmentId && lineId),
  })
}

export function useTransferReceiveSheetQuery(transferId: string | null, shipmentId: string | null) {
  return useQuery<TransferReceiveSheet, ApiErrorResponse>({
    queryKey: queryKeys.transfers.receiveSheet(transferId ?? '', shipmentId ?? ''),
    queryFn: () =>
      transferService
        .getReceiveSheet(transferId ?? '', shipmentId ?? '')
        .then((response) => response.data),
    enabled: Boolean(transferId && shipmentId),
  })
}

/** Tra vị trí theo mã quét là đọc, không phải lệnh ghi điều chuyển. */
export function useFindReceivableSlotMutation() {
  return useMutation<
    ReceivableSlot | null,
    ApiErrorResponse,
    { warehouseId: string; scannedCode: string }
  >({
    mutationKey: ['transfer-slot-lookup'],
    mutationFn: ({ warehouseId, scannedCode }) =>
      transferService.findReceivableSlot(warehouseId, scannedCode),
    onError: (error) => logTransferError(error),
  })
}

export function useCreateTransferShipmentMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<string>,
    ApiErrorResponse,
    { transferId: string; request: CreateTransferShipmentRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.createShipment(transferId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useCancelTransferShipmentMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: CancelTransferShipmentRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.cancelShipment(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useRecordTransferPickMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: RecordTransferPickRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.recordPick(transferId, shipmentId, request),
    // The scanner owns the mandatory fresh-sheet read before advancing to another line.
    onSuccess: () => invalidateTransferQueries(queryClient, 'none'),
    onError: (error) => logTransferError(error),
  })
}

export function useSwitchTransferPickMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { lineId: string; request: SwitchTransferPickRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, lineId, request }) =>
      transferService.switchPick(transferId, shipmentId, lineId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useEscalateTransferPickMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<string>,
    ApiErrorResponse,
    ShipmentScope & { lineId: string; request: EscalateTransferPickRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, lineId, request }) =>
      transferService.escalatePick(transferId, shipmentId, lineId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useResolveTransferEscalationMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & {
      lineId: string
      exceptionId: string
      request: ResolveTransferEscalationRequest
    }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, lineId, exceptionId, request }) =>
      transferService.resolveEscalation(transferId, shipmentId, lineId, exceptionId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useReturnTransferPickMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: ReturnTransferPickRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.returnPick(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useCompleteTransferPickingMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: CompleteTransferPickingRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.completePicking(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useTransferAllocationOptionsQuery(
  transferId: string | null,
  itemId: string | null
) {
  return useQuery<TransferAllocationOption[], ApiErrorResponse>({
    queryKey: queryKeys.transfers.allocationOptions(transferId ?? '', itemId ?? ''),
    queryFn: () =>
      transferService
        .getAllocationOptions(transferId ?? '', itemId ?? '')
        .then((response) => response.data),
    enabled: Boolean(transferId && itemId),
  })
}

export function useAdjustTransferAllocationMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { transferId: string; request: AdjustTransferAllocationRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, request }) => transferService.adjustAllocation(transferId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useReopenTransferPickingMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: ReopenTransferPickingRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.reopenPicking(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useDispatchTransferShipmentMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: DispatchTransferShipmentRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.dispatchShipment(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useReceiveTransferShipmentMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    ShipmentScope & { request: ReceiveTransferShipmentRequest }
  >({
    retry: false,
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.receiveShipment(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}

export function useResolveTransferDiscrepancyMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    ApiResponse<unknown>,
    ApiErrorResponse,
    { transferId: string; discrepancyId: string; request: ResolveTransferDiscrepancyRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    mutationFn: ({ transferId, discrepancyId, request }) =>
      transferService.resolveDiscrepancy(transferId, discrepancyId, request),
    onSuccess: () => invalidateTransferQueries(queryClient),
    onError: (error) => logTransferError(error),
  })
}
