import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { warehouseOverviewService } from './warehouse-overview.service'
vi.mock('@/lib/axios', () => ({ axiosClient: { get: vi.fn() } }))
const range = { dateFrom: '2024-01-01', dateTo: '2024-12-31' }
const payload = {
  generatedAt: '2026-10-18T10:00:00Z',
  activityDateFrom: range.dateFrom,
  activityDateTo: range.dateTo,
  activityGranularity: 'month',
  activity: [],
  warehouses: [],
  lowStockSignals: [],
  stockedSkuCount: 0,
  reservedSkuCount: 0,
  heldSkuCount: 0,
  lowStockCount: 0,
  pendingInboundRequests: 0,
  pendingGoodsReceipts: 0,
  pendingStockIssues: 0,
  pendingTransfers: 0,
  pendingCounts: 0,
  overdueTasks: 0,
  unassignedTasks: 0,
  activeSlots: 0,
  occupiedActiveSlots: 0,
  inactiveSlotsWithStock: 0,
}
afterEach(() => vi.clearAllMocks())
describe('warehouse overview period contract', () => {
  it('sends exact date boundaries and scoped warehouse IDs without legacy activityDays', async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: payload } })
    const result = await warehouseOverviewService.getOverview('warehouse-1', range)
    expect(axiosClient.get).toHaveBeenCalledWith(expect.any(String), {
      params: { warehouseIds: ['warehouse-1'], ...range },
      paramsSerializer: { indexes: null },
    })
    expect(result.activityGranularity).toBe('month')
  })
  it('refuses a legacy backend response for a different period instead of presenting incorrect totals', async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({
      data: { data: { ...payload, activityDateFrom: '2026-09-19', activityDateTo: '2026-10-18' } },
    })
    await expect(warehouseOverviewService.getOverview(undefined, range)).rejects.toThrow(
      'API chưa trả đúng kỳ'
    )
  })
})
