import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openingStockImportService as service } from '../services/opening-stock-import.service'
import { useOpeningStockImport } from './use-opening-stock-import'
import type { OpeningStockImportPreview } from '../types/opening-stock-import.types'

vi.mock('../services/opening-stock-import.service', () => ({
  openingStockImportService: {
    inspect: vi.fn(),
    preview: vi.fn(),
    commit: vi.fn(),
    operation: vi.fn(),
    template: vi.fn(),
    detail: vi.fn().mockResolvedValue({ code: 'OPEN-01' }),
  },
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
const warehouseId = '89e756b0-a22f-4c14-8f3a-5c480a1bf642'
const setup = { warehouseId, effectiveDate: '2026-01-01' }
const file = new File(['Mã hàng,Vị trí,Số lượng\nSP01,A1,2'], 'ton-dau.csv', { type: 'text/csv' })
const mapping = [
  { field: 'sku', columnIndex: 0 },
  { field: 'locationCode', columnIndex: 1 },
  { field: 'quantity', columnIndex: 2 },
]
const preview: OpeningStockImportPreview = {
  schemaVersion: 1,
  fileName: file.name,
  fileHash: 'file-hash',
  ...setup,
  rows: [
    {
      rowKey: 'csv:2',
      rowNumber: 2,
      sheetName: 'CSV',
      rawValues: {},
      productId: 'p',
      sku: 'SP01',
      productName: 'Hàng',
      slotId: 's',
      locationLabel: 'A1',
      unitId: 'u',
      unitName: 'Cái',
      quantity: 2,
      quantityText: '2',
      lotId: null,
      lotNumber: null,
      manufacturedDate: null,
      expiryDate: null,
      newLot: null,
      qualityStatus: 'Good',
      eligibilityStatus: 'Available',
      fieldErrors: {},
      errors: [],
      warnings: [],
      isValid: true,
      validationFingerprint: 'row-hash',
    },
  ],
  totalCount: 1,
  validCount: 1,
  invalidCount: 0,
  selectedRowKeys: ['csv:2'],
  previewFingerprint: 'preview-hash',
  selectedSetFingerprint: 'set-hash',
  checkedAt: '',
  selectionErrors: [],
  ignoredSheets: [],
  ignoredColumns: [],
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderHook(() => useOpeningStockImport(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(service.inspect).mockResolvedValue({
    schemaVersion: 1,
    fields: [],
    isCsv: true,
    csvDelimiter: ',',
    sheets: [
      {
        sheetId: 'csv',
        sheetName: 'CSV',
        sampleRows: [],
        headerCandidates: [
          { rowNumber: 1, hasAllRequiredFields: true, suggestedMapping: mapping, columns: [] },
        ],
      },
    ],
  })
  vi.mocked(service.preview).mockResolvedValue(preview)
  vi.mocked(service.operation).mockResolvedValue({ status: 'Unknown', id: null, code: null })
})
async function ready() {
  const hook = mount()
  await act(() => hook.result.current.inspect(file, setup, ','))
  await act(() => hook.result.current.check())
  return hook
}
describe('opening stock import session', () => {
  it('guards double file selection inside the handler', async () => {
    const hook = mount()
    await act(async () => {
      await Promise.all([
        hook.result.current.inspect(file, setup, ','),
        hook.result.current.inspect(file, setup, ','),
      ])
    })
    expect(service.inspect).toHaveBeenCalledTimes(1)
    expect(hook.result.current.step).toBe(1)
    expect(hook.result.current.activity).toBe('idle')
  })
  it('blocks commit after selection changes until capacity is rechecked', async () => {
    const hook = await ready()
    act(() => hook.result.current.select(['csv:2']))
    expect(hook.result.current.stale).toBe(true)
    await act(() => hook.result.current.commit(false, false))
    expect(service.commit).not.toHaveBeenCalled()
    await act(() => hook.result.current.recheck())
    expect(hook.result.current.stale).toBe(false)
    expect(service.preview).toHaveBeenLastCalledWith(
      file,
      expect.objectContaining({ selectedRowKeys: ['csv:2'] })
    )
  })
  it('does not create twice on double confirmation', async () => {
    vi.mocked(service.commit).mockResolvedValue('record-id')
    const hook = await ready()
    await act(async () => {
      await Promise.all([
        hook.result.current.commit(false, false),
        hook.result.current.commit(false, false),
      ])
    })
    expect(service.commit).toHaveBeenCalledTimes(1)
    expect(hook.result.current.resultId).toBe('record-id')
  })
  it('keeps the exact command after a lost response and never retries automatically', async () => {
    vi.mocked(service.commit)
      .mockRejectedValueOnce({ statusCode: 0, message: 'Mất kết nối' })
      .mockResolvedValueOnce('recovered-id')
    const hook = await ready()
    await act(() => hook.result.current.commit(false, false))
    expect(service.commit).toHaveBeenCalledTimes(1)
    expect(hook.result.current.uncertain).toBe(true)
    act(() => hook.result.current.reset())
    expect(hook.result.current.file).toBe(file)
    await act(() => hook.result.current.retryCommit())
    expect(vi.mocked(service.commit).mock.calls[1]?.[1]).toEqual(
      vi.mocked(service.commit).mock.calls[0]?.[1]
    )
    expect(hook.result.current.resultId).toBe('recovered-id')
  })
  it('recovers a completed operation instead of resending a write', async () => {
    vi.mocked(service.commit).mockRejectedValue({ statusCode: 503, message: 'Mất phản hồi' })
    vi.mocked(service.operation).mockResolvedValue({
      status: 'Completed',
      id: 'saved-id',
      code: 'OPEN-01',
    })
    const hook = await ready()
    await act(() => hook.result.current.commit(false, false))
    expect(hook.result.current.resultId).toBe('saved-id')
    expect(service.commit).toHaveBeenCalledTimes(1)
  })
  it('known stale preview conflicts unlock revalidation, not an endless retry screen', async () => {
    vi.mocked(service.commit).mockRejectedValue({
      statusCode: 409,
      message: 'Kiểm tra lại',
      errors: { errorCode: ['OPENING_STOCK_PREVIEW_CHANGED'] },
    })
    const hook = await ready()
    await act(() => hook.result.current.commit(false, false))
    expect(hook.result.current.uncertain).toBe(false)
    expect(hook.result.current.stale).toBe(true)
    expect(service.operation).not.toHaveBeenCalled()
  })
})
