import { escapeBulkImportCsvCell } from '@/components/operations/bulk-import'
import type { BulkImportResultItem } from '@/components/operations/BulkImportResult'
import type { ImportProductsRequest } from '../types/product.types'
import type {
  ProductImportInspect,
  ProductImportOptions,
  ProductImportPreview,
  ProductImportPreviewRow,
  ProductImportSheet,
  ProductImportSheetOptions,
} from '../types/product-import.types'

export function productImportSheetLabel(sheetName: string): string {
  const normalized = sheetName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[\s_-]/g, '')
    .toLowerCase()
  switch (normalized) {
    case 'hanghoa':
      return 'Hàng hóa'
    case 'vattuhanghoa':
      return 'Vật tư hàng hóa'
    case 'quydoi':
      return 'Quy đổi'
    case 'donviquydoi':
      return 'Đơn vị quy đổi'
    default:
      return sheetName
  }
}

export function suggestedImportSheet(
  sheet: ProductImportSheet,
  kind: 'main' | 'conversions'
): ProductImportSheetOptions {
  const candidates = (
    kind === 'main' ? sheet.mainHeaderCandidates : sheet.conversionHeaderCandidates
  ).filter((candidate) => candidate.hasAllRequiredFields)
  const candidate = candidates.length === 1 ? candidates[0] : undefined
  return {
    sheetId: sheet.sheetId,
    headerRowNumber: candidate?.rowNumber ?? 1,
    columnMapping: candidate?.suggestedMapping ?? [],
  }
}

export function defaultProductImportOptions(inspect: ProductImportInspect): ProductImportOptions {
  const choices = inspect.sheets.flatMap((sheet) =>
    sheet.mainHeaderCandidates
      .filter((candidate) => candidate.hasAllRequiredFields)
      .map((candidate) => ({ sheet, candidate }))
  )
  const uniqueChoice = choices.length === 1 ? choices[0] : undefined
  const main = uniqueChoice
    ? {
        sheetId: uniqueChoice.sheet.sheetId,
        headerRowNumber: uniqueChoice.candidate.rowNumber,
        columnMapping: uniqueChoice.candidate.suggestedMapping,
      }
    : {
        sheetId: inspect.isCsv && inspect.sheets.length === 1 ? inspect.sheets[0]!.sheetId : '',
        headerRowNumber: 1,
        columnMapping: [],
      }
  return {
    main,
    conversions: null,
    csvDelimiter: (inspect.csvDelimiter ?? 'auto') as ProductImportOptions['csvDelimiter'],
    schemaVersion: inspect.schema.version,
  }
}

export function isValidProductImportRow(row: ProductImportPreviewRow) {
  return (
    row.errors.length === 0 &&
    row.unit !== null &&
    row.category !== null &&
    row.unitConversions.every(
      (child) => child.errors.length === 0 && child.unit !== null && child.conversionFactor !== null
    )
  )
}

export function selectedProductImportRows(
  preview: ProductImportPreview,
  selected: readonly number[]
) {
  if (preview.fileErrors.length || preview.schemaVersion !== 1) return []
  const selection = new Set(selected)
  return preview.rows.filter((row) => selection.has(row.rowNumber) && isValidProductImportRow(row))
}

export function productImportPayload(
  preview: ProductImportPreview,
  selected: readonly number[]
): ImportProductsRequest {
  const rows = selectedProductImportRows(preview, selected)
  if (!rows.length) throw new Error('Chọn ít nhất một sản phẩm hợp lệ.')
  const used = new Set(
    rows.flatMap((row) => [
      row.unit?.id,
      row.category?.id,
      ...row.unitConversions.map((conversion) => conversion.unit?.id),
    ])
  )
  const newCatalogs = (preview.newCatalogs ?? []).filter((draft) => used.has(draft.id))
  return {
    ...(newCatalogs.length ? { newCatalogs, confirmCreateCatalogs: true } : {}),
    items: rows.map((row) => ({
      rowNumber: row.rowNumber,
      sku: row.sku,
      productName: row.productName,
      description: row.description,
      unitId: row.unit!.id,
      categoryId: row.category!.id,
      isLotTracked: row.isLotTracked,
      shelfLifeDays: row.shelfLifeDays,
      unitConversions: row.unitConversions.map((child) => ({
        unitId: child.unit!.id,
        conversionFactor: child.conversionFactorText ?? child.conversionFactor!,
        sourceRowNumber: child.rowNumber,
        sourceSheetName: child.sheetName,
      })),
    })),
  }
}

export function productImportResult(
  preview: ProductImportPreview,
  selected: readonly number[]
): BulkImportResultItem[] {
  const imported = new Set(selectedProductImportRows(preview, selected).map((row) => row.rowNumber))
  return preview.rows.map((row) => ({
    rowNumber: row.rowNumber,
    label: `${row.sku} · ${row.productName}`,
    isImported: imported.has(row.rowNumber),
    result: imported.has(row.rowNumber)
      ? 'Đã nhập'
      : row.errors.length
        ? `Bỏ qua: ${row.errors.map((issue) => issue.message).join(' ')}`
        : 'Bỏ qua: không được chọn',
  }))
}

export function productImportReportCsv(
  preview: ProductImportPreview,
  imported?: readonly number[]
) {
  const selection = new Set(imported)
  const headings = [
    'Trang tính',
    'Dòng',
    'Mã hàng',
    'Tên hàng',
    'Trạng thái',
    'Lỗi/cảnh báo',
    'ĐVT chính',
    'Đơn vị quy đổi',
  ]
  const records: (string | number)[][] = preview.rows.map((row) => [
    row.sheetName,
    row.rowNumber,
    row.sku,
    row.productName,
    imported
      ? selection.has(row.rowNumber)
        ? 'Đã nhập'
        : 'Bỏ qua'
      : isValidProductImportRow(row)
        ? 'Hợp lệ'
        : 'Không hợp lệ',
    [...row.errors, ...row.warnings].map((issue) => issue.message).join('\n'),
    row.unit?.name ?? row.unitValue,
    row.unitConversions
      .map(
        (child) =>
          `${child.sheetName}:${child.rowNumber} — 1 ${child.unit?.name ?? child.unitValue} = ${child.conversionFactorText ?? child.conversionFactor ?? '?'} ${row.unit?.name ?? row.unitValue}${child.errors.length ? ` (${child.errors.map((issue) => issue.message).join('; ')})` : ''}`
      )
      .join('\n'),
  ])
  for (const issue of [...preview.fileErrors, ...preview.warnings])
    records.push([
      issue.source?.sheetName ?? '',
      issue.source?.rowNumber ?? '',
      '',
      '',
      preview.fileErrors.includes(issue) ? 'Lỗi tệp' : 'Cảnh báo tệp',
      issue.message,
      '',
      '',
    ])
  return (
    '\uFEFF' +
    [headings, ...records]
      .map((record) => record.map(escapeBulkImportCsvCell).join(','))
      .join('\r\n')
  )
}

export function toggleImportSelection(
  selected: readonly number[],
  rows: readonly number[],
  checked: boolean
) {
  const changed = new Set(rows)
  return checked
    ? [...new Set([...selected, ...rows])]
    : selected.filter((row) => !changed.has(row))
}

export function importSelectionState(
  selected: readonly number[],
  visible: readonly number[]
): boolean | 'indeterminate' {
  const selection = new Set(selected)
  const count = visible.filter((row) => selection.has(row)).length
  return count === 0 ? false : count === visible.length ? true : 'indeterminate'
}
