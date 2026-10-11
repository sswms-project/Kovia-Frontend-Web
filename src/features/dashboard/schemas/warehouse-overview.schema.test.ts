import { describe, expect, it } from 'vitest'
import { reportingWarehouseSchema, warehouseOverviewSchema } from './warehouse-overview.schema'

describe('warehouse overview .NET Guid compatibility', () => {
  const historicalGuid = '11111111-1111-1111-1111-111111111111'
  it('accepts a canonical .NET Guid without RFC UUID variant bits', () => {
    expect(reportingWarehouseSchema.parse({ id: historicalGuid, name: 'Kho ngũ kim' }).id).toBe(
      historicalGuid
    )
  })
  it('still rejects malformed or missing warehouse identifiers', () => {
    expect(reportingWarehouseSchema.safeParse({ id: 'not-a-guid', name: 'Kho' }).success).toBe(
      false
    )
    expect(reportingWarehouseSchema.safeParse({ name: 'Kho' }).success).toBe(false)
  })
  it('accepts historical IDs in both warehouse options and low-stock signals', () => {
    expect(
      warehouseOverviewSchema.safeParse({
        generatedAt: '2026-10-08T08:00:00Z',
        activityDateFrom: '2026-10-01',
        activityDateTo: '2026-10-08',
        activity: [],
        warehouses: [{ id: historicalGuid, name: 'Kho' }],
        stockedSkuCount: 12,
        reservedSkuCount: 1,
        heldSkuCount: 0,
        lowStockCount: 1,
        pendingInboundRequests: 0,
        pendingGoodsReceipts: 0,
        pendingStockIssues: 0,
        pendingTransfers: 0,
        pendingCounts: 1,
        overdueTasks: 0,
        unassignedTasks: 0,
        activeSlots: 10,
        occupiedActiveSlots: 4,
        inactiveSlotsWithStock: 0,
        lowStockSignals: [
          {
            warehouseId: historicalGuid,
            warehouseName: 'Kho',
            productId: historicalGuid,
            sku: 'NG-01',
            productName: 'Ốc vít',
            unit: 'Cái',
            availableQuantity: 5,
            minimumQuantity: 10,
          },
        ],
      }).success
    ).toBe(true)
  })
})
