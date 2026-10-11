export interface UnitResponse {
  id: string
  unitCode: string
  unitName: string
  symbol: string | null
  quantityPrecision: number
  description: string | null
  status: MasterDataStatus
  createdAt: string
  modifiedAt: string | null
}

export interface CategoryResponse {
  id: string
  parentCategoryId: string | null
  categoryCode: string
  categoryName: string
  description: string | null
  status: ProductStatus
  level: number
  categoryPath: string
  hasChildren: boolean
  createdAt: string
  modifiedAt: string | null
}

export type MasterDataStatus = 'Active' | 'Inactive'
export type ProductStatus = 'Active' | 'Inactive'

export interface SaveUnitRequest {
  unitCode: string
  unitName: string
  symbol: string | null
  quantityPrecision: number
  description: string | null
}

export interface SaveCategoryRequest {
  categoryCode: string
  categoryName: string
  parentCategoryId: string | null
  description: string | null
}

export interface ProductResponse {
  id: string
  sku: string
  productName: string
  description: string | null
  imageUrl: string | null
  unitId: string
  unitName: string
  categoryId: string | null
  categoryName: string | null
  categoryCode: string | null
  categoryPath: string | null
  status: ProductStatus
  barcodeValue: string | null
  isLotTracked: boolean
  shelfLifeDays: number | null
  canChangeBaseUnit: boolean
  canChangeTrackingMode: boolean
  quantityOnHand: number
  reservedQuantity: number
  availableQuantity: number
  createdAt: string
}

export interface ProductListResponse {
  items: ProductListItem[]
  totalCount: number
  stockStatusCounts: ProductStockStatusCounts | null
}

export interface ProductStockStatusCounts {
  all: number
  lowStock: number
  outOfStock: number
}

export type ProductStockStatus = 'LowStock' | 'OutOfStock'

export type ProductListItem = Omit<
  ProductResponse,
  | 'canChangeBaseUnit'
  | 'canChangeTrackingMode'
  | 'quantityOnHand'
  | 'reservedQuantity'
  | 'availableQuantity'
> & {
  unitConversions?: readonly ProductUnitConversion[]
  quantityOnHand: number | null
  reservedQuantity: number | null
  availableQuantity: number | null
}

export interface ProductListQuery {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  categoryId?: string
  warehouseId?: string
  status?: ProductStatus
  isLotTracked?: boolean
  stockStatus?: ProductStockStatus
}

export interface CreateProductRequest {
  sku: string
  productName: string
  description: string | null
  unitId: string
  categoryId: string
  isLotTracked: boolean
  shelfLifeDays: number | null
}

export interface CreateProductWithConversionsRequest extends CreateProductRequest {
  unitConversions: CreateProductUnitConversionRequest[]
}

export interface UpdateProductRequest {
  productName: string
  description: string | null
  unitId: string
  categoryId: string
  isLotTracked: boolean
  shelfLifeDays: number | null
}

export interface ConfigureStockPolicyRequest {
  warehouseId: string | null
  applyToAllWarehouses: boolean
  preferredSlotId: string | null
  minStockThreshold: number
  maxStockThreshold: number | null
  reorderPoint: number | null
  safetyStock: number
  leadTimeDays: number | null
}

export interface ProductWarehousePolicy {
  id: string
  productId: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  preferredSlotId: string | null
  preferredSlotCode: string | null
  minStockThreshold: number
  maxStockThreshold: number | null
  reorderPoint: number | null
  safetyStock: number
  leadTimeDays: number | null
  abcClass: string | null
  abcClassifiedAt: string | null
  status: MasterDataStatus
  createdAt: string
  modifiedAt: string | null
}

export interface ProductUnitConversion {
  id: string
  productId: string
  unitId: string
  unitCode: string
  unitName: string
  unitSymbol: string | null
  quantityPrecision: number
  conversionFactor: number
  status: MasterDataStatus
  createdAt: string
  modifiedAt: string | null
}

export interface CreateProductUnitConversionRequest {
  unitId: string
  conversionFactor: number
}

export interface UpdateProductUnitConversionRequest {
  conversionFactor: number
}

export const PRODUCT_LOT_STATUSES = ['Active', 'Expired', 'Blocked'] as const
export type ProductLotStatus = (typeof PRODUCT_LOT_STATUSES)[number]

export interface ProductLotQuery {
  warehouseId?: string
  onlyAvailable?: boolean
  status?: ProductLotStatus
  expiresOnOrBefore?: string
}

export interface ProductLot {
  id: string
  productId: string
  lotNumber: string
  supplierId: string | null
  supplierName: string | null
  manufacturedDate: string | null
  expiryDate: string | null
  status: ProductLotStatus
  quantityOnHand: number
  reservedQuantity: number
  availableQuantity: number
}

export interface ProductLotImpactWarehouse {
  warehouseId: string
  warehouseName: string
  quantityOnHand: number
  reservedQuantity: number
  availableQuantity: number
  quarantineSlotId: string | null
  quarantineSlotCode: string | null
}

export interface ProductLotAffectedOrder {
  outboundOrderId: string
  orderCode: string
  status: string
  quantity: number
  warehouseName: string
}

export interface ProductLotImpact {
  lotId: string
  lotNumber: string
  status: ProductLotStatus
  warehouses: ProductLotImpactWarehouse[]
  affectedOrders: ProductLotAffectedOrder[]
}

export interface ImportProductItemRequest {
  rowNumber?: number
  sku: string
  productName: string
  description?: string | null
  unitId: string
  categoryId: string
  isLotTracked?: boolean
  shelfLifeDays?: number | null
  unitConversions?: {
    unitId: string
    conversionFactor: number | string
    sourceRowNumber: number
    sourceSheetName: string
  }[]
}

export interface ImportProductsRequest {
  newCatalogs?: import('./product-import.types').ProductImportCatalogDraft[]
  confirmCreateCatalogs?: boolean
  items: ImportProductItemRequest[]
}

export interface ProductSupplier {
  id: string
  productId: string
  productSKU: string
  productName: string
  supplierId: string
  supplierCode: string
  supplierName: string
  supplierStatus: 'Active' | 'Inactive'
  supplierProductCode: string | null
  isPreferred: boolean
  createdAt: string
  modifiedAt: string | null
}

export interface SaveProductSupplierRequest {
  supplierId: string
  supplierProductCode: string | null
  isPreferred: boolean
}

export type UpdateProductSupplierRequest = Omit<SaveProductSupplierRequest, 'supplierId'>
