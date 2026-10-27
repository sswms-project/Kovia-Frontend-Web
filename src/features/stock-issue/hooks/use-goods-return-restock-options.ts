import { useQuery } from '@tanstack/react-query'
import { stockIssueService } from '../services/stock-issue.service'
import type { GoodsReturnRestockOptions } from '../types/stock-issue.types'
import type { ApiErrorResponse } from '@/types/api'

export function useGoodsReturnRestockOptionsQuery(
  returnId: string | null,
  version?: string | null
) {
  return useQuery<GoodsReturnRestockOptions, ApiErrorResponse>({
    queryKey: ['goods-return-requests', 'detail', returnId, 'restock-options', version],
    queryFn: () =>
      stockIssueService
        .getGoodsReturnRestockOptions(returnId ?? '')
        .then((response) => response.data),
    enabled: Boolean(returnId),
    staleTime: 0,
    retry: false,
  })
}
