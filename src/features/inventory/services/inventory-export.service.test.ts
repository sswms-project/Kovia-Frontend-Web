import { AxiosError, type AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { inventoryExportService } from './inventory-export.service'

const originalAdapter = axiosClient.defaults.adapter
const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
afterEach(() => {
  axiosClient.defaults.adapter = originalAdapter
})

describe('inventoryExportService', () => {
  it('posts only declared filters once and returns a named blob without downloading', async () => {
    let calls = 0
    const adapter: AxiosAdapter = async (config) => {
      calls++
      expect(config.url).toBe('/inventory/export')
      expect(config.method).toBe('post')
      expect(JSON.parse(String(config.data))).toEqual({ searchTerm: '00001' })
      return {
        data: new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
        status: 200,
        statusText: 'OK',
        config,
        headers: {
          'content-type': mime,
          'content-disposition': 'attachment; filename="kovia-20261019.xlsx"',
        },
      }
    }
    axiosClient.defaults.adapter = adapter
    const result = await inventoryExportService.exportExcel(
      { searchTerm: '00001' },
      new AbortController().signal
    )
    expect(calls).toBe(1)
    expect(result.fileName).toBe('kovia-20261019.xlsx')
    expect(result.blob.type).toBe(mime)
    expect(result.blob.size).toBe(4)
  })

  it('decodes JSON errors through the shared interceptor rather than downloading them', async () => {
    axiosClient.defaults.adapter = async (config) => {
      // TextEncoder comes from Node in jsdom; copy into the browser realm, as XHR would.
      const encoded = new TextEncoder().encode(
        JSON.stringify({ statusCode: 400, message: 'Danh sách vượt 10.000 dòng.' })
      )
      const data = new ArrayBuffer(encoded.length)
      new Uint8Array(data).set(encoded)
      const response = {
        data,
        status: 400,
        statusText: 'Bad Request',
        config,
        headers: { 'content-type': 'application/json' },
      }
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
    }
    await expect(
      inventoryExportService.exportExcel({}, new AbortController().signal)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Danh sách vượt 10.000 dòng.',
    })
  })

  it.each(['application/json', 'text/html', mime])(
    'rejects non-XLSX data even with a 200 response (%s)',
    async (contentType) => {
      axiosClient.defaults.adapter = async (config) => ({
        data: new TextEncoder().encode('{}').buffer,
        status: 200,
        statusText: 'OK',
        config,
        headers: { 'content-type': contentType },
      })
      await expect(
        inventoryExportService.exportExcel({}, new AbortController().signal)
      ).rejects.toThrow('tệp Excel hợp lệ')
    }
  )
})
