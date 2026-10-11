import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferDetail } from '../types/transfer.types'
import { visibleTransferItems } from './transfer-form'

export type TransferDiscrepancyState = 'none' | 'open' | 'resolved'

/** Dòng hàng hiển thị trong bảng chi tiết hàng hóa (mọi số lượng theo ĐVT chính). */
export interface TransferGoodsRow {
  readonly id: string
  readonly sku: string
  readonly name: string
  readonly unit: string
  readonly conversion: string | null
  readonly requested: number
  readonly batched: number
  readonly picked: number
  readonly dispatched: number
  readonly receivedGood: number
  readonly damaged: number
  readonly missing: number
  readonly stopped: number
  readonly unbatched: number
  readonly discrepancy: TransferDiscrepancyState
  /** "Khu / Kệ / Ô" gợi ý ở kho nhập; null khi chưa chọn hoặc người xem không thuộc kho nhập. */
  readonly destinationSlot: string | null
  /** Nơi hàng được giữ chỗ để lấy; null khi người xem không thuộc kho xuất. */
  readonly allocations: readonly string[] | null
}

export function transferGoodsRows(detail: TransferDetail | undefined | null): TransferGoodsRow[] {
  if (!detail) return []
  return visibleTransferItems(detail.items).map((item) => {
    const related = (detail.discrepancies ?? []).filter((entry) => entry.itemId === item.id)
    const baseUnit = item.baseUnitName ?? ''
    return {
      id: item.id,
      sku: item.sku,
      name: item.productName,
      unit: baseUnit || '—',
      conversion:
        item.unitId &&
        item.baseUnitId &&
        item.unitId !== item.baseUnitId &&
        item.unitName &&
        item.conversionFactor > 0
          ? `1 ${item.unitName} = ${formatQuantity(item.conversionFactor)} ${baseUnit}`
          : null,
      requested: item.quantity,
      batched: item.batchedQuantity,
      picked: item.pickedQuantity,
      dispatched: item.dispatchedQuantity,
      receivedGood: item.receivedQuantity,
      damaged: item.damagedQuantity,
      missing: item.missingQuantity,
      stopped: item.stoppedQuantity,
      unbatched: item.unbatchedQuantity,
      discrepancy:
        related.length === 0 ? 'none' : related.some((entry) => entry.isOpen) ? 'open' : 'resolved',
      destinationSlot: item.destinationSlotPath ?? item.destinationSlotCode ?? null,
      allocations: item.allocations
        ? item.allocations.map(
            (allocation) =>
              `${allocation.location}${allocation.lotNumber ? ` · lô ${allocation.lotNumber}` : ''}: ${formatQuantity(allocation.quantity)}`
          )
        : null,
    }
  })
}
