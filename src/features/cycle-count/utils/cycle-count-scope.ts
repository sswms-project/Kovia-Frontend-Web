import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import type { CycleCountItemInput } from '../components/CreateCycleCountPage/types'

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
  stock: Pick<InventoryStock, 'slotCode' | 'rackCode' | 'isSystemDefaultSlot'>
): string {
  // Ô mặc định của hệ thống không có mã ô riêng nên phải hiển thị theo kệ.
  if (stock.isSystemDefaultSlot && stock.rackCode) return `Kệ ${stock.rackCode}`
  return stock.slotCode || '—'
}
