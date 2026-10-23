import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { crossDockService } from './cross-dock.service'

vi.mock('@/lib/axios', () => ({ axiosClient: { get: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

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
