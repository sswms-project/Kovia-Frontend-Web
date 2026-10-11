export interface SpreadsheetImportField {
  readonly field: string
  readonly displayName: string
  readonly isRequired: boolean
  readonly aliases: readonly string[]
  readonly description: string
  readonly defaultValue?: string | null
}
export interface SpreadsheetImportColumn {
  readonly columnIndex: number
  readonly letter: string
  readonly header: string
}
export interface SpreadsheetImportColumnMapping {
  readonly field: string
  readonly columnIndex: number
}
export interface SpreadsheetImportOptions {
  readonly sheetId: string
  readonly headerRowNumber: number
  readonly columnMapping: readonly SpreadsheetImportColumnMapping[]
  readonly csvDelimiter?: string
  readonly schemaVersion?: number
}
export interface SpreadsheetImportHeader {
  readonly rowNumber: number
  readonly hasAllRequiredFields: boolean
  readonly suggestedMapping: readonly SpreadsheetImportColumnMapping[]
  readonly columns: readonly SpreadsheetImportColumn[]
}
export interface SpreadsheetImportSample {
  readonly rowNumber: number
  readonly values: Readonly<Record<number, string>>
}
export interface SpreadsheetImportSheet {
  readonly sheetId: string
  readonly sheetName: string
  readonly headerCandidates: readonly SpreadsheetImportHeader[]
  readonly sampleRows: readonly SpreadsheetImportSample[]
  readonly mappingRows?: readonly SpreadsheetImportSample[]
}
export interface SpreadsheetImportInspection {
  readonly schemaVersion: number
  readonly fields: readonly SpreadsheetImportField[]
  readonly isCsv: boolean
  readonly csvDelimiter: string | null
  readonly sheets: readonly SpreadsheetImportSheet[]
}
export interface SpreadsheetImportPreviewInput {
  readonly file: File
  readonly options?: SpreadsheetImportOptions
}
