'use client'

import { Download, LoaderCircle } from 'lucide-react'
import type { Route } from 'next'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BulkImportMapping } from './BulkImportMapping'
import { OperationalListPanel } from './OperationalListPanel'
import { OperationalPagination } from './OperationalPagination'
import { Field, FieldLabel } from '@/components/ui/field'
import { useImportNavigation } from './use-import-navigation'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import {
  initialSpreadsheetMapping,
  spreadsheetIgnoredData,
  spreadsheetMappingError,
} from './spreadsheet-import'
import type {
  SpreadsheetImportInspection,
  SpreadsheetImportOptions,
} from './spreadsheet-import.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { BulkImportFieldCell, BulkImportRowResult } from './BulkImportFeedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BULK_IMPORT_FILE_EXTENSIONS,
  BULK_IMPORT_MAX_FILE_BYTES,
  BULK_IMPORT_MAX_FILE_MB,
  BULK_IMPORT_ROWS_PER_PAGE,
  hasBulkImportExtension,
} from './bulk-import'
import { BulkImportResult, type BulkImportResultItem } from './BulkImportResult'
import { BulkImportHeader } from './BulkImportHeader'
import {
  BulkImportWorkspace,
  BulkImportSummary,
  BulkImportReviewHeader,
  BulkImportSupplementaryToggle,
  BulkImportDelimiter,
} from './BulkImportWorkspace'
import { BulkImportFilePicker } from './BulkImportFilePicker'

export interface BulkImportRow {
  readonly rowNumber: number
  readonly errors: readonly string[]
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
}

export type BulkImportPreviewOutcome<TRow extends BulkImportRow> =
  | { readonly isSucceeded: true; readonly rows: readonly TRow[] }
  | { readonly isSucceeded: false; readonly message: string }

export type BulkImportCommitOutcome =
  | { readonly isSucceeded: true }
  | {
      readonly isSucceeded: false
      readonly message: string
      readonly requiresReconciliation?: boolean
    }

export type BulkImportInspectOutcome =
  | { readonly isSucceeded: true; readonly inspection: SpreadsheetImportInspection }
  | { readonly isSucceeded: false; readonly message: string }

export interface BulkImportColumn<TRow extends BulkImportRow> {
  readonly key: string
  readonly header: string
  readonly isSupplementary?: boolean
  readonly headClassName?: string
  readonly cellClassName?: string
  readonly render: (row: TRow) => ReactNode
}

type StatusFilter = 'All' | 'Valid' | 'Invalid'

interface BulkImportPageProps<TRow extends BulkImportRow> {
  readonly validationRevision?: number
  readonly eyebrow: string
  readonly title: string
  readonly description?: string
  readonly entityLabel: string
  readonly maxRows: number
  readonly backHref: Route
  readonly backLabel: string
  readonly listLabel: string
  readonly resultFileName: string
  readonly columns: readonly BulkImportColumn<TRow>[]
  readonly getRowLabel: (row: TRow) => string
  readonly getRowSearchText: (row: TRow) => string
  readonly isPreviewing: boolean
  readonly isImporting: boolean
  readonly isDownloadingTemplate: boolean
  readonly onDownloadTemplate: () => Promise<void> | void
  readonly onInspect: (file: File, csvDelimiter: string) => Promise<BulkImportInspectOutcome>
  readonly onPreview: (
    file: File,
    options: SpreadsheetImportOptions
  ) => Promise<BulkImportPreviewOutcome<TRow>>
  readonly onImport: (rows: readonly TRow[]) => Promise<BulkImportCommitOutcome>
}

export function BulkImportPage<TRow extends BulkImportRow>({
  validationRevision = 0,
  eyebrow,
  title,
  description,
  entityLabel,
  maxRows,
  backHref,
  backLabel,
  listLabel,
  resultFileName,
  columns,
  getRowLabel,
  getRowSearchText,
  isPreviewing,
  isImporting,
  isDownloadingTemplate,
  onDownloadTemplate,
  onInspect,
  onPreview,
  onImport,
}: BulkImportPageProps<TRow>) {
  const [file, setFile] = useState<File | null>(null)
  const [inspection, setInspection] = useState<SpreadsheetImportInspection | null>(null)
  const [options, setOptions] = useState<SpreadsheetImportOptions | null>(null)
  const [delimiter, setDelimiter] = useState('auto')
  const [working, setWorking] = useState(false)
  const [needsRecheck, setNeedsRecheck] = useState(false)
  const [uncertainCommit, setUncertainCommit] = useState(false)
  const [acceptedIgnored, setAcceptedIgnored] = useState(false)
  const inFlight = useRef(false)
  const busy = working || isPreviewing || isImporting || isDownloadingTemplate
  const templateLock = useRef(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [rows, setRows] = useState<readonly TRow[] | null>(null)
  const [selectedRows, setSelectedRows] = useState<readonly number[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [supplementaryExpanded, setSupplementaryExpanded] = useState(false)
  const previewTableId = useId()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(BULK_IMPORT_ROWS_PER_PAGE)
  const [resultItems, setResultItems] = useState<readonly BulkImportResultItem[] | null>(null)
  const step = resultItems ? 3 : rows ? 2 : inspection ? 1 : 0
  const activity = isImporting
    ? 'importing'
    : isDownloadingTemplate
      ? 'template'
      : working || isPreviewing
        ? inspection
          ? 'checking'
          : 'reading'
        : 'idle'
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)
  const ignored = inspection && options ? spreadsheetIgnoredData(inspection, options) : null
  const hasIgnored = Boolean(ignored && (ignored.sheets.length || ignored.columns.length))
  const navigation = useImportNavigation(Boolean(file && !resultItems), busy)
  const previousValidationRevision = useRef(validationRevision)
  useEffect(() => {
    if (previousValidationRevision.current !== validationRevision) setNeedsRecheck(true)
    previousValidationRevision.current = validationRevision
  }, [validationRevision])
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus()
    previousStep.current = step
  }, [step])

  const validRowNumbers = useMemo(
    () => rows?.filter((row) => row.errors.length === 0).map((row) => row.rowNumber) ?? [],
    [rows]
  )
  const invalidCount = (rows?.length ?? 0) - validRowNumbers.length
  const supplementaryColumns = columns.filter((column) => column.isSupplementary)
  const visibleColumns = columns.filter(
    (column) => supplementaryExpanded || !column.isSupplementary
  )
  const supplementaryErrorCount = (rows ?? []).reduce(
    (total, row) =>
      total +
      new Set(supplementaryColumns.flatMap((column) => row.fieldErrors?.[column.key] ?? [])).size,
    0
  )
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    return (
      rows?.filter(
        (row) =>
          (statusFilter === 'All' ||
            (statusFilter === 'Valid' ? row.errors.length === 0 : row.errors.length > 0)) &&
          (!normalizedSearch || getRowSearchText(row).toLowerCase().includes(normalizedSearch))
      ) ?? []
    )
  }, [rows, searchText, statusFilter, getRowSearchText])

  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const visibleValidRowNumbers = visibleRows
    .filter((row) => row.errors.length === 0)
    .map((row) => row.rowNumber)
  const areAllVisibleValidRowsSelected =
    visibleValidRowNumbers.length > 0 &&
    visibleValidRowNumbers.every((rowNumber) => selectedRows.includes(rowNumber))

  function resetSession() {
    setFile(null)
    setInspection(null)
    setOptions(null)
    setNeedsRecheck(false)
    setUncertainCommit(false)
    setAcceptedIgnored(false)
    setFileName(null)
    setFileError(null)
    setImportError(null)
    setRows(null)
    setSelectedRows([])
    setSearchText('')
    setStatusFilter('All')
    setSupplementaryExpanded(false)
    setPage(1)
    setResultItems(null)
  }

  async function handleFileChange(file: File | undefined, csvDelimiter = delimiter) {
    if (!file || busy || inFlight.current || templateLock.current) return
    setFileError(null)
    if (!hasBulkImportExtension(file.name)) {
      setFileError(`Chỉ hỗ trợ tệp ${BULK_IMPORT_FILE_EXTENSIONS.join(' hoặc ')}.`)
      return
    }
    if (file.size > BULK_IMPORT_MAX_FILE_BYTES) {
      setFileError(`Tệp vượt quá ${BULK_IMPORT_MAX_FILE_MB} MB.`)
      return
    }

    resetSession()
    setFile(file)
    setFileName(file.name)
    inFlight.current = true
    setWorking(true)
    try {
      const outcome = await onInspect(file, csvDelimiter)
      if (!outcome.isSucceeded) {
        setFileError(outcome.message)
        return
      }
      setInspection(outcome.inspection)
      setOptions(initialSpreadsheetMapping(outcome.inspection))
    } finally {
      inFlight.current = false
      setWorking(false)
    }
  }

  async function handlePreview() {
    if (
      !file ||
      !inspection ||
      !options ||
      busy ||
      inFlight.current ||
      templateLock.current ||
      uncertainCommit ||
      spreadsheetMappingError(inspection, options)
    )
      return
    inFlight.current = true
    setWorking(true)
    setFileError(null)
    try {
      const outcome = await onPreview(file, options)
      if (!outcome.isSucceeded) {
        setFileError(outcome.message)
        return
      }
      const valid = outcome.rows
        .filter((row) => row.errors.length === 0)
        .map((row) => row.rowNumber)
      setSelectedRows(needsRecheck ? selectedRows.filter((row) => valid.includes(row)) : valid)
      setRows(outcome.rows)
      setNeedsRecheck(false)
      setImportError(null)
      setPage(1)
      setSearchText('')
      setStatusFilter('All')
    } finally {
      inFlight.current = false
      setWorking(false)
    }
  }

  async function handleImport() {
    if (
      !rows ||
      selectedRows.length === 0 ||
      busy ||
      inFlight.current ||
      templateLock.current ||
      needsRecheck ||
      uncertainCommit ||
      (hasIgnored && !acceptedIgnored)
    )
      return
    const selected = new Set(selectedRows)
    const rowsToImport = rows.filter(
      (row) => row.errors.length === 0 && selected.has(row.rowNumber)
    )
    if (rowsToImport.length === 0) return

    inFlight.current = true
    setWorking(true)
    try {
      const outcome = await onImport(rowsToImport)
      if (!outcome.isSucceeded) {
        setImportError(outcome.message)
        setNeedsRecheck(true)
        setUncertainCommit(outcome.requiresReconciliation === true)
        return
      }
      setImportError(null)
      setResultItems(
        rows.map((row) => {
          const isImported = row.errors.length === 0 && selected.has(row.rowNumber)
          return {
            rowNumber: row.rowNumber,
            label: getRowLabel(row),
            isImported,
            result: isImported
              ? 'Đã nhập'
              : row.errors.length > 0
                ? `Bỏ qua: ${row.errors.join(' ')}`
                : 'Bỏ qua: không được chọn',
          }
        })
      )
    } finally {
      inFlight.current = false
      setWorking(false)
    }
  }

  function toggleRow(rowNumber: number, checked: boolean) {
    setSelectedRows((current) =>
      checked
        ? [...new Set([...current, rowNumber])]
        : current.filter((value) => value !== rowNumber)
    )
  }

  function toggleVisibleRows(checked: boolean) {
    setSelectedRows((current) =>
      checked
        ? [...new Set([...current, ...visibleValidRowNumbers])]
        : current.filter((value) => !visibleValidRowNumbers.includes(value))
    )
  }

  return (
    <BulkImportWorkspace
      step={step}
      activity={activity}
      header={
        <BulkImportHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          backHref={backHref}
          backLabel={backLabel}
        >
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (busy || inFlight.current || templateLock.current) return
              templateLock.current = true
              try {
                await onDownloadTemplate()
              } finally {
                templateLock.current = false
              }
            }}
          >
            {isDownloadingTemplate ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            {isDownloadingTemplate ? 'Đang tải mẫu…' : 'Mẫu XLSX'}
          </Button>
        </BulkImportHeader>
      }
    >
      <h2 ref={stepHeading} tabIndex={-1} className="sr-only" aria-live="polite">
        Bước {step + 1}: {['Chọn tệp', 'Ghép cột', 'Kiểm tra', 'Kết quả'][step]}
      </h2>

      {resultItems ? (
        <BulkImportResult
          entityLabel={entityLabel}
          listHref={backHref}
          listLabel={listLabel}
          resultFileName={resultFileName}
          items={resultItems}
          onRestart={resetSession}
        >
          <ImportResultTable items={resultItems} entityLabel={entityLabel} />
        </BulkImportResult>
      ) : inspection && options && !rows ? (
        <>
          {inspection.isCsv ? (
            <BulkImportDelimiter
              id="bulk-import-mapping-delimiter"
              value={delimiter}
              disabled={busy}
              onChange={(value) => {
                setDelimiter(value)
                void handleFileChange(file ?? undefined, value)
              }}
            />
          ) : null}
          <BulkImportMapping
            inspection={inspection}
            options={options}
            busy={busy}
            error={fileError}
            onChange={(options) => {
              setOptions(options)
              setAcceptedIgnored(false)
              setFileError(null)
            }}
            onBack={resetSession}
            onPreview={() => void handlePreview()}
          />
        </>
      ) : !rows ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          <BulkImportDelimiter
            id="bulk-import-delimiter"
            value={delimiter}
            disabled={busy}
            onChange={setDelimiter}
          />
          <BulkImportFilePicker
            entityLabel={entityLabel}
            maxRows={maxRows}
            pending={busy}
            error={fileError}
            onFileChange={(file) => void handleFileChange(file)}
          />
          {file && fileError ? (
            <Button variant="outline" disabled={busy} onClick={() => void handleFileChange(file)}>
              Đọc lại tệp
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <BulkImportSummary total={rows.length} valid={validRowNumbers.length} />
          {needsRecheck && !importError ? (
            <Alert className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <AlertDescription>Mã đã thay đổi. Kiểm tra lại trước khi nhập.</AlertDescription>
              <Button variant="outline" disabled={busy} onClick={() => void handlePreview()}>
                Kiểm tra lại dữ liệu
              </Button>
            </Alert>
          ) : null}

          {importError ? (
            <Alert variant="destructive">
              <AlertTitle>Không thể nhập {entityLabel}</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
              {uncertainCommit ? (
                <p>
                  Chưa xác định kết quả lưu. Hãy kiểm tra danh sách {entityLabel} trước khi bắt đầu
                  phiên nhập mới để tránh nhập trùng.
                </p>
              ) : (
                <Button variant="outline" disabled={busy} onClick={() => void handlePreview()}>
                  Kiểm tra lại dữ liệu
                </Button>
              )}
            </Alert>
          ) : null}

          {fileError ? (
            <Alert variant="destructive">
              <AlertTitle>Kiểm tra lại chưa thành công</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          ) : null}
          {hasIgnored && ignored ? (
            <Alert className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 break-words">
              <AlertTitle className="shrink-0">Dữ liệu không nhập</AlertTitle>
              <AlertDescription className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 [&_p:not(:last-child)]:mb-0">
                {ignored.sheets.length ? <p>Trang tính: {ignored.sheets.join(', ')}.</p> : null}
                {ignored.columns.length ? (
                  <p>
                    Cột:{' '}
                    {ignored.columns
                      .map((column) => column.letter + ' — ' + (column.header || 'Không có tên'))
                      .join(', ')}
                    .
                  </p>
                ) : null}
                <Field orientation="horizontal" className="w-auto">
                  <Checkbox
                    id="bulk-import-ignored"
                    checked={acceptedIgnored}
                    disabled={busy}
                    onCheckedChange={(value) => setAcceptedIgnored(value === true)}
                  />
                  <FieldLabel htmlFor="bulk-import-ignored">
                    Tôi đồng ý bỏ qua các trang tính/cột trên.
                  </FieldLabel>
                </Field>
              </AlertDescription>
            </Alert>
          ) : null}

          <OperationalListPanel
            className="flex-none shrink-0 [&>[data-slot=table-container]]:flex-none [&>[data-slot=table-container]]:overflow-x-auto [&>[data-slot=table-container]]:overflow-y-hidden"
            aria-label="Bản xem trước nhập dữ liệu"
          >
            <BulkImportReviewHeader
              fileName={fileName}
              selected={selectedRows.length}
              valid={validRowNumbers.length}
            >
              {supplementaryColumns.length > 0 ? (
                <BulkImportSupplementaryToggle
                  expanded={supplementaryExpanded}
                  controls={previewTableId}
                  errorCount={supplementaryErrorCount}
                  onToggle={() => setSupplementaryExpanded((expanded) => !expanded)}
                />
              ) : null}
              <Button
                variant="outline"
                disabled={
                  busy ||
                  validRowNumbers.length === 0 ||
                  selectedRows.length === validRowNumbers.length
                }
                onClick={() => setSelectedRows([...validRowNumbers])}
                aria-label={`Chọn toàn bộ ${validRowNumbers.length} dòng hợp lệ của tệp`}
              >
                Chọn cả tệp ({validRowNumbers.length} hợp lệ)
              </Button>
              <Button
                variant="ghost"
                disabled={busy || selectedRows.length === 0}
                onClick={() => setSelectedRows([])}
                aria-label="Bỏ chọn toàn bộ tệp"
              >
                Bỏ chọn cả tệp
              </Button>
              <Input
                className="min-w-0 flex-1 basis-40 sm:w-48 sm:max-w-64"
                aria-label="Tìm trong bản xem trước"
                value={searchText}
                placeholder="Tìm theo mã, tên, liên hệ"
                onChange={(event) => {
                  setSearchText(event.target.value)
                  setPage(1)
                }}
              />
              <NativeSelect
                className="min-w-36 shrink-0"
                aria-label="Lọc trạng thái"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter)
                  setPage(1)
                }}
              >
                <NativeSelectOption value="All">Tất cả</NativeSelectOption>
                <NativeSelectOption value="Valid">Hợp lệ</NativeSelectOption>
                <NativeSelectOption value="Invalid">Không hợp lệ</NativeSelectOption>
              </NativeSelect>
            </BulkImportReviewHeader>

            <Table id={previewTableId}>
              <TableHeader className="[&_th]:bg-card [&_th]:sticky [&_th]:top-0 [&_th]:z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label="Chọn tất cả dòng hợp lệ trên trang này"
                      checked={
                        areAllVisibleValidRowsSelected
                          ? true
                          : visibleValidRowNumbers.some((row) => selectedRows.includes(row))
                            ? 'indeterminate'
                            : false
                      }
                      disabled={busy || visibleValidRowNumbers.length === 0}
                      onCheckedChange={(checked) => toggleVisibleRows(checked === true)}
                    />
                  </TableHead>
                  <TableHead className="w-16">Dòng</TableHead>
                  <TableHead>Kết quả</TableHead>
                  {visibleColumns.map((column) => (
                    <TableHead key={column.key} className={column.headClassName}>
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length + 3}
                      className="text-muted-foreground h-24 text-center"
                    >
                      Không có dòng nào phù hợp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => {
                    const isValid = row.errors.length === 0
                    return (
                      <TableRow key={row.rowNumber}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Chọn dòng ${row.rowNumber}`}
                            aria-describedby={
                              !isValid ? `party-import-errors-${row.rowNumber}` : undefined
                            }
                            disabled={busy || !isValid}
                            checked={selectedRows.includes(row.rowNumber)}
                            onCheckedChange={(checked) =>
                              toggleRow(row.rowNumber, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                        <TableCell
                          className="max-w-80 min-w-56"
                          id={`party-import-errors-${row.rowNumber}`}
                        >
                          <BulkImportRowResult
                            errors={row.errors}
                            valid={isValid}
                            pinned={row.errors.filter(
                              (message) =>
                                !visibleColumns.some((column) =>
                                  row.fieldErrors?.[column.key]?.includes(message)
                                )
                            )}
                          />
                        </TableCell>
                        {visibleColumns.map((column) => {
                          const errors = row.fieldErrors?.[column.key] ?? []
                          return (
                            <BulkImportFieldCell
                              key={column.key}
                              errors={errors}
                              className={cn(
                                column.cellClassName,
                                column.isSupplementary &&
                                  'animate-in fade-in-0 animation-duration-150 motion-reduce:animate-none'
                              )}
                            >
                              {column.render(row)}
                            </BulkImportFieldCell>
                          )
                        })}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={filteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
              isPending={busy}
            />
          </OperationalListPanel>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => navigation.requestDiscard(resetSession)}
            >
              Hủy phiên nhập
            </Button>
            <Button
              variant="outline"
              disabled={busy || uncertainCommit}
              onClick={() => {
                setRows(null)
                setFileError(null)
                setImportError(null)
                setNeedsRecheck(false)
              }}
            >
              Quay lại ghép cột
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={
                    selectedRows.length === 0 ||
                    busy ||
                    needsRecheck ||
                    uncertainCommit ||
                    (hasIgnored && !acceptedIgnored)
                  }
                >
                  {isImporting ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : null}
                  Nhập {selectedRows.length} {entityLabel}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận nhập {entityLabel}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hệ thống sẽ nhập {selectedRows.length} dòng hợp lệ đã chọn.
                    {hasIgnored ? ' Các trang tính/cột đã xác nhận bỏ qua sẽ không được nhập.' : ''}
                    {invalidCount > 0
                      ? ` ${invalidCount} dòng không hợp lệ sẽ được bỏ qua; sửa tệp và tải lại để nhập các dòng đó.`
                      : ''}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={busy || needsRecheck || uncertainCommit}
                    onClick={() => void handleImport()}
                  >
                    Xác nhận nhập
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
      <UnsavedChangesDialog
        open={navigation.discardOpen}
        onOpenChange={(open) => {
          if (!open) navigation.cancelDiscard()
        }}
        onDiscard={navigation.confirmDiscard}
      />
    </BulkImportWorkspace>
  )
}

function ImportResultTable({
  items,
  entityLabel,
}: {
  readonly items: readonly BulkImportResultItem[]
  readonly entityLabel: string
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(BULK_IMPORT_ROWS_PER_PAGE)
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize)
  return (
    <OperationalListPanel className="min-h-96 shrink-0" aria-label="Kết quả nhập dữ liệu">
      <Table>
        <TableHeader className="[&_th]:bg-card [&_th]:sticky [&_th]:top-0 [&_th]:z-10">
          <TableRow>
            <TableHead className="w-16">Dòng</TableHead>
            <TableHead>{entityLabel}</TableHead>
            <TableHead>Kết quả</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleItems.map((item) => (
            <TableRow key={item.rowNumber}>
              <TableCell className="tabular-nums">{item.rowNumber}</TableCell>
              <TableCell className="min-w-48 break-words">{item.label}</TableCell>
              <TableCell className="min-w-56">
                <Badge
                  variant={item.isImported ? 'default' : 'outline'}
                  className="whitespace-normal"
                >
                  {item.result}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <OperationalPagination
        page={page}
        pageSize={pageSize}
        totalCount={items.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </OperationalListPanel>
  )
}
