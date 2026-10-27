import type { ReturnGoodsPreviewRow } from '@/components/operations/ReturnGoodsPreview'
import {
  formatInventoryLocation,
  formatInventoryQuantity,
  formatQualityStatus,
} from '@/features/inventory/utils/inventory-format'
import type { SupplierReturn } from '../types/supplier-return.types'

export const SUPPLIER_RETURN_GOODS_COLUMNS = [
  'Mã hàng',
  'Tên hàng',
  'ĐVT',
  'SL yêu cầu trả',
  'SL đã giao trả',
  'Tình trạng hàng',
  'Vị trí lấy hàng',
  'Lô',
] as const

export function supplierReturnGoodsRows(document: SupplierReturn): ReturnGoodsPreviewRow[] {
  return document.items.map((line) => ({
    id: line.id,
    cells: [
      line.sku,
      line.productName,
      line.unit || '—',
      formatInventoryQuantity(line.quantity),
      line.deliveredQuantity == null
        ? document.status === 'Completed'
          ? 'Chưa ghi nhận'
          : 'Chưa giao'
        : formatInventoryQuantity(line.deliveredQuantity),
      formatQualityStatus(line.qualityStatus),
      formatInventoryLocation(line),
      line.lotNumber || 'Không theo lô',
    ],
  }))
}
