import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import type { CycleCountItemInput } from '../components/CreateCycleCountPage/types'
import { formatInventoryLocation } from '@/features/inventory/utils/inventory-format'

type StockScope = Pick<InventoryStock, 'productId' | 'slotId' | 'lotId' | 'qualityStatus'>

export function getStockScopeKey(stock: StockScope): string {
  return `${stock.productId}:${stock.slotId}:${stock.lotId ?? ''}:${stock.qualityStatus}`
}

export function toCycleCountItemInput(stock: InventoryStock): CycleCountItemInput {
  return {
    productId: stock.productId,
    slotId: stock.slotId,
    lotId: stock.lotId,
    qualityStatus: stock.qualityStatus,
  }
}

export function formatStockLocation(
  stock: Pick<InventoryStock, 'slotCode' | 'rackCode' | 'isSystemDefaultSlot'> & {
    readonly zoneCode?: string | null
    readonly zoneName?: string | null
    readonly rackName?: string | null
  }
): string {
  const location = formatInventoryLocation({
    ...stock,
    zoneCode: [stock.zoneCode, stock.zoneName].filter(Boolean).join(' · ') || null,
    rackCode: [stock.rackCode, stock.rackName].filter(Boolean).join(' · ') || null,
  })
  return location || '—'
}
