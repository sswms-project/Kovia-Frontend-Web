import type { useInventoryQuery } from '@/features/inventory/hooks/use-inventory'
import type { WarehouseLayoutSelection } from './warehouse-layout-scene.types'

/** Selection and inventory paging for the layout viewer; owned by the caller so the viewer stays query-free. */
export interface LayoutViewerInventoryState {
  readonly selection: WarehouseLayoutSelection | null
  readonly setSelection: (selection: WarehouseLayoutSelection | null) => void
  readonly pageNumber: number
  readonly setPageNumber: (pageNumber: number) => void
  readonly pageSize: number
  readonly setPageSize: (pageSize: number) => void
  readonly inventorySearchTerm: string
  readonly setInventorySearchTerm: (searchTerm: string) => void
  readonly debouncedInventorySearchTerm: string
  readonly inventoryQuery: ReturnType<typeof useInventoryQuery>
}
