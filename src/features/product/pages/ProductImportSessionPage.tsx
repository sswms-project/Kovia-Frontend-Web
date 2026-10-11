'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { P } from '@/config/permissionCodes'
import { downloadBulkImportFile } from '@/components/operations/bulk-import'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { getApiErrorMessage, isApiErrorResponse, formatApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { ProductImportView, ProductImportCatalogPanel } from '../components/ProductImportPage'
import {
  productImportCatalogSchema,
  type ProductImportCatalogValues,
} from '../schemas/product-import-catalog.schema'
import type { ProductImportReviewFilters } from '../components/ProductImportPage'
import {
  useProductImportInspect,
  useProductImportPreview,
  useProductImportTemplate,
} from '../hooks/use-product-import'
import { useImportProductsMutation, useUnitsQuery, useCategoriesQuery } from '../hooks/use-products'
import { useProductImportNavigation } from '../hooks/use-product-import-navigation'
import {
  productImportFileSchema,
  productImportOptionsSchema,
  type ProductImportFormValues,
} from '../schemas/product-import.schema'
import type { ProductImportOptions, ProductImportPreview } from '../types/product-import.types'
import {
  defaultProductImportOptions,
  isValidProductImportRow,
  productImportPayload,
  productImportReportCsv,
  selectedProductImportRows,
} from '../utils/product-import'

export default function ProductImportSessionPage() {
  const me = useMeQuery()
  const units = useUnitsQuery(Boolean(me.data?.permissions.includes(P.UNITS_VIEW)), 'Active')
  const categories = useCategoriesQuery(
    Boolean(me.data?.permissions.includes(P.CATEGORIES_VIEW)),
    'Active'
  )
  const instanceId = useId()
  const [generation, setGeneration] = useState(0)
  const [revision, setRevision] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [delimiter, setDelimiter] = useState<ProductImportOptions['csvDelimiter']>('auto')
  const [options, setOptions] = useState<ProductImportOptions | null>(null)
  const [step, setStep] = useState<'file' | 'mapping' | 'review' | 'result'>('file')
  const [selection, setSelection] = useState<number[] | null>(null)
  const [view, setView] = useState<ProductImportReviewFilters>({
    search: '',
    status: 'all',
    page: 1,
    pageSize: 20,
  })
  const [importedRows, setImportedRows] = useState<number[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [catalogPanelOpen, setCatalogPanelOpen] = useState(false)
  const catalogForm = useForm<ProductImportCatalogValues>({
    resolver: zodResolver(productImportCatalogSchema),
    defaultValues: { entries: [], confirmed: false },
  })
  const [forbidden, setForbidden] = useState(false)
  const commitLock = useRef(false)
  const operationLock = useRef(false)
  const [retainedPreview, setRetainedPreview] = useState<ProductImportPreview>()
  const sessionId = `${instanceId}:${generation}`
  const inspect = useProductImportInspect(sessionId, file, delimiter)
  const preview = useProductImportPreview(sessionId, revision, file, options)
  const template = useProductImportTemplate()
  const commit = useImportProductsMutation()
  const form = useForm<ProductImportFormValues>({
    resolver: zodResolver(productImportOptionsSchema(inspect.data)),
    defaultValues: {
      main: { sheetId: '', headerRowNumber: 1, columnMapping: [] },
      conversions: null,
      csvDelimiter: 'auto',
      schemaVersion: 1,
    },
  })
  useEffect(() => {
    if (inspect.data) {
      form.reset({ ...defaultProductImportOptions(inspect.data), schemaVersion: 1 })
    }
  }, [inspect.data, form])
  const busy = inspect.isFetching || preview.isFetching || commit.isPending || template.isPending
  useEffect(() => {
    if (!busy) operationLock.current = false
  }, [busy, generation])
  const activity = commit.isPending
    ? 'importing'
    : template.isPending
      ? 'template'
      : inspect.isFetching
        ? 'reading'
        : preview.isFetching
          ? 'checking'
          : 'idle'
  const data = preview.data ?? retainedPreview
  const visibleStep = step === 'file' && inspect.data ? 'mapping' : step
  const selected =
    selection ??
    (data && !data.fileErrors.length
      ? data.rows.filter(isValidProductImportRow).map((row) => row.rowNumber)
      : [])
  const rowsToImport = preview.data ? selectedProductImportRows(preview.data, selected) : []
  const conversionCount = rowsToImport.reduce((count, row) => count + row.unitConversions.length, 0)
  const denied =
    forbidden ||
    [inspect.error, preview.error].some(
      (error) => isApiErrorResponse(error) && error.statusCode === 403
    )
  const navigation = useProductImportNavigation(Boolean(file) && step !== 'result', busy)

  function invalidatePreview(preserve = false) {
    setRetainedPreview(preserve ? data : undefined)
    setView({ search: '', status: 'all', page: 1, pageSize: 20 })
    setRevision((value) => value + 1)
    setOptions(null)
    setSelection(null)
    setImportedRows([])
    setCommitError(null)
    setConfirmationOpen(false)
  }
  function reset() {
    if (busy || commitLock.current) return
    navigation.requestDiscard(() => {
      invalidatePreview()
      setGeneration((value) => value + 1)
      setFile(null)
      setDelimiter('auto')
      setFileError(null)
      setStep('file')
    })
  }
  function chooseFile(nextFile: File) {
    if (busy || operationLock.current) return
    const checked = productImportFileSchema.safeParse(nextFile)
    if (!checked.success) {
      setFileError(checked.error.issues[0]?.message ?? 'Tệp không hợp lệ.')
      return
    }
    operationLock.current = true
    invalidatePreview()
    setGeneration((value) => value + 1)
    setFile(nextFile)
    setFileError(null)
    setStep('file')
  }
  async function checkData() {
    if (busy || operationLock.current || !inspect.data) return
    operationLock.current = true
    try {
      await form.handleSubmit(
        (values) => {
          invalidatePreview(step === 'review')
          setOptions({
            ...values,
            referenceChoices: options?.referenceChoices,
            newCatalogs: options?.newCatalogs,
            confirmCreateCatalogs: options?.confirmCreateCatalogs,
          })
          setStep('review')
        },
        (errors) => {
          const kind = errors.main ? 'main' : 'conversions'
          const values = form.getValues(kind)
          const fields =
            kind === 'main'
              ? inspect.data!.schema.mainFields
              : inspect.data!.schema.conversionFields
          const field = fields.find((field) => {
            const column = values?.columnMapping.find((item) => item.field === field.field)
            return (
              (field.isRequired && !column) ||
              (column &&
                values!.columnMapping.filter((item) => item.columnIndex === column.columnIndex)
                  .length > 1)
            )
          })
          const id = errors[kind]?.sheetId
            ? `import-${kind}-sheet`
            : errors[kind]?.headerRowNumber
              ? `import-${kind}-header`
              : field
                ? `import-${kind}-${field.field}`
                : `import-${kind}-header`
          requestAnimationFrame(() => document.getElementById(id)?.focus())
        }
      )()
    } finally {
      operationLock.current = false
    }
  }
  async function downloadTemplate(variant: 'basic' | 'full') {
    if (busy || denied || operationLock.current) return
    operationLock.current = true
    try {
      const blob = await template.mutateAsync(variant)
      downloadBulkImportFile(blob, `kovia-mau-nhap-hang-hoa-${variant}.xlsx`)
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode === 403) setForbidden(true)
      toast.error(getApiErrorMessage(error, 'Không thể tải mẫu.'))
    } finally {
      operationLock.current = false
    }
  }
  async function confirmImport() {
    if (busy || denied || commitLock.current || commitError || !data || !rowsToImport.length) return
    commitLock.current = true
    const confirmed = rowsToImport.map((row) => row.rowNumber)
    try {
      await commit.mutateAsync(productImportPayload(data, confirmed))
      setView({ search: '', status: 'all', page: 1, pageSize: 20 })
      setImportedRows(confirmed)
      setStep('result')
      setConfirmationOpen(false)
      toast.success(`Đã nhập ${confirmed.length} sản phẩm và ${conversionCount} đơn vị quy đổi.`)
    } catch (error) {
      setConfirmationOpen(false)
      if (isApiErrorResponse(error) && error.statusCode === 403) setForbidden(true)
      const knownFailure = isApiErrorResponse(error) && [400, 409, 422].includes(error.statusCode)
      setCommitError(
        knownFailure
          ? getApiErrorMessage(error)
          : 'Chưa xác định kết quả lưu do kết nối hoặc lỗi máy chủ. Kiểm tra danh sách hàng hóa, sau đó kiểm tra lại tệp trước khi gửi tiếp; không tự gửi lại.'
      )
      toast.error(
        knownFailure ? getApiErrorMessage(error) : 'Chưa xác định kết quả nhập. Không gửi lại ngay.'
      )
    } finally {
      commitLock.current = false
    }
  }
  function exportReport() {
    if (!data) return
    downloadBulkImportFile(
      new Blob([productImportReportCsv(data, step === 'result' ? importedRows : undefined)], {
        type: 'text/csv;charset=utf-8',
      }),
      'kovia-bao-cao-nhap-hang-hoa.csv'
    )
  }
  function openCatalogPanel() {
    if (!data || busy) return
    catalogForm.reset({
      confirmed: Boolean(options?.confirmCreateCatalogs),
      entries: (data.missingReferences ?? []).map((reference) => {
        const choice = options?.referenceChoices?.find(
          (item) => item.categories === reference.categories && item.value === reference.value
        )
        const selectedId = choice?.id ?? reference.id
        const draft = (options?.newCatalogs ?? data.newCatalogs)?.find(
          (item) => item.id === selectedId
        )
        const existing = (
          reference.categories ? data.availableCategories : data.availableUnits
        )?.find((item) => item.id === selectedId)
        return {
          id: existing ? crypto.randomUUID() : reference.id,
          categories: reference.categories,
          value: reference.value,
          rowNumber: reference.productRows[0] ?? 1,
          canCreate: reference.canCreate,
          mode: draft ? 'create' : existing ? 'existing' : reference.canCreate ? 'create' : 'skip',
          existingId: existing?.id ?? '',
          code: draft?.item.code ?? reference.suggestedCode,
          name: draft?.item.name ?? reference.value,
          parentCode: draft?.item.parentCode ?? '',
          symbol: draft?.item.symbol ?? '',
          quantityPrecision: draft?.item.quantityPrecision ?? 0,
        }
      }),
    })
    setCatalogPanelOpen(true)
  }
  async function applyCatalogs() {
    if (busy || operationLock.current || !options) return
    await catalogForm.handleSubmit((values) => {
      operationLock.current = true
      setRetainedPreview(data)
      setCommitError(null)
      setRevision((value) => value + 1)
      setOptions({
        ...options,
        confirmCreateCatalogs: values.confirmed,
        referenceChoices: values.entries
          .filter((entry) => entry.mode !== 'skip')
          .map((entry) => ({
            categories: entry.categories,
            value: entry.value,
            id: entry.mode === 'existing' ? entry.existingId : entry.id,
          })),
        newCatalogs: values.entries
          .filter((entry) => entry.mode === 'create')
          .map((entry) => ({
            id: entry.id,
            categories: entry.categories,
            item: {
              rowNumber: entry.rowNumber,
              code: entry.code,
              name: entry.name,
              parentCode: entry.parentCode || null,
              symbol: entry.symbol || null,
              quantityPrecision: entry.quantityPrecision,
              description: null,
            },
          })),
      })
      setCatalogPanelOpen(false)
    })()
  }
  return (
    <>
      {denied ? (
        <p role="alert">Quyền nhập tệp đã bị thu hồi. Không thể tiếp tục phiên nhập.</p>
      ) : (
        <ProductImportView
          setup={{
            canImportUnits: Boolean(me.data?.permissions.includes(P.UNITS_MANAGE)),
            canImportCategories: Boolean(me.data?.permissions.includes(P.CATEGORIES_MANAGE)),
            missing: units.data?.length === 0 || categories.data?.length === 0,
          }}
          onManageCatalogs={openCatalogPanel}
          view={view}
          onViewChange={setView}
          step={visibleStep}
          file={file}
          busy={busy}
          activity={activity}
          commit={commit}
          inspect={inspect}
          preview={preview}
          data={data}
          form={form}
          fileError={fileError}
          commitError={commitError}
          delimiter={delimiter}
          selected={selected}
          importedRows={importedRows}
          rowsToImport={rowsToImport}
          conversionCount={conversionCount}
          confirmationOpen={confirmationOpen}
          revision={revision}
          downloadTemplate={downloadTemplate}
          chooseFile={chooseFile}
          reset={reset}
          checkData={checkData}
          confirmImport={confirmImport}
          exportReport={exportReport}
          invalidatePreview={invalidatePreview}
          setDelimiter={setDelimiter}
          setStep={setStep}
          setSelection={setSelection}
          setConfirmationOpen={setConfirmationOpen}
          onRetryInspection={() => {
            logger.warn(formatApiError(inspect.error ?? preview.error))
            if (inspect.isError) void inspect.refetch()
            else void checkData()
          }}
        />
      )}
      {data ? (
        <ProductImportCatalogPanel
          open={catalogPanelOpen}
          pending={busy}
          preview={data}
          form={catalogForm}
          onOpenChange={setCatalogPanelOpen}
          onSubmit={() => void applyCatalogs()}
        />
      ) : null}
      <UnsavedChangesDialog
        open={navigation.discardOpen}
        onOpenChange={(open) => {
          if (!open) navigation.cancelDiscard()
        }}
        onDiscard={navigation.confirmDiscard}
      />
    </>
  )
}
