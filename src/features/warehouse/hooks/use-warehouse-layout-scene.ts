import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { warehouseLayoutSceneService } from '../services/warehouse-layout-scene.service'
import type {
  SaveWarehouseLayoutSceneRequest,
  WarehouseLayoutSceneResponse,
} from '../types/warehouse-layout-scene.types'

interface SaveWarehouseLayoutSceneVariables {
  warehouseId: string
  request: SaveWarehouseLayoutSceneRequest
}

export function warehouseLayoutSceneQueryOptions(warehouseId: string) {
  return queryOptions<WarehouseLayoutSceneResponse, ApiErrorResponse>({
    queryKey: queryKeys.warehouses.layoutScene(warehouseId),
    queryFn: () =>
      warehouseLayoutSceneService.getScene(warehouseId).then((response) => response.data),
  })
}

export function useWarehouseLayoutSceneQuery(warehouseId: string) {
  return useQuery({
    ...warehouseLayoutSceneQueryOptions(warehouseId),
    enabled: Boolean(warehouseId),
  })
}

export function useSaveWarehouseLayoutSceneMutation() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<unknown>, ApiErrorResponse, SaveWarehouseLayoutSceneVariables>({
    mutationFn: ({ warehouseId, request }) =>
      warehouseLayoutSceneService.saveScene(warehouseId, request),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.warehouses.layoutScene(variables.warehouseId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.warehouses.layout(variables.warehouseId),
        }),
      ])
    },
    onError: (error) => logger.error(error),
  })
}
