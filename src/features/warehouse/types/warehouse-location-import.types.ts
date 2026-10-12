import type {
  SpreadsheetImportField,
  SpreadsheetImportSheet,
} from '@/components/operations/spreadsheet-import.types'
import type {
  WarehouseLocationImportKind,
  WarehouseLocationImportMode,
} from '../schemas/warehouse-location-import.schema'

export interface WarehouseLocationImportInspection {
  readonly schemaVersion: number
  readonly mode: WarehouseLocationImportMode
  readonly isCsv: boolean
  readonly csvDelimiter: string | null
  readonly fieldsByKind: Partial<
    Record<WarehouseLocationImportKind, readonly SpreadsheetImportField[]>
  >
  readonly sheetsByKind: Partial<
    Record<WarehouseLocationImportKind, readonly SpreadsheetImportSheet[]>
  >
}
export interface WarehouseLocationImportSource {
  readonly sheetId: string
  readonly sheetName: string
  readonly rowNumber: number
}
export interface WarehouseLocationImportIssue {
  readonly code: string
  readonly severity: string
  readonly field: string
  readonly message: string
  readonly source: WarehouseLocationImportSource
}
export interface WarehouseLocationImportRow {
  readonly rowKey: string
  readonly kind: WarehouseLocationImportKind
  readonly source: WarehouseLocationImportSource
  readonly action: 'Create' | 'Reference' | 'Invalid'
  readonly canSelect: boolean
  readonly values: Readonly<Record<string, string>>
  readonly sourceValues: Readonly<Record<string, string>>
  readonly existingEntityId?: string | null
  readonly existingRowVersion?: string | null
  readonly parentEntityId?: string | null
  readonly displayPath: string
  readonly requiredParentRowKeys: readonly string[]
  readonly issues: readonly WarehouseLocationImportIssue[]
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>
}
export interface WarehouseLocationImportPreview {
  readonly schemaVersion: number
  readonly warehouseId: string
  readonly warehouseCode: string
  readonly warehouseName: string
  readonly fileName: string
  readonly previewFingerprint: string
  readonly capabilities: {
    readonly canImport: boolean
    readonly canViewLayout: boolean
    readonly canEditLayout: boolean
  }
  readonly rows: readonly WarehouseLocationImportRow[]
  readonly ignoredSheets: readonly string[]
  readonly ignoredColumns: readonly {
    kind: WarehouseLocationImportKind
    sheetId: string
    columnIndex: number
    header: string
  }[]
  readonly fileWarnings: readonly string[]
  readonly summary: {
    totalRows: number
    createRows: number
    referenceRows: number
    invalidRows: number
  }
}
export interface WarehouseLocationImportResult {
  readonly createdCounts: { zones: number; racks: number; slots: number }
  readonly created: readonly {
    rowKey: string
    kind: WarehouseLocationImportKind
    id: string
    code: string
    displayPath: string
  }[]
  readonly referenceCounts: number
  readonly unselectedCounts: number
  readonly layoutNeedsArrangement: boolean
}
