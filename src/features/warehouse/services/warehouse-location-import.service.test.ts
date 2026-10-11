import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WarehouseLocationImportOptions } from '../schemas/warehouse-location-import.schema'
import { warehouseLocationImportService } from './warehouse-location-import.service'

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/lib/axios', () => ({ axiosClient: api }))

const options: WarehouseLocationImportOptions = {
  schemaVersion: 1,
  mode: 'Zones',
  csvDelimiter: 'auto',
  tables: [
    {
      kind: 'Zone',
      sheetId: 'csv',
      headerRowNumber: 1,
      columnMapping: [{ field: 'zoneCode', columnIndex: 0 }],
    },
  ],
}

describe('warehouse import multipart contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.post.mockResolvedValue({ data: { data: { rows: [] } } })
  })
  it('overrides the shared JSON header for file inspection', async () => {
    const file = new File(['Mã khu vực\nZ01'], 'zones.csv')
    await warehouseLocationImportService.inspect('warehouse', file, 'Zones', ';')
    expect(api.post).toHaveBeenCalledWith(
      '/warehouses/warehouse/locations/import/inspect',
      expect.any(FormData),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    const form: unknown = api.post.mock.lastCall?.[1]
    if (!(form instanceof FormData)) throw new Error('Expected a multipart form')
    expect(form.get('mode')).toBe('Zones')
    expect(form.get('csvDelimiter')).toBe(';')
    expect(form.get('file')).toBeInstanceOf(File)
  })
  it('commit resends the source, options, explicit selection and preview fingerprint', async () => {
    const selection = {
      expectedPreviewFingerprint: 'sha256:preview',
      selectedRowKeys: ['["Zone","csv",2]'],
      acknowledgeIgnoredData: true,
    }
    await warehouseLocationImportService.commit(
      'warehouse',
      new File(['Z01'], 'zones.csv'),
      options,
      selection
    )
    const form: unknown = api.post.mock.lastCall?.[1]
    if (!(form instanceof FormData)) throw new Error('Expected a multipart form')
    expect(JSON.parse(String(form.get('options')))).toEqual(options)
    expect(JSON.parse(String(form.get('selection')))).toEqual(selection)
    expect(form.get('file')).toBeInstanceOf(File)
    expect(api.post).toHaveBeenCalledTimes(1)
  })
  it('does not retry or swallow an uncertain commit failure', async () => {
    const failure = { statusCode: 500, message: 'Kết nối bị ngắt.' }
    api.post.mockRejectedValueOnce(failure)
    await expect(
      warehouseLocationImportService.commit('warehouse', new File(['Z01'], 'zones.csv'), options, {
        expectedPreviewFingerprint: 'preview',
        selectedRowKeys: ['row'],
        acknowledgeIgnoredData: false,
      })
    ).rejects.toEqual(failure)
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})
