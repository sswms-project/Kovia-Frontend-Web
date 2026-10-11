import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import { supplierService } from './supplier.service'

vi.mock('@/lib/axios', () => ({ axiosClient: { post: vi.fn() } }))
const options = {
  sheetId: 'csv',
  headerRowNumber: 2,
  columnMapping: [{ field: 'name', columnIndex: 1 }],
  csvDelimiter: ';',
}
beforeEach(() => {
  vi.mocked(axiosClient.post)
    .mockReset()
    .mockResolvedValue({ data: { data: { rows: [] } } })
})

describe('supplier spreadsheet request contract', () => {
  it('sends file and delimiter for inspection without a commit', async () => {
    const file = new File(['Tên;Mã\nA;1'], 'a.csv')
    await supplierService.inspectImport({ file, csvDelimiter: ';' })
    const [url, body, config] = vi.mocked(axiosClient.post).mock.calls[0]!
    expect(url).toBe(API_ENDPOINTS.suppliers.importInspect)
    expect((body as FormData).get('file')).toBe(file)
    expect((body as FormData).get('csvDelimiter')).toBe(';')
    expect(config?.headers).toEqual({ 'Content-Type': null })
  })
  it('includes mapping options for the wizard', async () => {
    const file = new File(['a'], 'a.xlsx')
    await supplierService.previewImport({ file, options })
    const [url, body] = vi.mocked(axiosClient.post).mock.calls[0]!
    expect(url).toBe(API_ENDPOINTS.suppliers.importPreview)
    expect((body as FormData).get('file')).toBe(file)
    expect(JSON.parse((body as FormData).get('options') as string)).toEqual(options)
  })
  it('preserves the legacy file-only preview request', async () => {
    const file = new File(['a'], 'a.csv')
    await supplierService.previewImport(file)
    const [, body] = vi.mocked(axiosClient.post).mock.calls[0]!
    expect((body as FormData).get('file')).toBe(file)
    expect((body as FormData).has('options')).toBe(false)
  })
})
