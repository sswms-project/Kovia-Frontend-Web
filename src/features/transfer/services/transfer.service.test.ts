import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { getTransferClientId } from '../utils/transfer-client'
import { transferService } from './transfer.service'

vi.mock('@/lib/axios', () => ({ axiosClient: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(axiosClient.post).mockResolvedValue({ data: { data: null } })
  vi.mocked(axiosClient.put).mockResolvedValue({ data: { data: null } })
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: [] } })
})

describe('Transfer request correlation', () => {
  it('attaches the same per-tab origin to writes, including repeated commands', async () => {
    const request = {
      commandId: 'command',
      lineId: 'line',
      inventoryStockId: 'stock',
      quantity: 1,
      scannedSlotCode: 'A01',
      scannedProductCode: 'SKU',
    }
    await transferService.recordPick('transfer', 'shipment', request)
    await transferService.recordPick('transfer', 'shipment', request)
    await transferService.setPutAwayPlan('transfer', { expectedVersion: 'v1', items: [] })
    expect(axiosClient.post).toHaveBeenNthCalledWith(1, expect.any(String), request, {
      headers: { 'X-Transfer-Client-Id': getTransferClientId() },
    })
    expect(axiosClient.post).toHaveBeenNthCalledWith(2, expect.any(String), request, {
      headers: { 'X-Transfer-Client-Id': getTransferClientId() },
    })
    expect(axiosClient.put).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
      headers: { 'X-Transfer-Client-Id': getTransferClientId() },
    })
  })

  it('does not classify slot lookups as writes and passes cancellation to rules reads', async () => {
    await transferService.findReceivableSlot('warehouse', 'A01')
    expect(axiosClient.get).toHaveBeenLastCalledWith(expect.any(String), {
      params: { warehouseId: 'warehouse', code: 'A01' },
    })
    const controller = new AbortController()
    await transferService.getPutAwayPlanSuggestions(
      'transfer',
      'shipment',
      false,
      controller.signal
    )
    expect(axiosClient.get).toHaveBeenLastCalledWith(expect.any(String), {
      params: { shipmentId: 'shipment', useAi: false },
      signal: controller.signal,
    })
  })
})
