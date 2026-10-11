import { escapeBulkImportCsvCell } from '@/components/operations/bulk-import'
import type {
  WarehouseLocationImportKind,
  WarehouseLocationImportOptions,
} from '../schemas/warehouse-location-import.schema'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportPreview,
  WarehouseLocationImportRow,
} from '../types/warehouse-location-import.types'

export const LOCATION_IMPORT_KINDS = ['Zone', 'Rack', 'Slot'] as const
export const LOCATION_IMPORT_LABELS = { Zone: 'Khu vực', Rack: 'Kệ', Slot: 'Vị trí' } as const
export const LOCATION_IMPORT_MODES = {
  Slots: 'Thêm vị trí',
  Zones: 'Thêm khu vực',
  Racks: 'Thêm kệ',
  Structure: 'Thiết lập cấu trúc đầy đủ',
} as const

export function locationImportKinds(
  mode: WarehouseLocationImportOptions['mode']
): readonly WarehouseLocationImportKind[] {
  return mode === 'Structure'
    ? LOCATION_IMPORT_KINDS
    : [mode === 'Zones' ? 'Zone' : mode === 'Racks' ? 'Rack' : 'Slot']
}

/** Suggestions are not decisions: do not reuse a sheet or guess an ambiguous winner. */
export function initialLocationImportOptions(
  inspection: WarehouseLocationImportInspection,
  delimiter: WarehouseLocationImportOptions['csvDelimiter']
): WarehouseLocationImportOptions {
  const used = new Set<string>()
  const tables: WarehouseLocationImportOptions['tables'] = []
  for (const kind of locationImportKinds(inspection.mode)) {
    const ranked = (inspection.sheetsByKind[kind] ?? [])
      .filter((sheet) => !used.has(sheet.sheetId))
      .flatMap((sheet) =>
        sheet.headerCandidates.map((header) => ({
          sheet,
          header,
          score: header.suggestedMapping.length,
        }))
      )
      .sort((a, b) => b.score - a.score)
    const winner = ranked[0]
    if (!winner || winner.score === 0 || ranked[1]?.score === winner.score) continue
    used.add(winner.sheet.sheetId)
    tables.push({
      kind,
      sheetId: winner.sheet.sheetId,
      headerRowNumber: winner.header.rowNumber,
      columnMapping: [...winner.header.suggestedMapping],
    })
  }
  return { mode: inspection.mode, schemaVersion: 1, csvDelimiter: delimiter, tables }
}

export function missingLocationImportParents(
  rows: readonly WarehouseLocationImportRow[],
  selected: ReadonlySet<string>
) {
  return [
    ...new Set(
      rows
        .filter((row) => selected.has(row.rowKey))
        .flatMap((row) => row.requiredParentRowKeys)
        .filter((key) => !selected.has(key))
    ),
  ]
}

export function locationImportSelectionCounts(
  rows: readonly WarehouseLocationImportRow[],
  selected: ReadonlySet<string>
) {
  const result = { Zone: 0, Rack: 0, Slot: 0 }
  for (const row of rows) if (selected.has(row.rowKey) && row.canSelect) result[row.kind] += 1
  return result
}

export function locationImportReport(
  preview: Pick<WarehouseLocationImportPreview, 'rows'>,
  imported?: ReadonlySet<string>
) {
  const headers = [
    'Trang tính',
    'Dòng',
    'Loại',
    'Đường dẫn',
    'Hành động',
    'Kết quả',
    'Lỗi cần sửa',
    'Thông tin trong tệp',
  ]
  return [
    headers,
    ...preview.rows.map((row) => [
      row.source.sheetName,
      row.source.rowNumber,
      LOCATION_IMPORT_LABELS[row.kind],
      row.displayPath,
      row.action === 'Create'
        ? 'Sẽ tạo mới'
        : row.action === 'Reference'
          ? 'Đã có — không tạo lại'
          : 'Cần sửa',
      imported
        ? imported.has(row.rowKey)
          ? 'Đã nhập'
          : row.action === 'Reference'
            ? 'Đã có — không tạo lại'
            : 'Không nhập'
        : row.issues.map((issue) => issue.message).join(' | '),
      row.issues.map((issue) => issue.message).join(' | '),
      JSON.stringify(row.sourceValues),
    ]),
  ]
    .map((cells) => cells.map(escapeBulkImportCsvCell).join(','))
    .join('\r\n')
}
