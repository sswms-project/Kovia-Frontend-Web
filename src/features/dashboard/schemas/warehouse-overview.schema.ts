import { z } from 'zod'

// .NET Guid accepts historical IDs without RFC UUID version/variant bits.
export const reportingWarehouseSchema = z.object({ id: z.guid(), name: z.string() })
export const warehouseOverviewSchema = z.object({
  generatedAt: z.string(),
  activityDateFrom: z.string(),
  activityDateTo: z.string(),
  activity: z.array(
    z.object({ date: z.string(), completedReceipts: z.number(), dispatchedIssues: z.number() })
  ),
  warehouses: z.array(reportingWarehouseSchema),
  stockedSkuCount: z.number(),
  reservedSkuCount: z.number(),
  heldSkuCount: z.number(),
  lowStockCount: z.number(),
  pendingInboundRequests: z.number(),
  pendingGoodsReceipts: z.number(),
  pendingStockIssues: z.number(),
  pendingTransfers: z.number(),
  pendingCounts: z.number(),
  overdueTasks: z.number(),
  unassignedTasks: z.number(),
  activeSlots: z.number(),
  occupiedActiveSlots: z.number(),
  inactiveSlotsWithStock: z.number(),
  lowStockSignals: z.array(
    z.object({
      warehouseId: z.guid(),
      warehouseName: z.string(),
      productId: z.guid(),
      sku: z.string(),
      productName: z.string(),
      unit: z.string(),
      availableQuantity: z.number(),
      minimumQuantity: z.number(),
    })
  ),
})
export type WarehouseOverview = z.infer<typeof warehouseOverviewSchema>
export type ReportingWarehouse = z.infer<typeof reportingWarehouseSchema>
