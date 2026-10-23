import type { InventoryListQuery } from '../types/inventory.types'

interface InventoryFilters {
  readonly searchTerm: string
  readonly warehouseId: string
  readonly productId: string
  readonly slotId?: string
  readonly showDepleted?: boolean
}

export function buildInventoryQuery(
  filters: InventoryFilters,
  pageNumber: number,
  pageSize: number
): InventoryListQuery {
  const searchTerm = filters.searchTerm.trim()

  return {
    pageNumber,
    pageSize,
    inStockOnly: !filters.showDepleted,
    ...(searchTerm ? { searchTerm } : {}),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.slotId ? { slotId: filters.slotId } : {}),
  }
}
