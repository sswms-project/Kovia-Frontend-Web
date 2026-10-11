export type CatalogImportKind = 'units' | 'categories'
export interface CatalogImportItem {
  rowNumber: number
  code: string
  name: string
  parentCode: string | null
  symbol: string | null
  quantityPrecision: number
  description: string | null
}
export interface CatalogImportRow extends CatalogImportItem {
  errors: string[]
  fieldErrors: Record<string, string[]>
  parentPath: string | null
}
