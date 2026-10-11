export interface WarehouseReportQuery {
  readonly warehouseIds?: readonly string[]
  readonly productId?: string
  readonly search?: string
  readonly status?: string
  readonly assigneeId?: string
  readonly taskType?: string
  readonly deadline?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly pageNumber: number
  readonly pageSize: number
}
