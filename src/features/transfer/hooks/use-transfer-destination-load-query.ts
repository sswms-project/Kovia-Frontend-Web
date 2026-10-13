import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { isOperationalDateTimeInput } from '@/lib/operational-date-time'
import { queryKeys } from '@/lib/query-keys'
import { transferService } from '../services/transfer.service'
import type { TransferDestinationLoadQuery } from '../types/transfer.types'
import { formatApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'

export function useTransferDestinationLoadQuery(
  params: TransferDestinationLoadQuery,
  enabled = true
) {
  const debouncedDate = useDebouncedValue(params.date, 300)
  const canLoad =
    enabled &&
    Boolean(params.warehouseId && params.date) &&
    isOperationalDateTimeInput(params.date) &&
    params.date === debouncedDate
  const query = useQuery({
    queryKey: queryKeys.transfers.destinationLoad(
      params.warehouseId,
      debouncedDate,
      params.excludeTransferId
    ),
    enabled: canLoad,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        const response = await transferService.getDestinationLoad(
          { ...params, date: debouncedDate },
          signal
        )
        return response.data
      } catch (error) {
        if (!signal.aborted)
          logger.warn('Không thể tải cảnh báo tải kho nhập:', formatApiError(error))
        throw error
      }
    },
  })
  // Do not show counts for a previous date, a denied request, or a background refresh that failed.
  return { ...query, data: canLoad && !query.isError && !query.isFetching ? query.data : undefined }
}
