import type {
  InventoryEligibilityStatus,
  QualityStatus,
  InventoryStock,
} from '@/features/inventory/types/inventory.types'

// Mirrors Kovia_BE Contract/Models/SupplierReturn/SupplierReturnResponses.cs.
export const SUPPLIER_RETURN_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
  'Draft',
] as const
export type SupplierReturnStatus = (typeof SUPPLIER_RETURN_STATUSES)[number]

export interface SupplierReturnItem {
  readonly availableQuantity?: number | null
  readonly zoneCode?: string | null
  readonly rackCode?: string | null
  readonly isSystemDefaultSlot?: boolean
  readonly quantityPrecision?: number | null
  readonly id: string
  readonly inventoryStockId: string
  readonly productId: string
  readonly sku: string
  readonly productName: string
  readonly unit: string
  readonly slotId: string
  readonly slotCode: string
  readonly lotId: string | null
  readonly lotNumber: string | null
  readonly qualityStatus: QualityStatus
  readonly eligibilityStatus: InventoryEligibilityStatus
  readonly quantity: number
  readonly deliveredQuantity: number | null
}

export interface SupplierReturn {
  readonly sourceGoodsReceiptId?: string | null
  readonly sourceGoodsReceiptCode?: string | null
  allowedActions?: readonly string[] | null
  history?: readonly import('@/types/return-document').ReturnDocumentEvent[] | null
  readonly version?: string | null
  readonly id: string
  readonly code: string
  readonly supplierId: string
  readonly supplierName: string
  readonly warehouseId: string
  readonly warehouseName: string
  readonly status: SupplierReturnStatus
  readonly reason: string
  readonly negotiationNote: string | null
  readonly damageCaseId: string | null
  readonly createdById: string
  readonly createdByName: string
  readonly createdAt: string
  readonly approvedAt: string | null
  readonly approvedByName: string | null
  readonly deliveredAt: string | null
  readonly deliveredByName: string | null
  readonly rejectionReason: string | null
  readonly cancellationReason: string | null
  readonly items: readonly SupplierReturnItem[]
}

export interface SupplierReturnSummary {
  readonly id: string
  readonly code: string
  readonly supplierName: string
  readonly warehouseName: string
  readonly status: SupplierReturnStatus
  readonly lineCount: number
  readonly totalQuantity: number
  readonly createdAt: string
}

export interface SupplierReturnListResponse {
  readonly items: readonly SupplierReturnSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
}

export interface SupplierReturnListQuery {
  readonly page: number
  readonly pageSize: number
  readonly warehouseId?: string
  readonly supplierId?: string
  readonly status?: SupplierReturnStatus
  readonly from?: string
  readonly to?: string
  readonly search?: string
}

export interface CreateSupplierReturnRequest {
  readonly sourceGoodsReceiptId: string
  readonly warehouseId: string
  readonly supplierId: string
  readonly lines: readonly { inventoryStockId: string; quantity: number }[]
  readonly reason: string
  readonly negotiationNote?: string
}

export interface SupplierReturnReceiptOption {
  readonly id: string
  readonly receiptCode: string
  readonly createdAt: string
}

export interface SupplierReturnStockOption extends InventoryStock {
  readonly sourceReceivedQuantity: number
  readonly sourceRemainingQuantity: number
  readonly returnableQuantity: number
  readonly unattributedReturnedQuantity: number
}

export interface SupplierReturnReasonRequest {
  readonly expectedVersion?: string | null
  readonly reason: string
}

export interface ConfirmSupplierReturnDeliveryRequest {
  readonly expectedVersion?: string | null
  readonly lines: readonly { itemId: string; deliveredQuantity: number }[]
}
