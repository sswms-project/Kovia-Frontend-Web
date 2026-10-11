import { useState } from 'react'
import { CheckCircle2, CircleDashed, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { OperationalListPanel } from './OperationalListPanel'
import { OperationalPagination } from './OperationalPagination'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  SpreadsheetImportColumn,
  SpreadsheetImportField,
  SpreadsheetImportSample,
  SpreadsheetImportOptions,
} from './spreadsheet-import.types'

export function SpreadsheetImportColumnTable({
  kind,
  label,
  fields,
  columns,
  options,
  samples,
  error,
  onColumnChange,
}: {
  readonly kind: string
  readonly label: string
  readonly fields: readonly SpreadsheetImportField[]
  readonly columns: readonly SpreadsheetImportColumn[]
  readonly options: SpreadsheetImportOptions
  readonly samples: readonly SpreadsheetImportSample[]
  readonly error?: string
  readonly onColumnChange: (field: string, column: string) => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const normalized = search.trim().toLocaleLowerCase('vi')
  const mapped = new Set(options.columnMapping.map((item) => item.columnIndex))
  const ignored = columns.filter((column) => !mapped.has(column.columnIndex))
  const visible = fields.filter((field) => {
    const index = options.columnMapping.find((item) => item.field === field.field)?.columnIndex
    const column = columns.find((item) => item.columnIndex === index)
    return (
      Boolean(error) ||
      ((filter === 'all' || Boolean(column) === (filter === 'mapped')) &&
        `${field.displayName} ${field.field} ${column?.header ?? ''}`
          .toLocaleLowerCase('vi')
          .includes(normalized))
    )
  })
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visible.length / pageSize)))
  const pageFields = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  return (
    <OperationalListPanel aria-label={`Ghép cột ${label}`}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
        <Field className="min-w-0 flex-1 sm:max-w-80">
          <FieldLabel htmlFor={`import-${kind}-search`} className="sr-only">
            Tìm trường {label}
          </FieldLabel>
          <Input
            id={`import-${kind}-search`}
            placeholder="Tìm trường hoặc tên cột…"
            value={error ? '' : search}
            disabled={Boolean(error)}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </Field>
        <NativeSelect
          className="min-w-36 shrink-0"
          aria-label={`Lọc cột ${label}`}
          value={error ? 'all' : filter}
          disabled={Boolean(error)}
          onChange={(event) => {
            setFilter(event.target.value)
            setPage(1)
          }}
        >
          <NativeSelectOption value="all">Tất cả</NativeSelectOption>
          <NativeSelectOption value="mapped">Đã ghép</NativeSelectOption>
          <NativeSelectOption value="unmapped">Chưa ghép</NativeSelectOption>
        </NativeSelect>
      </div>
      {error ? (
        <p className="text-muted-foreground shrink-0 px-3 py-2 text-xs">
          Đang hiển thị tất cả trường để sửa lỗi ghép cột. Bộ lọc sẽ dùng lại khi cấu hình hợp lệ.
        </p>
      ) : null}
      <Table aria-label={`Ghép cột ${label}`} className="min-w-208 table-fixed">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[30%]" />
          <col className="w-[28%]" />
          <col className="w-[14%]" />
        </colgroup>
        <TableHeader className="[&_th]:bg-card [&_th]:sticky [&_th]:top-0 [&_th]:z-10">
          <TableRow>
            <TableHead>Thông tin Kovia</TableHead>
            <TableHead>Cột trong tệp</TableHead>
            <TableHead>Ví dụ trong tệp</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!visible.length ? (
            <TableRow>
              <TableCell colSpan={4} className="h-16 text-center">
                Không có trường phù hợp.
              </TableCell>
            </TableRow>
          ) : (
            pageFields.map((field) => {
              const index = options.columnMapping.find(
                (item) => item.field === field.field
              )?.columnIndex
              const column = columns.find((item) => item.columnIndex === index)
              const ambiguous =
                column &&
                options.columnMapping.filter((item) => item.columnIndex === index).length > 1
              const invalid = Boolean(error && (ambiguous || (field.isRequired && !column)))
              const values = column
                ? samples
                    .filter((sample) => sample.rowNumber > options.headerRowNumber)
                    .slice(0, 2)
                    .map((sample) => ({
                      rowNumber: sample.rowNumber,
                      value: sample.values[column.columnIndex] || '—',
                    }))
                : []
              const id = `import-${kind}-${encodeURIComponent(field.field)}`
              return (
                <TableRow key={field.field}>
                  <TableCell className="align-top wrap-anywhere whitespace-normal">
                    <FieldLabel htmlFor={id} className="items-start gap-1 font-semibold">
                      <span>{field.displayName}</span>
                      {field.isRequired ? (
                        <>
                          {' '}
                          <span className="text-destructive font-extrabold">*</span>
                        </>
                      ) : null}
                    </FieldLabel>
                    <p id={`${id}-help`} className="text-muted-foreground mt-1 text-xs/relaxed">
                      {field.description}
                      {field.defaultValue ? ` Mặc định: ${field.defaultValue}.` : ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      className="w-full"
                      id={id}
                      value={index ?? ''}
                      aria-required={field.isRequired}
                      aria-invalid={invalid}
                      aria-describedby={`${id}-help${invalid ? ` import-${kind}-error` : ''}`}
                      onChange={(event) => onColumnChange(field.field, event.target.value)}
                    >
                      <NativeSelectOption value="">
                        {field.isRequired ? 'Chọn cột bắt buộc' : 'Không ghép'}
                      </NativeSelectOption>
                      {columns.map((item) => (
                        <NativeSelectOption key={item.columnIndex} value={item.columnIndex}>
                          {item.letter} — {item.header || 'Không có tên'}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="align-top wrap-anywhere whitespace-normal">
                    {values.length ? (
                      <div className="flex flex-col gap-1">
                        {values.map((sample) => (
                          <p
                            key={sample.rowNumber}
                            className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 text-xs/relaxed"
                          >
                            <span className="text-muted-foreground tabular-nums">
                              Dòng {sample.rowNumber}:
                            </span>
                            <span className="whitespace-pre-wrap">{sample.value}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="max-w-full whitespace-normal"
                      variant={ambiguous ? 'destructive' : column ? 'default' : 'outline'}
                    >
                      {ambiguous ? (
                        <TriangleAlert aria-hidden="true" />
                      ) : column ? (
                        <CheckCircle2 aria-hidden="true" />
                      ) : (
                        <CircleDashed aria-hidden="true" />
                      )}
                      {ambiguous ? 'Mơ hồ: trùng cột' : column ? 'Đã ghép' : 'Chưa ghép'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <OperationalPagination
        page={currentPage}
        pageSize={pageSize}
        totalCount={visible.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
      {ignored.length ? (
        <details className="text-muted-foreground max-h-24 shrink-0 overflow-auto border-t px-3 py-2 text-xs">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2">
            {ignored.length} cột sẽ bỏ qua
          </summary>
          <ul className="mt-2 flex flex-col gap-1 break-words">
            {ignored.map((column) => (
              <li key={column.columnIndex}>
                {column.letter} — {column.header || 'Không có tên'}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </OperationalListPanel>
  )
}
