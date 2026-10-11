import { afterEach, describe, expect, it } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { catalogImportService } from './catalog-import.service'

const originalAdapter = axiosClient.defaults.adapter
afterEach(() => {
  axiosClient.defaults.adapter = originalAdapter
})

describe('catalog multipart upload', () => {
  it.each(['units', 'categories'] as const)(
    'preserves file bytes and mapping through Axios for %s',
    async (kind) => {
      const captured: { data: unknown; contentType: unknown }[] = []
      axiosClient.defaults.adapter = async (config) => {
        captured.push({ data: config.data, contentType: config.headers.getContentType() })
        return {
          data: { isSuccess: true, data: { rows: [] } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }
      const file = new File(['Tên ĐVT\nLon'], 'qa.csv', { type: 'text/csv' })
      await catalogImportService.inspect(kind, file, ';')
      await catalogImportService.preview(
        kind,
        file,
        { sheetId: 'csv', headerRowNumber: 1, columnMapping: [{ field: 'name', columnIndex: 0 }] },
        [{ rowNumber: 2, code: 'DVT-QA' }]
      )
      expect(captured).toHaveLength(2)
      for (const request of captured) {
        expect(request.contentType).toBe('multipart/form-data')
        expect(request.data).toBeInstanceOf(FormData)
        expect((request.data as FormData).get('file')).toBe(file)
      }
      expect((captured[0]!.data as FormData).get('csvDelimiter')).toBe(';')
      expect(JSON.parse(String((captured[1]!.data as FormData).get('codeOverrides')))).toEqual([
        { rowNumber: 2, code: 'DVT-QA' },
      ])
    }
  )
})
