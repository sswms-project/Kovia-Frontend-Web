import { getRoleLabel } from '@/config/roles'
import { formatDisplayDate } from '@/lib/date-format'
import { formatStockIssueQuantity } from '@/features/stock-issue/utils/stock-issue-format'
import type { ProductLot, ProductListItem } from '@/features/product/types/product.types'
import type { StaffResponse } from '@/features/staff/types/staff.types'
import type { StockRecipient } from '@/features/stock-recipient/types/stock-recipient.types'
import type { Supplier } from '@/features/supplier/types/supplier.types'
import type { LocationSearchResponse } from '@/features/warehouse/types/warehouse.types'
import type { WarehouseResponse } from '@/types/warehouse'
import type { AiEntityOption, AiEntityPage } from '../types/ai-entity-selector.types'

// Pure backend record -> option mappers. `value` is always the record's GUID.

export function toAiEntityPage<TItem>(
  result: { readonly items: readonly TItem[]; readonly totalCount: number },
  toOption: (item: TItem) => AiEntityOption
): AiEntityPage {
  return { options: result.items.map(toOption), totalCount: result.totalCount }
}

const withName = (code: string, name: string) => `${code} - ${name}`

export function warehouseOption(warehouse: WarehouseResponse): AiEntityOption {
  return {
    value: warehouse.id,
    label: withName(warehouse.warehouseCode, warehouse.warehouseName),
    code: warehouse.warehouseCode,
  }
}

export function productOption(product: ProductListItem): AiEntityOption {
  return {
    value: product.id,
    label: withName(product.sku, product.productName),
    code: product.sku,
    description: `Đơn vị: ${product.unitName}`,
  }
}

export function recipientOption(recipient: StockRecipient): AiEntityOption {
  return {
    value: recipient.id,
    label: withName(recipient.recipientCode, recipient.recipientName),
    code: recipient.recipientCode,
  }
}

export function supplierOption(supplier: Supplier): AiEntityOption {
  return {
    value: supplier.id,
    label: withName(supplier.supplierCode, supplier.supplierName),
    code: supplier.supplierCode,
  }
}

/** A business document is identified by its code; its status is the helper line. */
export function documentOption(id: string, code: string, statusLabel?: string): AiEntityOption {
  return { value: id, label: code, code, description: statusLabel }
}

export function lotOption(lot: ProductLot): AiEntityOption {
  const expiry = lot.expiryDate
    ? `HSD ${formatDisplayDate(new Date(lot.expiryDate))}`
    : 'Không có HSD'
  return {
    value: lot.id,
    label: lot.lotNumber,
    code: lot.lotNumber,
    description: `${expiry} · Khả dụng ${formatStockIssueQuantity(lot.availableQuantity)}`,
  }
}

export function locationOption(location: LocationSearchResponse): AiEntityOption {
  const parents = [
    location.zoneCode && `Khu ${location.zoneCode}`,
    location.rackCode && `Kệ ${location.rackCode}`,
  ].filter(Boolean)
  return {
    value: location.id,
    label: location.name ? withName(location.code, location.name) : location.code,
    code: location.code,
    description: parents.length > 0 ? parents.join(' · ') : undefined,
  }
}

export function staffOption(staff: StaffResponse): AiEntityOption {
  return {
    value: staff.id,
    label: staff.fullName,
    description: [staff.email, staff.role ? getRoleLabel(staff.role) : null]
      .filter(Boolean)
      .join(' · '),
  }
}
