import { useMemo, useState } from 'react'
import { useInventoryQuery } from '@/features/inventory/hooks/use-inventory'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { LayoutViewerInventoryState } from '../types/warehouse-layout-viewer.types'
import type { WarehouseLayoutSelection } from '../types/warehouse-layout-scene.types'

export function useLayoutViewerInventory(warehouseId: string): LayoutViewerInventoryState {
  const [selection, setSelection] = useState<WarehouseLayoutSelection | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const debouncedInventorySearchTerm = useDebouncedValue(inventorySearchTerm.trim(), 300)
  const inventoryParams = useMemo(() => {
    const base = {
      pageNumber,
      pageSize,
      warehouseId,
      inStockOnly: true,
      ...(debouncedInventorySearchTerm ? { searchTerm: debouncedInventorySearchTerm } : {}),
    }
    if (!selection || selection.kind === 'decoration') return base
    if (selection.kind === 'zone') return { ...base, zoneId: selection.id }
    if (selection.kind === 'rack') return { ...base, rackId: selection.id }
    return { ...base, slotId: selection.id }
  }, [debouncedInventorySearchTerm, pageNumber, pageSize, selection, warehouseId])
  const inventoryQuery = useInventoryQuery(
    inventoryParams,
    Boolean(selection && selection.kind !== 'decoration')
  )

  return {
    selection,
    setSelection,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    inventorySearchTerm,
    setInventorySearchTerm,
    debouncedInventorySearchTerm,
    inventoryQuery,
  }
}
