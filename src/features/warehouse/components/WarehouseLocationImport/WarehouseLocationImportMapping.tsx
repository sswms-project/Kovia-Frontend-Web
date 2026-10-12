import { BulkImportMappingFields } from '@/components/operations/BulkImportWorkspace'
import { SpreadsheetImportColumnTable } from '@/components/operations/SpreadsheetImportColumnTable'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { WarehouseLocationImportTabs } from './WarehouseLocationImportTabs'
import type {
  WarehouseLocationImportKind,
  WarehouseLocationImportOptions,
} from '../../schemas/warehouse-location-import.schema'
import type { WarehouseLocationImportInspection } from '../../types/warehouse-location-import.types'
import { LOCATION_IMPORT_LABELS, locationImportKinds } from '../../utils/warehouse-location-import'

export function WarehouseLocationImportMapping({
  inspection,
  options,
  busy,
  onChange,
}: {
  readonly inspection: WarehouseLocationImportInspection
  readonly options: WarehouseLocationImportOptions
  readonly busy: boolean
  readonly onChange: (options: WarehouseLocationImportOptions) => void
}) {
  function changeTable(
    kind: WarehouseLocationImportKind,
    table?: WarehouseLocationImportOptions['tables'][number]
  ) {
    onChange({
      ...options,
      tables: [...options.tables.filter((item) => item.kind !== kind), ...(table ? [table] : [])],
    })
  }
  const kinds = locationImportKinds(options.mode)
  return (
    <fieldset disabled={busy} className="min-w-0">
      <legend className="sr-only">Ghép cột cấu trúc kho</legend>
      <Tabs defaultValue={kinds[0]}>
        <WarehouseLocationImportTabs kinds={kinds} label="Chọn bảng để ghép cột" />
        {kinds.map((kind) => {
          const table = options.tables.find((item) => item.kind === kind)
          const sheets = inspection.sheetsByKind[kind] ?? []
          const sheet = sheets.find((item) => item.sheetId === table?.sheetId)
          const header = sheet?.headerCandidates.find(
            (item) => item.rowNumber === table?.headerRowNumber
          )
          return (
            <TabsContent key={kind} value={kind} className="flex flex-col gap-3">
              <BulkImportMappingFields>
                <Field>
                  <FieldLabel htmlFor={`location-sheet-${kind}`}>
                    Trang tính {LOCATION_IMPORT_LABELS[kind].toLocaleLowerCase('vi')}
                  </FieldLabel>
                  <NativeSelect
                    id={`location-sheet-${kind}`}
                    value={table?.sheetId ?? ''}
                    onChange={(event) => {
                      const next = sheets.find((item) => item.sheetId === event.target.value)
                      const first = next?.headerCandidates[0]
                      changeTable(
                        kind,
                        next
                          ? {
                              kind,
                              sheetId: next.sheetId,
                              headerRowNumber: first?.rowNumber ?? 1,
                              columnMapping: [...(first?.suggestedMapping ?? [])],
                            }
                          : undefined
                      )
                    }}
                  >
                    <NativeSelectOption value="">
                      {options.mode === 'Structure' ? 'Không nhập bảng này' : 'Chọn trang tính'}
                    </NativeSelectOption>
                    {sheets.map((item) => (
                      <NativeSelectOption
                        key={item.sheetId}
                        value={item.sheetId}
                        disabled={options.tables.some(
                          (other) => other.kind !== kind && other.sheetId === item.sheetId
                        )}
                      >
                        {item.sheetName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`location-header-${kind}`}>Dòng tiêu đề</FieldLabel>
                  <NativeSelect
                    id={`location-header-${kind}`}
                    disabled={!table}
                    value={table?.headerRowNumber ?? ''}
                    onChange={(event) => {
                      const next = sheet?.headerCandidates.find(
                        (item) => item.rowNumber === Number(event.target.value)
                      )
                      if (table && next)
                        changeTable(kind, {
                          ...table,
                          headerRowNumber: next.rowNumber,
                          columnMapping: [...next.suggestedMapping],
                        })
                    }}
                  >
                    <NativeSelectOption value="">Chọn dòng tiêu đề</NativeSelectOption>
                    {sheet?.headerCandidates.map((item) => (
                      <NativeSelectOption key={item.rowNumber} value={item.rowNumber}>
                        Dòng {item.rowNumber}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </BulkImportMappingFields>
              <p className="text-muted-foreground text-xs">
                {kind === 'Zone'
                  ? 'Tên khu vực bắt buộc khi tạo mới. Mã đã có chỉ dùng để tham chiếu, không cập nhật.'
                  : kind === 'Rack'
                    ? 'Tên kệ và cách quản lý vị trí bắt buộc khi tạo mới. Mã khu vực phải khớp trong kho hoặc bảng khu vực của tệp.'
                    : 'Mã khu vực và mã kệ phải khớp trong kho hoặc bảng cha của tệp. Chỉ thêm ô cho kệ quản lý theo ô.'}
              </p>
              {header && table && sheet ? (
                <SpreadsheetImportColumnTable
                  kind={`location-${kind}`}
                  label={LOCATION_IMPORT_LABELS[kind]}
                  fields={inspection.fieldsByKind[kind] ?? []}
                  columns={header.columns}
                  samples={sheet.mappingRows ?? sheet.sampleRows}
                  options={table}
                  onColumnChange={(field, column) =>
                    changeTable(kind, {
                      ...table,
                      columnMapping: [
                        ...table.columnMapping.filter((item) => item.field !== field),
                        ...(column === '' ? [] : [{ field, columnIndex: Number(column) }]),
                      ],
                    })
                  }
                />
              ) : null}
            </TabsContent>
          )
        })}
      </Tabs>
    </fieldset>
  )
}
