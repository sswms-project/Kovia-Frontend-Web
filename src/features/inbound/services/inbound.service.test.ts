import { afterEach, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { inboundService } from './inbound.service'

afterEach(() => vi.restoreAllMocks())
it('creates through the version endpoint and preserves the saved id and version', async () => {
  const post = vi.spyOn(axiosClient, 'post').mockResolvedValueOnce({
    data: {
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: { id: 'receipt', version: 'AQI=' },
    },
  })
  const request = {
    inboundRequestId: 'request',
    receiptCode: 'PN000001',
    lines: [],
    commandId: 'command',
    expectedInboundVersion: 'AQ==',
  }
  const response = await inboundService.createReceipt(request)
  expect(post).toHaveBeenCalledWith('/goods-receipts/with-version', request)
  expect(response.data).toBe('receipt')
  expect(response.version).toBe('AQI=')
})
