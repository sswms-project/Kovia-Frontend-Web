import type { UseFormReturn } from 'react-hook-form'
import { Fragment } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { BulkImportMappingFields } from '@/components/operations/BulkImportWorkspace'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { ProductImportColumnTable } from './ProductImportColumnTable'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ProductImportFormValues } from '../../schemas/product-import.schema'
import type {
  ProductImportInspect,
  ProductImportSheetOptions,
} from '../../types/product-import.types'
import { productImportSheetLabel, suggestedImportSheet } from '../../utils/product-import'

interface ProductImportMappingProps {
  readonly inspect: ProductImportInspect
  readonly form: UseFormReturn<ProductImportFormValues>
  readonly pending: boolean
  readonly onChange: () => void
  readonly onPreview: () => void
}

export function ProductImportMapping({
  inspect,
  form,
  pending,
  onChange,
  onPreview,
}: ProductImportMappingProps) {
  const values = form.watch()
  function changeSheet(kind: 'main' | 'conversions', id: string) {
    onChange()
    const sheet = inspect.sheets.find((item) => item.sheetId === id)
    form.setValue(
      kind,
      sheet
        ? suggestedImportSheet(sheet, kind)
        : kind === 'conversions'
          ? null
          : { sheetId: '', headerRowNumber: 1, columnMapping: [] },
      { shouldDirty: true, shouldValidate: true }
    )
  }
  function changeHeader(kind: 'main' | 'conversions', value: number) {
    onChange()
    const options = values[kind]
    if (!options) return
    const sheet = inspect.sheets.find((item) => item.sheetId === options.sheetId)
    const candidates =
      kind === 'main' ? sheet?.mainHeaderCandidates : sheet?.conversionHeaderCandidates
    form.setValue(
      kind,
      {
        ...options,
        headerRowNumber: value,
        columnMapping: candidates?.find((item) => item.rowNumber === value)?.suggestedMapping ?? [],
      },
      { shouldDirty: true, shouldValidate: true }
    )
  }
  function changeColumn(kind: 'main' | 'conversions', field: string, column: string) {
    onChange()
    const options = values[kind]
    if (!options) return
    form.setValue(
      `${kind}.columnMapping`,
      [
        ...options.columnMapping.filter((item) => item.field !== field),
        ...(column === '' ? [] : [{ field, columnIndex: Number(column) }]),
      ],
      { shouldDirty: true, shouldValidate: true }
    )
  }
  return (
    <section
      aria-label="Cấu hình ghép cột"
      aria-busy={pending}
      className="flex min-w-0 shrink-0 flex-col gap-3"
    >
      <h2 className="shrink-0 font-semibold">Ghép cột</h2>
      <form
        id="product-import-mapping"
        noValidate
        className="flex min-w-0 flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onPreview()
        }}
      >
        <fieldset disabled={pending} className="flex min-w-0 shrink-0 flex-col gap-4">
          <legend className="sr-only">Ghép cột dữ liệu</legend>
          <BulkImportMappingFields>
            <Field>
              <FieldLabel htmlFor="import-main-sheet">Trang tính hàng hóa</FieldLabel>
              <NativeSelect
                id="import-main-sheet"
                className="w-full"
                aria-invalid={Boolean(form.formState.errors.main?.sheetId)}
                aria-describedby={
                  form.formState.errors.main?.sheetId ? 'import-main-sheet-error' : undefined
                }
                value={values.main.sheetId}
                disabled={inspect.isCsv}
                onChange={(event) => changeSheet('main', event.target.value)}
              >
                <NativeSelectOption value="">Chọn trang tính</NativeSelectOption>
                {inspect.sheets.map((sheet) => (
                  <NativeSelectOption
                    key={sheet.sheetId}
                    value={sheet.sheetId}
                    title={sheet.sheetName}
                  >
                    {productImportSheetLabel(sheet.sheetName)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {form.formState.errors.main?.sheetId ? (
                <p id="import-main-sheet-error" role="alert" className="text-destructive text-sm">
                  {form.formState.errors.main.sheetId.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="import-main-header">
                Dòng tiêu đề
                <span className="sr-only">
                  {' '}
                  —{' '}
                  {inspect.sheets.find((sheet) => sheet.sheetId === values.main.sheetId)?.sheetName}
                </span>
              </FieldLabel>
              <Input
                id="import-main-header"
                type="number"
                min={1}
                max={50}
                value={
                  Number.isFinite(values.main.headerRowNumber) ? values.main.headerRowNumber : ''
                }
                aria-invalid={Boolean(form.formState.errors.main?.headerRowNumber)}
                aria-describedby={`import-main-header-help${form.formState.errors.main?.headerRowNumber ? ' import-main-error' : ''}`}
                list="import-main-header-suggestions"
                onChange={(event) => changeHeader('main', event.target.valueAsNumber)}
              />
              <datalist id="import-main-header-suggestions">
                {inspect.sheets
                  .find((sheet) => sheet.sheetId === values.main.sheetId)
                  ?.mainHeaderCandidates.map((candidate) => (
                    <option key={candidate.rowNumber} value={candidate.rowNumber}>
                      Dòng {candidate.rowNumber}
                    </option>
                  ))}
              </datalist>
            </Field>
          </BulkImportMappingFields>
          <p id="import-main-header-help" className="text-muted-foreground text-xs">
            Chọn dòng chứa tên cột (1–50), rồi đối chiếu ví dụ để ghép thông tin.
            {inspect.isCsv ? ' Tệp CSV chỉ có bảng hàng hóa, không chứa đơn vị quy đổi.' : ''}
          </p>
          {(['main', 'conversions'] as const).map((kind) => {
            const options = values[kind]
            return (
              <Fragment key={kind}>
                {kind === 'conversions' && !inspect.isCsv ? (
                  <section
                    aria-label="Đơn vị quy đổi — tùy chọn"
                    className="flex min-w-0 flex-col gap-3 border-t pt-3"
                  >
                    <h3 className="text-sm font-semibold">Đơn vị quy đổi — tùy chọn</h3>
                    <Field>
                      <FieldLabel htmlFor="import-conversion-sheet">
                        Trang tính quy đổi (tùy chọn)
                      </FieldLabel>
                      <NativeSelect
                        id="import-conversion-sheet"
                        value={values.conversions?.sheetId ?? ''}
                        onChange={(event) => changeSheet('conversions', event.target.value)}
                      >
                        <NativeSelectOption value="">Không nhập quy đổi</NativeSelectOption>
                        {inspect.sheets
                          .filter((sheet) => sheet.sheetId !== values.main.sheetId)
                          .map((sheet) => (
                            <NativeSelectOption
                              key={sheet.sheetId}
                              value={sheet.sheetId}
                              title={sheet.sheetName}
                            >
                              {productImportSheetLabel(sheet.sheetName)}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    </Field>
                    {!values.conversions &&
                    inspect.sheets.some(
                      (sheet) =>
                        sheet.sheetId !== values.main.sheetId &&
                        sheet.conversionHeaderCandidates.some(
                          (candidate) => candidate.hasAllRequiredFields
                        )
                    ) ? (
                      <Alert role="status" className="border-warning/40 bg-warning-container/30">
                        <TriangleAlert aria-hidden="true" className="text-warning" />
                        <AlertTitle>Chưa chọn trang tính quy đổi</AlertTitle>
                        <AlertDescription>
                          Tệp có dữ liệu quy đổi. Chọn trang để nhập; nếu bỏ qua, các đơn vị quy đổi
                          sẽ không được nhập.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </section>
                ) : null}
                {options?.sheetId ? (
                  <MappingSection
                    key={kind}
                    kind={kind}
                    options={options}
                    inspect={inspect}
                    error={
                      form.formState.errors[kind]?.columnMapping?.message ??
                      form.formState.errors[kind]?.sheetId?.message ??
                      form.formState.errors[kind]?.headerRowNumber?.message
                    }
                    onHeaderChange={(value) => changeHeader(kind, value)}
                    onColumnChange={(field, column) => changeColumn(kind, field, column)}
                  />
                ) : null}
              </Fragment>
            )
          })}
          {form.formState.errors.schemaVersion ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.schemaVersion.message}
            </p>
          ) : null}
        </fieldset>
      </form>
    </section>
  )
}

function MappingSection({
  kind,
  options,
  inspect,
  error,
  onHeaderChange,
  onColumnChange,
}: {
  readonly kind: 'main' | 'conversions'
  readonly options: ProductImportSheetOptions
  readonly inspect: ProductImportInspect
  readonly error?: string
  readonly onHeaderChange: (row: number) => void
  readonly onColumnChange: (field: string, column: string) => void
}) {
  const sheet = inspect.sheets.find((item) => item.sheetId === options.sheetId)
  if (!sheet) return null
  const fields = kind === 'main' ? inspect.schema.mainFields : inspect.schema.conversionFields
  const candidates = kind === 'main' ? sheet.mainHeaderCandidates : sheet.conversionHeaderCandidates
  const candidate = candidates.find((item) => item.rowNumber === options.headerRowNumber)
  const samples = sheet.mappingRows ?? sheet.sampleRows
  const header = samples.find((row) => row.rowNumber === options.headerRowNumber)
  const columns =
    (sheet.columns?.length ? sheet.columns : candidate?.columns) ??
    [...new Set(samples.flatMap((row) => Object.keys(row.values).map(Number)))]
      .sort((left, right) => left - right)
      .map((columnIndex) => ({ columnIndex, letter: String(columnIndex + 1), header: '' }))
  const labeledColumns = columns.map((column) => ({
    ...column,
    header: header?.values[column.columnIndex] ?? column.header,
  }))
  return (
    <section
      aria-label={kind === 'main' ? 'Cột hàng hóa' : 'Cột quy đổi'}
      className="flex min-w-0 shrink-0 flex-col gap-3"
    >
      {kind === 'conversions' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <h3 className="text-sm font-semibold">Ghép cột đơn vị quy đổi</h3>
            <p className="text-muted-foreground mt-1 text-xs wrap-anywhere">
              Trang tính trong tệp:{' '}
              <span className="font-medium" translate="no">
                {sheet.sheetName}
              </span>
            </p>
          </div>
          <Field orientation="horizontal" className="w-auto shrink-0">
            <FieldLabel htmlFor={`import-${kind}-header`}>
              Dòng tiêu đề<span className="sr-only"> — {sheet.sheetName}</span>
            </FieldLabel>
            <Input
              id={`import-${kind}-header`}
              type="number"
              min={1}
              max={50}
              className="w-20"
              value={Number.isFinite(options.headerRowNumber) ? options.headerRowNumber : ''}
              aria-invalid={Boolean(error)}
              aria-describedby={`import-${kind}-header-help${error ? ` import-${kind}-error` : ''}`}
              onChange={(event) => onHeaderChange(event.target.valueAsNumber)}
            />
          </Field>
          <FieldDescription id={`import-${kind}-header-help`} className="basis-full">
            {candidates.length
              ? `Các dòng gợi ý: ${candidates.map((item) => item.rowNumber).join(', ')}. `
              : ''}
            Chọn dòng chứa tên cột (1–50). Dữ liệu mẫu chỉ để đối chiếu.
          </FieldDescription>
        </div>
      ) : null}
      {kind === 'conversions' ? (
        <p className="text-muted-foreground text-xs/relaxed">
          Mỗi dòng là một đơn vị quy đổi của mã hàng. Ví dụ: 1 Thùng = 24 Lon → hệ số quy đổi là 24.
        </p>
      ) : null}
      {error ? (
        <p id={`import-${kind}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <ProductImportColumnTable
        kind={kind}
        fields={fields}
        columns={labeledColumns}
        options={options}
        samples={samples}
        error={error}
        onColumnChange={onColumnChange}
      />
      <details>
        <summary className="text-muted-foreground cursor-pointer text-xs focus-visible:outline-2 focus-visible:outline-offset-2">
          Xem tối đa 5 dòng mẫu — {sheet.sheetName}
        </summary>
        <OperationalListPanel aria-label={`Dòng mẫu ${sheet.sheetName}`}>
          <Table>
            <TableHeader className="[&_th]:bg-card [&_th]:sticky [&_th]:top-0 [&_th]:z-10">
              <TableRow>
                <TableHead>Dòng nguồn</TableHead>
                {labeledColumns.map((column) => (
                  <TableHead key={column.columnIndex}>
                    {column.letter}: {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples
                .filter((row) => row.rowNumber > options.headerRowNumber)
                .slice(0, 5)
                .map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    {columns.map((column) => (
                      <TableCell
                        key={column.columnIndex}
                        className="max-w-64 break-words whitespace-normal"
                      >
                        {row.values[column.columnIndex] ?? '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </OperationalListPanel>
      </details>
    </section>
  )
}
