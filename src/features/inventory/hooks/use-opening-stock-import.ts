'use client'

import { useRef, useState } from 'react'
import { ZodError } from 'zod'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BulkImportActivity } from '@/components/operations/BulkImportWorkspace'
import {
  downloadBulkImportFile,
  hasBulkImportExtension,
  BULK_IMPORT_MAX_FILE_BYTES,
} from '@/components/operations/bulk-import'
import { initialSpreadsheetMapping } from '@/components/operations/spreadsheet-import'
import type { SpreadsheetImportOptions } from '@/components/operations/spreadsheet-import.types'
import { openingStockImportOptionsSchema } from '../schemas/opening-stock-import.schema'
import type { OpeningStockImportOptions } from '../schemas/opening-stock-import.schema'
import { openingStockImportService as service } from '../services/opening-stock-import.service'
import type {
  OpeningStockImportCommit,
  OpeningStockImportInspection,
  OpeningStockImportPreview,
} from '../types/opening-stock-import.types'

export function openingImportError(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? 'Cấu hình import không hợp lệ.'
  return error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}

export function useOpeningStockImport() {
  const queryClient = useQueryClient()
  const inspectRequest = useMutation({
    mutationFn: ({ file, delimiter }: { file: File; delimiter: string }) =>
      service.inspect(file, delimiter),
    retry: false,
    onError: logger.warn,
  })
  const previewRequest = useMutation({
    mutationFn: ({ file, options }: { file: File; options: OpeningStockImportOptions }) =>
      service.preview(file, options),
    retry: false,
    onError: logger.warn,
  })
  const commitRequest = useMutation({
    mutationFn: ({ file, payload }: { file: File; payload: OpeningStockImportCommit }) =>
      service.commit(file, payload),
    retry: false,
    onError: logger.warn,
  })
  const operationRequest = useMutation({
    mutationFn: service.operation,
    retry: false,
    onError: logger.warn,
  })
  const templateRequest = useMutation({
    mutationFn: service.template,
    retry: false,
    onError: logger.warn,
  })
  const lock = useRef(false)
  const pendingCommit = useRef<{ file: File; payload: OpeningStockImportCommit } | null>(null)
  const [activity, setActivity] = useState<BulkImportActivity>('idle')
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [inspection, setInspection] = useState<OpeningStockImportInspection | null>(null)
  const [options, setOptions] = useState<OpeningStockImportOptions | null>(null)
  const [preview, setPreview] = useState<OpeningStockImportPreview | null>(null)
  const [selected, setSelected] = useState<readonly string[]>([])
  const [stale, setStale] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [resultId, setResultId] = useState<string | null>(null)
  const resultQuery = useQuery({
    queryKey: ['inventory', 'opening-stock', resultId],
    queryFn: () => service.detail(resultId!),
    enabled: Boolean(resultId),
    retry: false,
  })
  const [step, setStep] = useState(0)

  async function run(next: BulkImportActivity, action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setActivity(next)
    setError(null)
    try {
      await action()
    } catch (cause) {
      const message = openingImportError(cause)
      setError(message)
      logger.warn('Opening stock import failed', cause)
      toast.error(message)
    } finally {
      lock.current = false
      setActivity('idle')
    }
  }
  function changeSelection(keys: readonly string[]) {
    if (lock.current || uncertain) return
    setSelected(keys)
    setStale(true)
  }
  async function inspect(
    nextFile: File,
    setup: { warehouseId: string; effectiveDate: string },
    delimiter: string
  ) {
    return run('reading', async () => {
      if (
        !hasBulkImportExtension(nextFile.name) ||
        !nextFile.size ||
        nextFile.size > BULK_IMPORT_MAX_FILE_BYTES
      )
        throw new Error('Chọn tệp XLSX hoặc CSV không rỗng, tối đa 5 MB.')
      const data = await inspectRequest.mutateAsync({ file: nextFile, delimiter })
      setFile(nextFile)
      setInspection(data)
      const mapping = initialSpreadsheetMapping(data)
      setOptions({
        ...setup,
        spreadsheet: {
          ...mapping,
          schemaVersion: 1,
          csvDelimiter: mapping.csvDelimiter ?? 'auto',
          columnMapping: [...mapping.columnMapping],
        },
        selectedRowKeys: null,
      })
      setPreview(null)
      setSelected([])
      setStale(false)
      setStep(1)
    })
  }
  async function check(nextOptions = options) {
    if (!file || !nextOptions || uncertain) return
    return run('checking', async () => {
      const validated = openingStockImportOptionsSchema.parse(nextOptions)
      const data = await previewRequest.mutateAsync({ file, options: validated })
      setOptions(validated)
      setPreview(data)
      setSelected(data.selectedRowKeys)
      setStale(false)
      setStep(2)
    })
  }
  function select(keys: readonly string[]) {
    changeSelection(keys)
  }
  async function recheck() {
    if (options) await check({ ...options, selectedRowKeys: [...selected] })
  }
  async function completed(id: string) {
    setResultId(id)
    setUncertain(false)
    pendingCommit.current = null
    setStep(3)
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }
  async function reconcile() {
    const pending = pendingCommit.current
    if (!pending) return
    return run('checking', async () => {
      const outcome = await operationRequest.mutateAsync(pending.payload.commandId)
      if (outcome.status === 'Completed' && outcome.id) await completed(outcome.id)
      else
        setError(
          'Chưa xác định kết quả. Không tạo lại phiếu mới; hãy kiểm tra lại hoặc thử lại cùng thao tác.'
        )
    })
  }
  async function send(pending: { file: File; payload: OpeningStockImportCommit }) {
    try {
      await completed(await commitRequest.mutateAsync(pending))
    } catch (cause) {
      const status =
        cause && typeof cause === 'object' && 'statusCode' in cause ? Number(cause.statusCode) : 0
      const codes =
        cause && typeof cause === 'object' && 'errors' in cause
          ? ((cause.errors as Record<string, string[]> | undefined)?.errorCode ?? [])
          : []
      const rejected =
        (status >= 400 && status < 500 && status !== 409) ||
        codes.some((code) =>
          [
            'OPENING_STOCK_PREVIEW_CHANGED',
            'OPENING_STOCK_SCOPE_ALREADY_USED',
            'OPENING_STOCK_EXISTING_BALANCE_WITHOUT_LEDGER',
            'OPENING_STOCK_LOT_CHANGED',
            'OPENING_STOCK_COMMAND_CONTENT_MISMATCH',
          ].includes(code)
        )
      // A conflict can also mean a concurrent retry committed first; resolve by command ID.
      if (!rejected) {
        setUncertain(true)
        try {
          const outcome = await operationRequest.mutateAsync(pending.payload.commandId)
          if (outcome.status === 'Completed' && outcome.id) {
            await completed(outcome.id)
            return
          }
        } catch {
          /* Retain the exact command for explicit recovery; never retry writes automatically. */
        }
      } else {
        pendingCommit.current = null
        setUncertain(false)
        setStale(true)
      }
      throw cause
    }
  }
  async function commit(acceptedIgnoredData: boolean, acknowledgePendingLots: boolean) {
    if (
      !file ||
      !options ||
      !preview ||
      stale ||
      uncertain ||
      !selected.length ||
      preview.selectionErrors.length
    )
      return
    return run('importing', async () => {
      const pending = {
        file,
        payload: {
          options: { ...options, selectedRowKeys: [...selected] },
          previewFingerprint: preview.previewFingerprint,
          selectedSetFingerprint: preview.selectedSetFingerprint,
          rowFingerprints: Object.fromEntries(
            preview.rows
              .filter((r) => selected.includes(r.rowKey))
              .map((r) => [r.rowKey, r.validationFingerprint])
          ),
          commandId: crypto.randomUUID(),
          acceptedIgnoredData,
          acknowledgePendingLots,
          formVersion: 1 as const,
        },
      }
      pendingCommit.current = pending
      await send(pending)
    })
  }
  async function retryCommit() {
    if (pendingCommit.current) await run('importing', () => send(pendingCommit.current!))
  }
  async function template(variant: 'basic' | 'full') {
    await run('template', async () =>
      downloadBulkImportFile(
        await templateRequest.mutateAsync(variant),
        `Ton_dau_ky_${variant === 'basic' ? 'co_ban' : 'day_du'}.xlsx`
      )
    )
  }
  function back() {
    if (!lock.current && !uncertain) setStep(1)
  }
  function checkMapping(spreadsheet: SpreadsheetImportOptions) {
    if (!lock.current && !uncertain)
      setOptions((current) =>
        current
          ? {
              ...current,
              spreadsheet: {
                ...spreadsheet,
                schemaVersion: 1,
                csvDelimiter: spreadsheet.csvDelimiter ?? 'auto',
                columnMapping: [...spreadsheet.columnMapping],
              },
              selectedRowKeys: null,
            }
          : null
      )
  }
  function changeContext(setup: { warehouseId: string; effectiveDate: string }) {
    if (lock.current || uncertain) return
    setOptions((current) => (current ? { ...current, ...setup, selectedRowKeys: null } : null))
    setPreview(null)
    setSelected([])
    setStale(true)
    setStep(1)
  }
  function reset() {
    if (lock.current || uncertain) return
    setFile(null)
    setInspection(null)
    setOptions(null)
    setPreview(null)
    setSelected([])
    setStale(false)
    setError(null)
    setResultId(null)
    setStep(0)
  }
  return {
    activity,
    error,
    file,
    inspection,
    options,
    preview,
    selected,
    stale,
    uncertain,
    resultId,
    resultCode: resultQuery.data?.code,
    step,
    inspect,
    check,
    select,
    recheck,
    commit,
    reconcile,
    retryCommit,
    template,
    back,
    reset,
    checkMapping,
    changeContext,
  }
}
