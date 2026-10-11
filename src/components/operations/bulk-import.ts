export const BULK_IMPORT_MAX_FILE_MB = 5
export const BULK_IMPORT_MAX_FILE_BYTES = BULK_IMPORT_MAX_FILE_MB * 1024 * 1024
export const BULK_IMPORT_FILE_EXTENSIONS = ['.xlsx', '.csv'] as const
export const BULK_IMPORT_ROWS_PER_PAGE = 50

export function hasBulkImportExtension(fileName: string) {
  const lowerCaseName = fileName.toLowerCase()
  return BULK_IMPORT_FILE_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension))
}

export interface BulkImportResultRow {
  readonly rowNumber: number
  readonly label: string
  readonly result: string
}

export function bulkImportResultsCsv(rows: readonly BulkImportResultRow[]) {
  return [
    'Dòng,Đối tượng,Kết quả',
    ...rows.map((row) =>
      [row.rowNumber, row.label, row.result].map(escapeBulkImportCsvCell).join(',')
    ),
  ].join('\r\n')
}

export function escapeBulkImportCsvCell(value: string | number) {
  const text = String(value)
  const safe = /^[\s]*[=+\-@]|^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function downloadBulkImportFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
