import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ProductImportOptions } from '../types/product-import.types'
import { productImportService } from './product-import.service'

vi.mock('@/lib/axios', () => ({ axiosClient: { get: vi.fn(), post: vi.fn() } }))
afterEach(() => vi.clearAllMocks())
const file = new File(['x'], 'hang.csv')

describe('product import HTTP contract', () => {
  it('inspects multipart file with explicit CSV delimiter and abort signal', async () => {
    const result = { schema: { version: 1 } }
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { data: result } })
    const signal = new AbortController().signal
    expect(await productImportService.inspect(file, '\t', signal)).toEqual(result)
    const call = vi.mocked(axiosClient.post).mock.calls[0]!
    expect(call[0]).toBe(API_ENDPOINTS.products.importInspect)
    const data = call[1] as FormData
    expect(data.get('file')).toBe(file)
    expect(data.get('csvDelimiter')).toBe('\t')
    expect(call[2]).toEqual({ signal, headers: { 'Content-Type': 'multipart/form-data' } })
  })
  it('sends exact schema/options JSON without parsing or mutating workbook', async () => {
    vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { data: { rows: [] } } })
    const options: ProductImportOptions = {
      main: {
        sheetId: 'csv',
        headerRowNumber: 8,
        columnMapping: [{ field: 'sku', columnIndex: 2 }],
      },
      conversions: null,
      csvDelimiter: ';',
      schemaVersion: 1,
    }
    const signal = new AbortController().signal
    await productImportService.preview(file, options, signal)
    const call = vi.mocked(axiosClient.post).mock.calls[0]!
    expect(call[0]).toBe(API_ENDPOINTS.products.importPreview)
    expect((call[1] as FormData).get('options')).toBe(JSON.stringify(options))
    expect((call[1] as FormData).get('file')).toBe(file)
    expect(call[2]).toEqual({ signal, headers: { 'Content-Type': 'multipart/form-data' } })
  })
  it.each(['basic', 'full'] as const)('downloads %s template as a blob', async (variant) => {
    const blob = new Blob(['xlsx'])
    vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: blob })
    expect(await productImportService.template(variant)).toBe(blob)
    expect(axiosClient.get).toHaveBeenCalledWith(API_ENDPOINTS.products.importTemplate, {
      params: { variant },
      responseType: 'blob',
    })
  })
})
