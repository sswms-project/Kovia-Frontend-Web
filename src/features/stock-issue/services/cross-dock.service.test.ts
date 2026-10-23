import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { crossDockService } from './cross-dock.service'

vi.mock('@/lib/axios', () => ({ axiosClient: { get: vi.fn(), post: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

describe('batch picking preparation', () => {
  it('sends every source in one read-only request and validates the response', async () => {
    const id = '10000000-0000-4000-c000-000000000001'
    const stockId = '10000000-0000-4000-c000-000000000002'
    const destination = {
      stockIssueRequestId: id,
      warehouseId: id,
      version: 'AQ==',
      inventoryStockId: stockId,
      slotId: id,
      slotCode: 'CHO-XUAT',
      path: 'ZX / CHO-XUAT',
    }
    vi.mocked(axiosClient.post).mockResolvedValue({ data: { data: [destination] } })
    await expect(crossDockService.destinations(id, [stockId])).resolves.toEqual([destination])
    expect(axiosClient.post).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(`/${id}/picking-destinations`),
      { inventoryStockIds: [stockId] }
    )
    vi.mocked(axiosClient.post).mockResolvedValue({ data: { data: [{}] } })
    await expect(crossDockService.destinations(id, [stockId])).rejects.toThrow()
  })
})

describe('cross-dock source location display', () => {
  it.each([
    ['K01 / A04 / __SYSTEM_DEFAULT__', 'K01 / A04'],
    ['K01 / A04 / __system_default__ ', 'K01 / A04'],
    ['K01 / A04 / S01', 'K01 / A04 / S01'],
  ])(
    'normalizes display path %s without changing allocation identity',
    async (sourcePath, expected) => {
      const id = '10000000-0000-4000-c000-000000000001'
      const allocation = {
        itemId: id,
        productId: id,
        inventoryStockId: id,
        slotId: id,
        lotId: null,
        lotNumber: null,
        expiryDate: null,
        quantity: 20,
        directFromReceiving: false,
        reason: 'FIFO',
        sku: 'SKU00001',
        productName: 'Kềm A3',
        sourcePath,
      }
      vi.mocked(axiosClient.get).mockResolvedValue({
        data: {
          data: {
            stockIssueRequestId: id,
            documentVersion: 'v1',
            canAllocateWholeRequest: true,
            decision: 'Đủ hàng',
            automationEnabled: false,
            allocations: [allocation],
          },
        },
      })

      const plan = await crossDockService.plan(id)

      expect(plan.allocations[0]).toEqual({ ...allocation, sourcePath: expected })
      expect(plan.automationEnabled).toBe(false)
    }
  )
})

describe('cross-dock demand response', () => {
  it('treats a successful response without data as no registered demand', async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({
      data: { isSuccess: true, statusCode: 200 },
    })

    await expect(crossDockService.demand('request')).resolves.toBeNull()
  })

  it('accepts explicit null and forwards cancellation', async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: null } })
    const controller = new AbortController()

    await expect(crossDockService.demand('request', controller.signal)).resolves.toBeNull()
    expect(axiosClient.get).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('/request/cross-dock'),
      { signal: controller.signal }
    )
  })

  it('preserves a valid registered demand', async () => {
    const demand = {
      id: '10000000-0000-4000-c000-000000000001',
      stockIssueRequestId: '10000000-0000-4000-c000-000000000002',
      assignedStaffId: '10000000-0000-4000-c000-000000000003',
      authorizedBy: '10000000-0000-4000-c000-000000000004',
      authorizedAt: '2026-10-23T08:00:00Z',
      validUntil: '2026-10-23T16:00:00Z',
      completedAt: null,
      revokedAt: null,
      lastAttemptAt: null,
      decision: 'Waiting',
      version: 'v1',
    }
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: demand } })

    await expect(crossDockService.demand('request')).resolves.toEqual(demand)
  })

  it.each([{}, [], '', 0, false])('rejects malformed non-null data: %j', async (data) => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data } })

    await expect(crossDockService.demand('request')).rejects.toThrow()
  })

  it.each([401, 403, 500])('does not hide an HTTP %i failure', async (status) => {
    const error = Object.assign(new Error('Request failed'), { response: { status } })
    vi.mocked(axiosClient.get).mockRejectedValue(error)

    await expect(crossDockService.demand('request')).rejects.toBe(error)
  })
})
