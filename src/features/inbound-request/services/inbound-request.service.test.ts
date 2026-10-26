import type { AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import { inboundRequestService } from './inbound-request.service'

const originalAdapter = axiosClient.defaults.adapter
afterEach(() => {
  axiosClient.defaults.adapter = originalAdapter
})

describe('inbound product stock lookup transport', () => {
  it('serializes all 100 product IDs in one JSON body without a query string', async () => {
    const warehouseId = '00000000-0000-0000-0000-000000000001'
    const productIds = Array.from(
      { length: 100 },
      (_, index) => `00000000-0000-0000-0001-${String(index + 1).padStart(12, '0')}`
    )
    const response = { data: [{ productId: productIds[0], availableQuantity: 23 }] }
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      config,
      data: response,
      status: 200,
      statusText: 'OK',
      headers: {},
    }))
    axiosClient.defaults.adapter = adapter

    await expect(
      inboundRequestService.getProductAvailability(warehouseId, productIds)
    ).resolves.toEqual(response)

    expect(adapter).toHaveBeenCalledOnce()
    const config = adapter.mock.calls[0]![0]
    expect(config.method).toBe('post')
    expect(config.url).toBe(API_ENDPOINTS.inboundRequests.productAvailability)
    expect(config.params).toBeUndefined()
    expect(axiosClient.getUri(config)).not.toContain('?')
    expect(config.headers.getContentType()).toContain('application/json')
    expect(JSON.parse(config.data as string)).toEqual({ warehouseId, productIds })
  })

  it('propagates an API refusal rather than fabricating zero quantities', async () => {
    axiosClient.defaults.adapter = vi.fn<AxiosAdapter>().mockRejectedValue({
      isAxiosError: true,
      message: 'Forbidden',
      response: { status: 403, data: { statusCode: 403, message: 'Không có quyền xem tồn' } },
    })

    await expect(
      inboundRequestService.getProductAvailability('warehouse', ['product'])
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Không có quyền xem tồn',
    })
  })
})
