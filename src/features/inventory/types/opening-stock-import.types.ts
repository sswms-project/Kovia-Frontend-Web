import type { SpreadsheetImportInspection } from '@/components/operations/spreadsheet-import.types'
import type { OpeningStockImportOptions } from '../schemas/opening-stock-import.schema'
import type { InventoryEligibilityStatus, QualityStatus } from './inventory.types'

export type OpeningStockImportInspection = SpreadsheetImportInspection
export interface OpeningStockFormOptions {
  products: {
    id: string
    sku: string
    productName: string
    unitId: string
    unitName: string
    isLotTracked: boolean
    quantityPrecision: number
    units?: {
      unitId: string
      unitName: string
      conversionFactor: number
      quantityPrecision: number
    }[]
  }[]
  locations: {
    id: string
    label: string
    capacity?: number | null
    capacityUnitName?: string | null
    remainingCapacity?: number | null
    requiresCapacityConfiguration?: boolean
  }[]
  lots: {
    id: string
    lotNumber: string
    manufacturedDate: string | null
    expiryDate: string | null
    status: string
  }[]
  productCount: number
  locationCount: number
  lotCount: number
}
export interface OpeningStockLookupQuery {
  warehouseId: string
  productSearch: string
  locationSearch: string
  productId: string
  lotSearch: string
}
export interface OpeningStockPendingLot {
  lotNumber: string
  manufacturedDate: string | null
  expiryDate: string | null
}
export interface OpeningStockImportRow {
  rowKey: string
  rowNumber: number
  sheetName: string
  rawValues: Readonly<Record<string, string>>
  productId: string | null
  sku: string
  productName: string
  slotId: string | null
  locationLabel: string
  unitId: string | null
  unitName: string
  quantity: number | null
  quantityText: string | null
  lotId: string | null
  lotNumber: string | null
  manufacturedDate: string | null
  expiryDate: string | null
  newLot: OpeningStockPendingLot | null
  qualityStatus: QualityStatus
  eligibilityStatus: InventoryEligibilityStatus
  fieldErrors: Readonly<Record<string, readonly string[]>>
  errors: readonly string[]
  warnings: readonly string[]
  isValid: boolean
  validationFingerprint: string
}
export interface OpeningStockImportPreview {
  schemaVersion: number
  fileName: string
  fileHash: string
  warehouseId: string
  effectiveDate: string
  rows: readonly OpeningStockImportRow[]
  totalCount: number
  validCount: number
  invalidCount: number
  selectedRowKeys: readonly string[]
  previewFingerprint: string
  selectedSetFingerprint: string
  checkedAt: string
  selectionErrors: readonly string[]
  ignoredSheets: readonly string[]
  ignoredColumns: readonly string[]
}
export interface OpeningStockImportCommit {
  options: OpeningStockImportOptions
  previewFingerprint: string
  selectedSetFingerprint: string
  rowFingerprints: Readonly<Record<string, string>>
  commandId: string
  acceptedIgnoredData: boolean
  acknowledgePendingLots: boolean
  formVersion: 1
}
export interface OpeningStockImportOperation {
  status: 'Unknown' | 'Completed'
  id: string | null
  code: string | null
}
