import { useQuery } from '@tanstack/react-query'
import { openingStockImportService } from '../services/opening-stock-import.service'
import type { OpeningStockLookupQuery } from '../types/opening-stock-import.types'

export function useOpeningStockOptions(params: OpeningStockLookupQuery) {
  return useQuery({
    queryKey: ['inventory', 'opening-stock-form-options', params],
    queryFn: () => openingStockImportService.formOptions(params),
    enabled: Boolean(params.warehouseId),
    placeholderData: (previous, previousQuery) => {
      const previousParams = previousQuery?.queryKey[2]
      return previousParams &&
        typeof previousParams === 'object' &&
        'warehouseId' in previousParams &&
        previousParams.warehouseId === params.warehouseId
        ? previous
        : undefined
    },
  })
}
