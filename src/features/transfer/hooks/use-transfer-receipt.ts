import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { transferService } from '../services/transfer.service'
import type {
  StartTransferReceivingRequest,
  SubmitTransferReceiptRequest,
  PutAwayTransferShipmentRequest,
  TransferTaskType,
} from '../types/transfer-receipt.types'
import { logTransferError } from '../utils/transfer-errors'
import { TRANSFER_MUTATION_KEY, invalidateTransferQueries } from './use-transfers'

interface ShipmentScope {
  transferId: string
  shipmentId: string
}

export function useTransferReceiptSheetQuery(transferId: string, shipmentId: string) {
  return useQuery({
    queryKey: queryKeys.transfers.receiptSheet(transferId, shipmentId),
    queryFn: () =>
      transferService.getReceiptSheet(transferId, shipmentId).then((response) => response.data),
    enabled: Boolean(transferId && shipmentId),
    refetchOnWindowFocus: false,
  })
}

export function useTransferPutAwaySheetQuery(
  transferId: string,
  shipmentId: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.transfers.putAwaySheet(transferId, shipmentId),
    queryFn: () =>
      transferService.getPutAwaySheet(transferId, shipmentId).then((response) => response.data),
    enabled: enabled && Boolean(transferId && shipmentId),
    refetchOnWindowFocus: false,
  })
}

export function useTransferAssignableStaffQuery(
  warehouseId: string | null,
  taskType: TransferTaskType
) {
  return useQuery({
    queryKey: queryKeys.transfers.assignableStaff(warehouseId ?? '', taskType),
    queryFn: () =>
      transferService
        .getAssignableStaff(warehouseId ?? '', taskType)
        .then((response) => response.data),
    enabled: Boolean(warehouseId),
  })
}

export function useStartTransferReceivingMutation() {
  const client = useQueryClient()
  return useMutation<
    Awaited<ReturnType<typeof transferService.startReceiving>>,
    ApiErrorResponse,
    ShipmentScope & { request: StartTransferReceivingRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.startReceiving(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(client, 'none'),
    onError: logTransferError,
  })
}

export function useSubmitTransferReceiptMutation() {
  const client = useQueryClient()
  return useMutation<
    Awaited<ReturnType<typeof transferService.submitReceipt>>,
    ApiErrorResponse,
    ShipmentScope & { request: SubmitTransferReceiptRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.submitReceipt(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(client, 'none'),
    onError: logTransferError,
  })
}

export function usePutAwayTransferShipmentMutation() {
  const client = useQueryClient()
  return useMutation<
    Awaited<ReturnType<typeof transferService.putAwayShipment>>,
    ApiErrorResponse,
    ShipmentScope & { request: PutAwayTransferShipmentRequest }
  >({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    // Disabling a query does not abort its in-flight request. Stop old rules/AI before the write.
    onMutate: ({ transferId }) =>
      client.cancelQueries({
        queryKey: queryKeys.transfers.putAwayPlanSuggestions(transferId).slice(0, -1),
      }),
    mutationFn: ({ transferId, shipmentId, request }) =>
      transferService.putAwayShipment(transferId, shipmentId, request),
    onSuccess: () => invalidateTransferQueries(client, 'none'),
    onError: logTransferError,
  })
}
