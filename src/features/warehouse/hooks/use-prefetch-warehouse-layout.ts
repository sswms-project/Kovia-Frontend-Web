import { useQueryClient } from '@tanstack/react-query'
import { warehouseLayoutSceneQueryOptions } from './use-warehouse-layout-scene'

/** `preloadChunk` is supplied by the page that lazy-loads the designer, so hooks never import pages. */
export function useWarehouseLayoutPrefetch(preloadChunk: () => void) {
  const queryClient = useQueryClient()

  return (warehouseId: string) => {
    const prefetch = () => {
      preloadChunk()
      void queryClient.prefetchQuery(warehouseLayoutSceneQueryOptions(warehouseId))
    }
    return { onPointerEnter: prefetch, onFocus: prefetch, onClick: prefetch }
  }
}
