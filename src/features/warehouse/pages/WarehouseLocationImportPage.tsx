'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { BulkImportHeader } from '@/components/operations/BulkImportHeader'
import { BulkImportFilePicker } from '@/components/operations/BulkImportFilePicker'
import {
  BulkImportWorkspace,
  BulkImportDelimiter,
  BulkImportPendingBody,
  type BulkImportActivity,
} from '@/components/operations/BulkImportWorkspace'
import {
  BULK_IMPORT_MAX_FILE_BYTES,
  downloadBulkImportFile,
  hasBulkImportExtension,
} from '@/components/operations/bulk-import'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { useImportNavigation } from '@/components/operations/use-import-navigation'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import { WarehouseLocationImportMapping } from '../components/WarehouseLocationImport/WarehouseLocationImportMapping'
import { WarehouseLocationImportReview } from '../components/WarehouseLocationImport/WarehouseLocationImportReview'
import { WarehouseLocationImportSummary } from '../components/WarehouseLocationImport/WarehouseLocationImportSummary'
import { useWarehouseQuery } from '../hooks/use-warehouse'
import { useWarehouseLocationImport } from '../hooks/use-warehouse-location-import'
import {
  warehouseLocationImportOptionsSchema,
  warehouseLocationImportSelectionSchema,
  type WarehouseLocationImportMode,
  type WarehouseLocationImportOptions,
} from '../schemas/warehouse-location-import.schema'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportPreview,
  WarehouseLocationImportResult,
} from '../types/warehouse-location-import.types'
import {
  initialLocationImportOptions,
  LOCATION_IMPORT_LABELS,
  LOCATION_IMPORT_MODES,
  locationImportKinds,
  locationImportReport,
  locationImportSelectionCounts,
  missingLocationImportParents,
} from '../utils/warehouse-location-import'

export default function WarehouseLocationImportPage({
  warehouseId,
}: {
  readonly warehouseId: string
}) {
  const me = useMeQuery()
  const warehouse = useWarehouseQuery(warehouseId)
  if (me.isPending || warehouse.isPending) return <BulkImportPendingBody />
  if (
    me.isError ||
    warehouse.isError ||
    !me.data?.permissions.includes(P.WAREHOUSES_VIEW) ||
    !me.data?.permissions.includes(P.WAREHOUSES_CONFIGURE_LAYOUT) ||
    warehouse.data?.status !== 'Active'
  )
    return (
      <Alert variant="destructive">
        <AlertTitle>Không thể nhập cấu trúc kho</AlertTitle>
        <AlertDescription>
          Cần quyền xem, cấu hình vị trí và quyền quản lý kho đang hoạt động.
        </AlertDescription>
      </Alert>
    )
  return (
    <WarehouseLocationImportSession
      key={`${warehouseId}:${me.data.id}:${me.data.tenantId}`}
      warehouseId={warehouseId}
      warehouseLabel={`${warehouse.data.warehouseCode} · ${warehouse.data.warehouseName}`}
    />
  )
}

function WarehouseLocationImportSession({
  warehouseId,
  warehouseLabel,
}: {
  readonly warehouseId: string
  readonly warehouseLabel: string
}) {
  const operations = useWarehouseLocationImport(warehouseId)
  const [mode, setMode] = useState<WarehouseLocationImportMode>('Slots')
  const [delimiter, setDelimiter] = useState<WarehouseLocationImportOptions['csvDelimiter']>('auto')
  const [file, setFile] = useState<File | null>(null)
  const [inspection, setInspection] = useState<WarehouseLocationImportInspection | null>(null)
  const [options, setOptions] = useState<WarehouseLocationImportOptions | null>(null)
  const [preview, setPreview] = useState<WarehouseLocationImportPreview | null>(null)
  const [result, setResult] = useState<WarehouseLocationImportResult | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [acceptedIgnored, setAcceptedIgnored] = useState(false)
  const [activity, setActivity] = useState<BulkImportActivity>('idle')
  const [error, setError] = useState<string | null>(null)
  const [needsRecheck, setNeedsRecheck] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const locked = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const busy = activity !== 'idle'
  const step = result ? 3 : preview ? 2 : inspection ? 1 : 0
  const navigation = useImportNavigation(Boolean(file && !result), busy)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [step])
  const missingParents = missingLocationImportParents(preview?.rows ?? [], selected)
  const hasIgnored = Boolean(
    preview && (preview.ignoredSheets.length || preview.ignoredColumns.length)
  )
  const counts = locationImportSelectionCounts(preview?.rows ?? [], selected)
  const countLabel = `${counts.Zone} khu vực, ${counts.Rack} kệ, ${counts.Slot} vị trí`
  const canCommit = Boolean(
    preview?.capabilities.canImport &&
    selected.size &&
    !busy &&
    !needsRecheck &&
    !uncertain &&
    !missingParents.length &&
    (!hasIgnored || acceptedIgnored)
  )

  function reset() {
    if (locked.current) return
    setFile(null)
    setInspection(null)
    setOptions(null)
    setPreview(null)
    setResult(null)
    setSelected(new Set())
    setAcceptedIgnored(false)
    setError(null)
    setNeedsRecheck(false)
    setUncertain(false)
  }
  async function readFile(candidate: File, nextDelimiter = delimiter) {
    if (locked.current || uncertain) return
    if (
      !hasBulkImportExtension(candidate.name) ||
      candidate.size === 0 ||
      candidate.size > BULK_IMPORT_MAX_FILE_BYTES ||
      (mode === 'Structure' && candidate.name.toLowerCase().endsWith('.csv'))
    ) {
      setError(
        mode === 'Structure'
          ? 'Cấu trúc đầy đủ cần tệp XLSX, không rỗng, tối đa 5 MB.'
          : 'Chọn tệp XLSX/CSV không rỗng, tối đa 5 MB.'
      )
      return
    }
    locked.current = true
    setActivity('reading')
    setError(null)
    setFile(candidate)
    setInspection(null)
    setOptions(null)
    setPreview(null)
    setResult(null)
    setSelected(new Set())
    setAcceptedIgnored(false)
    try {
      const next = await operations.inspect.mutateAsync({
        file: candidate,
        mode,
        delimiter: nextDelimiter,
      })
      setInspection(next)
      setOptions(initialLocationImportOptions(next, nextDelimiter))
      setNeedsRecheck(false)
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Không thể đọc tệp. Vui lòng kiểm tra tệp và thử lại.'))
    } finally {
      locked.current = false
      setActivity('idle')
    }
  }
  async function checkFile() {
    if (locked.current || !file || !options) return
    const parsed = warehouseLocationImportOptionsSchema.safeParse(options)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Kiểm tra lại các cột đã ghép.')
      return
    }
    locked.current = true
    setActivity('checking')
    setError(null)
    try {
      const next = await operations.preview.mutateAsync({ file, options: parsed.data })
      setPreview(next)
      setSelected(new Set(next.rows.filter((row) => row.canSelect).map((row) => row.rowKey)))
      setAcceptedIgnored(false)
      setNeedsRecheck(false)
      // Re-preview does not prove whether an earlier disconnected request committed.
      // Keep the write lock until the user starts a new, explicitly reconciled session.
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Không thể kiểm tra dữ liệu.'))
      setNeedsRecheck(true)
    } finally {
      locked.current = false
      setActivity('idle')
    }
  }
  async function commit() {
    if (locked.current || !canCommit || !file || !options || !preview) return
    const selection = warehouseLocationImportSelectionSchema.safeParse({
      expectedPreviewFingerprint: preview.previewFingerprint,
      selectedRowKeys: [...selected],
      acknowledgeIgnoredData: acceptedIgnored,
    })
    if (!selection.success) {
      setError('Kiểm tra lại các dòng đã chọn.')
      return
    }
    locked.current = true
    setActivity('importing')
    setConfirmOpen(false)
    setError(null)
    try {
      setResult(await operations.commit.mutateAsync({ file, options, selection: selection.data }))
      toast.success(`Đã nhập ${countLabel}.`)
    } catch (failure) {
      setUncertain(!isApiErrorResponse(failure) || failure.statusCode >= 500)
      setNeedsRecheck(true)
      setError(
        isApiErrorResponse(failure)
          ? failure.message
          : 'Mất kết nối khi nhập dữ liệu. Chưa xác định kết quả lưu.'
      )
    } finally {
      locked.current = false
      setActivity('idle')
    }
  }
  async function template(nextMode: WarehouseLocationImportMode) {
    if (locked.current) return
    locked.current = true
    setActivity('template')
    try {
      downloadBulkImportFile(
        await operations.template.mutateAsync(nextMode),
        `kovia-vi-tri-${nextMode.toLowerCase()}.xlsx`
      )
    } catch (failure) {
      toast.error(getApiErrorMessage(failure, 'Không thể tải mẫu.'))
    } finally {
      locked.current = false
      setActivity('idle')
    }
  }
  function report() {
    if (!preview) return
    downloadBulkImportFile(
      new Blob(
        [
          '\uFEFF',
          locationImportReport(
            preview,
            result ? new Set(result.created.map((item) => item.rowKey)) : undefined
          ),
        ],
        { type: 'text/csv;charset=utf-8' }
      ),
      'kovia-ket-qua-vi-tri-kho.csv'
    )
  }
  return (
    <BulkImportWorkspace
      step={step}
      activity={activity}
      header={
        <BulkImportHeader
          eyebrow={`Kho: ${warehouseLabel}`}
          title="Nhập vị trí kho"
          backHref={APP_ROUTES.warehouseLayout(warehouseId) as Route}
          backLabel="Quay lại danh mục vị trí"
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void template('Slots')}>
              <Download data-icon="inline-start" aria-hidden="true" />
              Mẫu vị trí
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void template('Structure')}>
              <Download data-icon="inline-start" aria-hidden="true" />
              Mẫu cấu trúc đầy đủ
            </Button>
          </div>
        </BulkImportHeader>
      }
    >
      <h2 ref={heading} tabIndex={-1} className="sr-only">
        {['Chọn tệp', 'Ghép cột', 'Kiểm tra dữ liệu', 'Kết quả nhập'][step]}
      </h2>
      {error && step !== 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{uncertain ? 'Chưa xác định kết quả lưu' : 'Cần kiểm tra lại'}</AlertTitle>
          <AlertDescription>
            {error}
            {uncertain
              ? ' Hãy đối chiếu danh mục trước khi bắt đầu phiên mới. Không nhập lại tệp ngay.'
              : ''}
          </AlertDescription>
          {preview ? (
            <Button variant="outline" disabled={busy} onClick={() => void checkFile()}>
              Kiểm tra lại dữ liệu
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {step === 0 ? (
        <>
          <Field className="sm:max-w-80">
            <FieldLabel htmlFor="location-import-mode">Bạn muốn nhập gì?</FieldLabel>
            <NativeSelect
              id="location-import-mode"
              value={mode}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.value as WarehouseLocationImportMode
                navigation.requestDiscard(() => {
                  reset()
                  setMode(next)
                })
              }}
            >
              {Object.entries(LOCATION_IMPORT_MODES).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <p className="text-muted-foreground text-sm">
            {mode === 'Structure'
              ? 'Tạo khu vực, kệ và vị trí trong cùng một lần nhập. Chỉ hỗ trợ XLSX.'
              : mode === 'Slots'
                ? 'Khu vực và kệ cần có sẵn.'
                : mode === 'Racks'
                  ? 'Khu vực cần có sẵn.'
                  : 'Thêm khu vực vào kho hiện tại.'}
          </p>
          {mode === 'Zones' || mode === 'Racks' ? (
            <Button
              variant="outline"
              className="self-start"
              disabled={busy}
              onClick={() => void template(mode)}
            >
              Mẫu loại đang chọn
            </Button>
          ) : null}
          {mode !== 'Structure' ? (
            <BulkImportDelimiter
              id="location-import-delimiter"
              value={delimiter}
              disabled={busy}
              onChange={(value) =>
                setDelimiter(value as WarehouseLocationImportOptions['csvDelimiter'])
              }
            />
          ) : null}
          <BulkImportFilePicker
            entityLabel="cấu trúc và vị trí kho"
            maxRows={500}
            pending={busy}
            error={error}
            onFileChange={(candidate) => void readFile(candidate)}
          />
          {file && error ? (
            <Button variant="outline" disabled={busy} onClick={() => void readFile(file)}>
              Đọc lại tệp
            </Button>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Chưa có đơn vị sức chứa?{' '}
            <Link className="underline" href={APP_ROUTES.unitImport}>
              Nhập đơn vị tính trước
            </Link>
            .
          </p>
        </>
      ) : step === 1 && inspection && options ? (
        <>
          {inspection.isCsv ? (
            <BulkImportDelimiter
              id="location-import-remap-delimiter"
              value={delimiter}
              disabled={busy}
              onChange={(value) => {
                const next = value as WarehouseLocationImportOptions['csvDelimiter']
                setDelimiter(next)
                if (file) void readFile(file, next)
              }}
            />
          ) : null}
          <WarehouseLocationImportMapping
            inspection={inspection}
            options={options}
            busy={busy}
            onChange={(next) => {
              if (locked.current) return
              setOptions(next)
              setPreview(null)
              setAcceptedIgnored(false)
              setError(null)
            }}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => navigation.requestDiscard(reset)}
            >
              Chọn tệp khác
            </Button>
            <Button disabled={busy} onClick={() => void checkFile()}>
              Kiểm tra dữ liệu
            </Button>
          </div>
        </>
      ) : preview && inspection ? (
        <>
          {result ? (
            <Alert>
              <AlertTitle>Đã hoàn tất nhập cấu trúc kho</AlertTitle>
              <AlertDescription>
                Đã tạo {result.createdCounts.zones} khu vực, {result.createdCounts.racks} kệ,{' '}
                {result.createdCounts.slots} vị trí. {result.referenceCounts} dòng đã có không tạo
                lại; {result.unselectedCounts} dòng không nhập.
                {result.layoutNeedsArrangement
                  ? ' Các khu vực/kệ mới chưa được sắp xếp; lưu bố cục là thao tác riêng.'
                  : ''}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <WarehouseLocationImportSummary
                kinds={locationImportKinds(inspection.mode)}
                rows={preview.rows}
                selected={selected}
              />
              {missingParents.length ? (
                <Alert variant="destructive">
                  <AlertTitle>Cần chọn thêm {missingParents.length} dòng cha</AlertTitle>
                  <AlertDescription>
                    {preview.rows
                      .filter((row) => missingParents.includes(row.rowKey))
                      .map((row) => `${LOCATION_IMPORT_LABELS[row.kind]} ${row.displayPath}`)
                      .join(' · ')}
                  </AlertDescription>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setSelected(new Set([...selected, ...missingParents]))}
                    >
                      Chọn lại cha cần thiết
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        setSelected(
                          new Set(
                            preview.rows
                              .filter(
                                (row) =>
                                  selected.has(row.rowKey) &&
                                  row.requiredParentRowKeys.every((key) => selected.has(key))
                              )
                              .map((row) => row.rowKey)
                          )
                        )
                      }
                    >
                      Bỏ chọn các dòng phụ thuộc
                    </Button>
                  </div>
                </Alert>
              ) : null}
              {hasIgnored ? (
                <Alert>
                  <AlertTitle>Dữ liệu không nhập</AlertTitle>
                  <AlertDescription className="wrap-anywhere">
                    {preview.ignoredSheets.length
                      ? `Trang tính: ${preview.ignoredSheets.join(', ')}. `
                      : ''}
                    {preview.ignoredColumns
                      .map(
                        (column) =>
                          `${LOCATION_IMPORT_LABELS[column.kind]}: ${column.header || `cột ${column.columnIndex + 1}`}`
                      )
                      .join(' · ')}
                  </AlertDescription>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="location-import-ignored"
                      checked={acceptedIgnored}
                      disabled={busy}
                      onCheckedChange={(value) => setAcceptedIgnored(value === true)}
                    />
                    <FieldLabel htmlFor="location-import-ignored">
                      Tôi đồng ý bỏ qua các trang tính/cột trên.
                    </FieldLabel>
                  </Field>
                </Alert>
              ) : null}
            </>
          )}
          <WarehouseLocationImportReview
            preview={preview}
            inspection={inspection}
            selected={selected}
            busy={busy || uncertain}
            imported={result ? new Set(result.created.map((item) => item.rowKey)) : undefined}
            onSelect={(next) => {
              if (!locked.current && !uncertain) setSelected(next)
            }}
            onExport={report}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.warehouseLayout(warehouseId) as Route}>
                Về danh mục vị trí
              </Link>
            </Button>
            {result ? (
              <>
                <Button variant="outline" onClick={reset}>
                  Nhập thêm tệp
                </Button>
                {preview.capabilities.canViewLayout ? (
                  <Button asChild variant="outline">
                    <Link href={APP_ROUTES.warehouseLayoutViewer(warehouseId)}>Mở sơ đồ kho</Link>
                  </Button>
                ) : null}
                {preview.capabilities.canEditLayout ? (
                  <Button asChild>
                    <Link href={APP_ROUTES.warehouseLayoutDesigner(warehouseId)}>
                      Sắp xếp sơ đồ
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={busy || uncertain}
                  onClick={() => {
                    setPreview(null)
                    setError(null)
                    setNeedsRecheck(false)
                  }}
                >
                  Quay lại ghép cột
                </Button>
                <Button disabled={!canCommit} onClick={() => setConfirmOpen(true)}>
                  Nhập {selected.size} mục
                </Button>
              </>
            )}
          </div>
        </>
      ) : null}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nhập {countLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Chỉ tạo những mục đã chọn. Các dòng đã có không được cập nhật; các dòng khác không
              nhập. Tất cả mục được chọn sẽ lưu cùng một lần.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {preview ? (
            <p className="text-muted-foreground text-xs">
              {
                preview.rows.filter(
                  (row) =>
                    selected.has(row.rowKey) &&
                    (row.kind === 'Slot' || row.values.storageMode === 'RackLevel') &&
                    !row.sourceValues.capacityType
                ).length
              }{' '}
              vị trí chứa hàng mới dùng sức chứa mặc định không giới hạn.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel>
            <AlertDialogAction disabled={!canCommit} onClick={() => void commit()}>
              Xác nhận nhập
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
