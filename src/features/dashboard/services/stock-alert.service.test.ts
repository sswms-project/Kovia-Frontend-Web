import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stockAlertService } from './stock-alert.service'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/axios', () => ({ axiosClient: { get } }))
const page = {
  generatedAt: '2026-10-17T12:00:00Z',
  appliedWarehouseIds: [],
  totalCount: 0,
  pageNumber: 1,
  pageSize: 10,
  items: [],
}
beforeEach(() => get.mockReset())

describe('stock alert service', () => {
  it('sends warehouse IDs as an array and forwards cancellation without expiry fields for thresholds', async () => {
    get.mockResolvedValue({
      data: { data: { ...page, kind: 'above-maximum', configuredPolicyCount: 1 } },
    })
    const signal = new AbortController().signal
    await stockAlertService.getAlerts(
      {
        kind: 'above-maximum',
        warehouseId: 'warehouse-id',
        expiringDays: 9,
        pageNumber: 1,
        pageSize: 10,
        search: ' SKU ',
      },
      signal
    )
    expect(get).toHaveBeenCalledWith(
      '/dashboard/stock-alerts/thresholds',
      expect.objectContaining({
        signal,
        paramsSerializer: { indexes: null },
        params: expect.objectContaining({
          warehouseIds: ['warehouse-id'],
          expiringDays: undefined,
          search: 'SKU',
        }),
      })
    )
  })
  it('does not send the expiry window for expired stock', async () => {
    get.mockResolvedValue({
      data: {
        data: {
          ...page,
          kind: 'expired',
          evaluationDate: '2026-10-17',
          timeBasis: 'UTC',
          expiringDays: null,
        },
      },
    })
    await stockAlertService.getAlerts({
      kind: 'expired',
      pageNumber: 1,
      pageSize: 1,
      expiringDays: 99,
    })
    expect(get).toHaveBeenCalledWith(
      '/dashboard/stock-alerts/expiry',
      expect.objectContaining({
        params: expect.objectContaining({
          expiringDays: undefined,
          warehouseIds: undefined,
          pageSize: 1,
        }),
      })
    )
  })
  it('rejects malformed responses instead of presenting them as zero alerts', async () => {
    get.mockResolvedValue({ data: { data: {} } })
    await expect(
      stockAlertService.getAlerts({ kind: 'expiring', pageNumber: 1, pageSize: 10 })
    ).rejects.toThrow()
  })
})
