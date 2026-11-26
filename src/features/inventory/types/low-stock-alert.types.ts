export interface LowStockAlert {
  id: string
  productId: string
  sku: string | null
  productName: string | null
  productStatus: string | null
  warehouseId: string
  warehouseCode: string | null
  warehouseName: string | null
  warehouseStatus: string | null
  currentQuantity: number
  minThreshold: number
  unitName: string | null
  quantityPrecision: number | null
  status: string
  createdAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  acknowledgedByName: string | null
  resolvedByName: string | null
}
export interface LowStockAlertFilters {
  warehouseId?: string
  productId?: string
  searchTerm?: string
  statusFilter: string
  dateFrom?: string
  dateTo?: string
  pageNumber: number
  pageSize: number
}
export interface LowStockPage<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}
export interface LowStockWarehouse {
  id: string
  warehouseCode: string
  warehouseName: string
  status: string
}
export interface LowStockWarehousePage extends LowStockPage<LowStockWarehouse> {
  selectedOption: LowStockWarehouse | null
}
