import type {
  SpreadsheetImportInspection,
  SpreadsheetImportOptions,
  SpreadsheetImportSheet,
} from './spreadsheet-import.types'

export function initialSpreadsheetMapping(
  inspection: SpreadsheetImportInspection
): SpreadsheetImportOptions {
  const complete = inspection.sheets.flatMap((sheet) =>
    sheet.headerCandidates
      .filter((header) => header.hasAllRequiredFields)
      .map((header) => ({ sheet, header }))
  )
  const match = complete.length === 1 ? complete[0] : undefined
  return {
    schemaVersion: inspection.schemaVersion,
    csvDelimiter: inspection.csvDelimiter ?? 'auto',
    sheetId: match?.sheet.sheetId ?? '',
    headerRowNumber: match?.header.rowNumber ?? 0,
    columnMapping: match?.header.suggestedMapping ?? [],
  }
}

export function mappingForSheet(
  options: SpreadsheetImportOptions,
  sheet: SpreadsheetImportSheet
): SpreadsheetImportOptions {
  const complete = sheet.headerCandidates.filter((header) => header.hasAllRequiredFields)
  const header = complete.length === 1 ? complete[0] : undefined
  return {
    ...options,
    sheetId: sheet.sheetId,
    headerRowNumber: header?.rowNumber ?? 0,
    columnMapping: header?.suggestedMapping ?? [],
  }
}

export function spreadsheetMappingError(
  inspection: SpreadsheetImportInspection,
  options: SpreadsheetImportOptions
): string | undefined {
  const sheet = inspection.sheets.find((sheet) => sheet.sheetId === options.sheetId)
  const header = sheet?.headerCandidates.find(
    (header) => header.rowNumber === options.headerRowNumber
  )
  if (!header) return 'Chọn trang tính và dòng tiêu đề (từ dòng 1 đến 50).'
  if (
    inspection.fields.some(
      (field) =>
        field.isRequired && !options.columnMapping.some((mapping) => mapping.field === field.field)
    )
  )
    return 'Chưa ghép đủ các trường bắt buộc.'
  const indexes = options.columnMapping.map((mapping) => mapping.columnIndex)
  if (new Set(indexes).size !== indexes.length)
    return 'Một cột đang được ghép cho nhiều trường. Hãy chọn lại.'
  if (
    options.columnMapping.some(
      (mapping) =>
        !inspection.fields.some((field) => field.field === mapping.field) ||
        !header.columns.some((column) => column.columnIndex === mapping.columnIndex)
    )
  )
    return 'Cấu hình ghép cột không hợp lệ.'
  return undefined
}

export function spreadsheetIgnoredData(
  inspection: SpreadsheetImportInspection,
  options: SpreadsheetImportOptions
) {
  const sheet = inspection.sheets.find((sheet) => sheet.sheetId === options.sheetId)
  const header = sheet?.headerCandidates.find(
    (header) => header.rowNumber === options.headerRowNumber
  )
  return {
    sheets: inspection.sheets
      .filter((sheet) => sheet.sheetId !== options.sheetId)
      .map((sheet) => sheet.sheetName),
    columns:
      header?.columns.filter(
        (column) =>
          !options.columnMapping.some((mapping) => mapping.columnIndex === column.columnIndex)
      ) ?? [],
  }
}
