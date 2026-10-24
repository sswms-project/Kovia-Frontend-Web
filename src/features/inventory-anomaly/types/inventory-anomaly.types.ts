export type AnomalySeverity = 'High' | 'Medium'
export type AnomalyReviewStatus = 'Open' | 'Confirmed' | 'Dismissed'
export type AnomalyReviewDecision = Exclude<AnomalyReviewStatus, 'Open'>
export type AnomalyScanStatus = 'Running' | 'Completed' | 'InsufficientData' | 'Failed'
export type AnomalyScanTrigger = 'Scheduled' | 'Manual'

/** Một lý do do mô hình trả về: mã kèm số liệu; giao diện dịch sang câu (utils/anomaly-reasons). */
export interface InventoryAnomalyReason {
  code: string
  value: number
  baseline: number | null
}

export interface InventoryAnomaly {
  id: string
  warehouseId: string
  warehouseName: string
  productId: string
  sku: string
  productName: string
  unitName: string | null
  stockMovementId: string
  movementType: string
  quantityChange: number
  balanceAfter: number
  occurredAt: string
  performedByUserId: string
  performedByName: string | null
  referenceType: string
  referenceId: string
  score: number
  percentile: number
  severity: AnomalySeverity
  reasons: InventoryAnomalyReason[]
  reviewStatus: AnomalyReviewStatus
  reviewNote: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface InventoryAnomalyListResponse {
  items: InventoryAnomaly[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface InventoryAnomalyListQuery {
  warehouseId?: string
  severity?: AnomalySeverity
  reviewStatus?: AnomalyReviewStatus
  productId?: string
  dateFrom?: string
  dateTo?: string
  pageNumber: number
  pageSize: number
}

export interface InventoryAnomalyScan {
  id: string
  warehouseId: string
  trigger: AnomalyScanTrigger
  status: AnomalyScanStatus
  failureReason: string | null
  scoreFrom: string
  scoreTo: string
  movementsScored: number
  anomaliesFound: number
  requestedByName: string | null
  createdAt: string
  completedAt: string | null
}

export interface InventoryAnomalySummary {
  openHigh: number
  openMedium: number
  reviewed30Days: number
  confirmed30Days: number
  /** Tỷ lệ cảnh báo được xác nhận trên số đã xem xét trong 30 ngày (0..1); null khi chưa xem xét cảnh báo nào. */
  precision30Days: number | null
  latestScan: InventoryAnomalyScan | null
}

export interface ReviewInventoryAnomalyRequest {
  decision: AnomalyReviewDecision
  note: string | null
}
