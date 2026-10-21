'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { transferService } from '../services/transfer.service'
import type { SetTransferPutAwayPlanRequest } from '../types/transfer.types'
import { logTransferError } from '../utils/transfer-errors'
import { invalidateTransferQueries, TRANSFER_MUTATION_KEY } from './use-transfers'

/** Gợi ý có thể gọi AI: chỉ refetch khi người dùng yêu cầu. */
export function useTransferPutAwayPlanSuggestionsQuery(transferId: string, shipmentId?: string) {
  return useQuery({
    queryKey: queryKeys.transfers.putAwayPlanSuggestions(transferId, shipmentId),
    queryFn: ({ signal }) =>
      transferService
        .getPutAwayPlanSuggestions(transferId, shipmentId, true, signal)
        .then((response) => response.data),
    enabled: false,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/** Tự điền theo quy tắc kho, tuyệt đối không gọi AI khi mở trang. Cache theo phiên bản phiếu. */
export function useTransferPutAwayRulesQuery(
  transferId: string,
  shipmentId: string | undefined,
  version: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: [
      ...queryKeys.transfers.putAwayPlanSuggestions(transferId, shipmentId),
      'rules',
      version,
    ],
    queryFn: ({ signal }) =>
      transferService
        .getPutAwayPlanSuggestions(transferId, shipmentId, false, signal)
        .then((response) => response.data),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useSetTransferPutAwayPlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TRANSFER_MUTATION_KEY,
    retry: false,
    onMutate: ({ transferId }) =>
      queryClient.cancelQueries({
        queryKey: queryKeys.transfers.putAwayPlanSuggestions(transferId).slice(0, -1),
      }),
    mutationFn: ({
      transferId,
      request,
    }: {
      transferId: string
      request: SetTransferPutAwayPlanRequest
    }) => transferService.setPutAwayPlan(transferId, request),
    // The plan workspace owns the single mandatory detail/sheet reload after saving.
    onSuccess: () => invalidateTransferQueries(queryClient, 'none'),
    onError: logTransferError,
  })
}
