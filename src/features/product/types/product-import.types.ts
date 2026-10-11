export interface ProductImportColumnMapping {
  field: string
  columnIndex: number
}
export interface ProductImportSheetOptions {
  sheetId: string
  headerRowNumber: number
  columnMapping: ProductImportColumnMapping[]
}
export interface ProductImportOptions {
  main: ProductImportSheetOptions
  conversions: ProductImportSheetOptions | null
  csvDelimiter: 'auto' | ',' | ';' | '\t'
  schemaVersion: number
  referenceChoices?: ProductImportReferenceChoice[]
  newCatalogs?: ProductImportCatalogDraft[]
  confirmCreateCatalogs?: boolean
}
export interface ProductImportField {
  field: string
  displayName: string
  isRequired: boolean
  aliases: string[]
  description: string
  defaultValue: string | null
}
export interface ProductImportColumn {
  columnIndex: number
  letter: string
  header: string
}
export interface ProductImportHeaderCandidate {
  rowNumber: number
  hasAllRequiredFields: boolean
  suggestedMapping: ProductImportColumnMapping[]
  columns: ProductImportColumn[]
}
export interface ProductImportSheet {
  sheetId: string
  sheetName: string
  dataRowCount: number
  mainHeaderCandidates: ProductImportHeaderCandidate[]
  conversionHeaderCandidates: ProductImportHeaderCandidate[]
  sampleRows: { rowNumber: number; values: Record<string, string> }[]
  columns?: ProductImportColumn[]
  mappingRows?: { rowNumber: number; values: Record<string, string> }[]
}
export interface ProductImportInspect {
  schema: {
    version: number
    templateVersion: string
    mainFields: ProductImportField[]
    conversionFields: ProductImportField[]
    limits: {
      maxUploadBytes: number
      maxProducts: number
      maxConversions: number
      maxSheets: number
      maxColumns: number
      maxCellLength: number
      maxPhysicalRows: number
    }
  }
  isCsv: boolean
  csvDelimiter: string | null
  sheets: ProductImportSheet[]
}
export interface ProductImportIssue {
  code: string
  field: string | null
  message: string
  source: { sheetName: string; rowNumber: number; columnIndex: number | null } | null
}
export interface ProductImportReference {
  id: string
  code: string
  name: string
  path?: string | null
}
export interface ProductImportConversionRow {
  rowNumber: number
  sheetName: string
  unitValue: string
  unit: ProductImportReference | null
  conversionFactor: number | null
  conversionFactorText?: string | null
  errors: ProductImportIssue[]
}
export interface ProductImportPreviewRow {
  rowNumber: number
  sheetName: string
  sku: string
  productName: string
  description: string | null
  unitValue: string
  categoryValue: string
  unit: ProductImportReference | null
  category: ProductImportReference | null
  isLotTracked: boolean
  shelfLifeDays: number | null
  unitConversions: ProductImportConversionRow[]
  errors: ProductImportIssue[]
  warnings: ProductImportIssue[]
}
export interface ProductImportMappedSheet extends ProductImportSheetOptions {
  sheetName: string
  ignoredColumns: ProductImportColumn[]
}
export interface ProductImportPreview {
  schemaVersion: number
  summary: { products: number; validProducts: number; invalidProducts: number; conversions: number }
  main: ProductImportMappedSheet
  conversions: ProductImportMappedSheet | null
  rows: ProductImportPreviewRow[]
  fileErrors: ProductImportIssue[]
  warnings: ProductImportIssue[]
  missingReferences?: ProductImportMissingReference[]
  newCatalogs?: ProductImportCatalogDraft[]
  availableUnits?: ProductImportReference[]
  availableCategories?: ProductImportReference[]
}

export interface ProductImportCatalogDraft {
  id: string
  categories: boolean
  item: import('./catalog-import.types').CatalogImportItem
}
export interface ProductImportReferenceChoice {
  categories: boolean
  value: string
  id: string
}
export interface ProductImportMissingReference {
  categories: boolean
  value: string
  id: string
  suggestedCode: string
  productRows: number[]
  canCreate: boolean
}
