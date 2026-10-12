import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { BulkImportMappingFields } from './BulkImportWorkspace'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SpreadsheetImportColumnTable } from './SpreadsheetImportColumnTable'
import { mappingForSheet, spreadsheetMappingError } from './spreadsheet-import'
import type {
  SpreadsheetImportInspection,
  SpreadsheetImportOptions,
} from './spreadsheet-import.types'

export function BulkImportMapping({
  inspection,
  options,
  busy,
  error,
  onChange,
  onBack,
  onPreview,
}: {
  readonly inspection: SpreadsheetImportInspection
  readonly options: SpreadsheetImportOptions
  readonly busy: boolean
  readonly error: string | null
  readonly onChange: (options: SpreadsheetImportOptions) => void
  readonly onBack: () => void
  readonly onPreview: () => void
}) {
  const sheet = inspection.sheets.find((sheet) => sheet.sheetId === options.sheetId)
  const header = sheet?.headerCandidates.find(
    (header) => header.rowNumber === options.headerRowNumber
  )
  const mappingError = spreadsheetMappingError(inspection, options)
  return (
    <section
      className="flex min-w-0 shrink-0 flex-col gap-3"
      aria-label="Ghép cột nhập dữ liệu"
      aria-busy={busy}
    >
      <h2 className="shrink-0 font-semibold">Ghép cột</h2>
      <fieldset disabled={busy} className="flex min-w-0 shrink-0 flex-col gap-4">
        <BulkImportMappingFields>
          <Field>
            <FieldLabel htmlFor="party-import-sheet">Trang tính</FieldLabel>
            <NativeSelect
              id="party-import-sheet"
              value={options.sheetId}
              onChange={(event) => {
                const selected = inspection.sheets.find(
                  (sheet) => sheet.sheetId === event.target.value
                )
                if (selected) onChange(mappingForSheet(options, selected))
              }}
            >
              <NativeSelectOption value="">Chọn trang tính</NativeSelectOption>
              {inspection.sheets.map((sheet) => (
                <NativeSelectOption key={sheet.sheetId} value={sheet.sheetId}>
                  {sheet.sheetName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="party-import-header">Dòng tiêu đề</FieldLabel>
            <NativeSelect
              id="party-import-header"
              value={options.headerRowNumber || ''}
              onChange={(event) => {
                const selected = sheet?.headerCandidates.find(
                  (header) => header.rowNumber === Number(event.target.value)
                )
                onChange({
                  ...options,
                  headerRowNumber: selected?.rowNumber ?? 0,
                  columnMapping: selected?.suggestedMapping ?? [],
                })
              }}
            >
              <NativeSelectOption value="">Chọn dòng tiêu đề</NativeSelectOption>
              {sheet?.headerCandidates.map((header) => (
                <NativeSelectOption key={header.rowNumber} value={header.rowNumber}>
                  Dòng {header.rowNumber}
                  {header.hasAllRequiredFields ? ' — nhận diện đủ trường bắt buộc' : ''}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </BulkImportMappingFields>
        <p className="text-muted-foreground text-xs">
          Chọn dòng chứa tên cột, rồi đối chiếu ví dụ để ghép thông tin.
        </p>
        {header && sheet ? (
          <SpreadsheetImportColumnTable
            kind="party"
            label="dữ liệu"
            fields={inspection.fields}
            columns={header.columns}
            options={options}
            samples={sheet.mappingRows ?? sheet.sampleRows}
            error={mappingError}
            onColumnChange={(field, column) =>
              onChange({
                ...options,
                columnMapping: [
                  ...options.columnMapping.filter((mapping) => mapping.field !== field),
                  ...(column === '' ? [] : [{ field, columnIndex: Number(column) }]),
                ],
              })
            }
          />
        ) : null}
      </fieldset>
      {mappingError ? (
        <p id="import-party-error" className="text-muted-foreground shrink-0 text-sm" role="status">
          {mappingError}
        </p>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertTitle>Không thể kiểm tra dữ liệu</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onBack}>
          Chọn tệp khác
        </Button>
        <Button disabled={busy || Boolean(mappingError)} onClick={onPreview}>
          {busy ? 'Đang kiểm tra…' : 'Kiểm tra dữ liệu'}
        </Button>
      </div>
    </section>
  )
}
