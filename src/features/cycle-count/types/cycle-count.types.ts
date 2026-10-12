export const CYCLE_COUNT_STATUSES = {
  scheduled: 'Scheduled',
  counting: 'Counting',
  submitted: 'Submitted',
  recount: 'Recount',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const

export type CycleCountStatus = (typeof CYCLE_COUNT_STATUSES)[keyof typeof CYCLE_COUNT_STATUSES]

export const STOCK_ADJUSTMENT_STATUSES = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} as const

export type StockAdjustmentStatus =
  (typeof STOCK_ADJUSTMENT_STATUSES)[keyof typeof STOCK_ADJUSTMENT_STATUSES]

// Tab lọc ảo trên danh sách: phiếu đã hoàn tất còn dòng lệch chưa tạo điều chỉnh tồn.
export const CYCLE_COUNT_NEEDS_ADJUSTMENT_FILTER = 'NeedsAdjustment'

export interface CycleCountListQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  status?: CycleCountStatus
  needsAdjustment?: boolean
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  searchTerm?: string
}

export interface CycleCountSummary {
  id: string
  warehouseId: string
  warehouseName: string
  zoneId: string | null
  status: CycleCountStatus
  scheduledDate: string
  priority: 'Normal' | 'Urgent'
  dueAt: string | null
  isBlindCount: boolean
  assignedTo: string | null
  assignedToName: string
  itemCount: number
  countedItemCount: number
  createdAt: string
  code: string
  purpose: string | null
  dueDate: string | null
  zoneName: string | null
  varianceItemCount: number | null
  adjustedItemCount: number
  approvedAdjustmentItemCount: number
}

export interface CycleCountListResponse {
  items: CycleCountSummary[]
  totalCount: number
  pageNumber: number
  pageSize: number
  statusCounts: Record<string, number>
  needsAdjustmentCount: number
}

export interface CycleCountItemHistory {
  id: string
  recountRound: number
  countedQuantity: number
  countedBy: string
  countedAt: string
  recountRequestedBy: string
  recountRequestedAt: string
  recountReason: string
  countedByName: string | null
  recountRequestedByName: string | null
  systemQuantity: number | null
  countMethod: CycleCountMethod
}

export type CycleCountMethod = 'Manual' | 'Scanned'

export interface CycleCountItem {
  id: string
  productId: string
  productName: string
  productSku: string
  slotId: string
  slotCode: string
  systemQuantity: number | null
  countedQuantity: number | null
  difference: number | null
  countedBy: string | null
  countedAt: string | null
  requestedRecountRound: number | null
  activeAdjustmentId: string | null
  activeAdjustmentStatus: StockAdjustmentStatus | null
  countHistory: CycleCountItemHistory[]
  lotId: string | null
  lotNumber: string | null
  qualityStatus: 'Good' | 'Damaged' | 'Quarantine'
  unitName: string | null
  rackCode: string | null
  isSystemDefaultSlot: boolean
  expiryDate: string | null
  countedByName: string | null
  note: string | null
  countedDamagedQuantity: number | null
  countMethod: CycleCountMethod
  scannedBarcode: string | null
  productBarcode: string | null
  slotBarcode: string | null
}

export interface CycleCountDetail {
  id: string
  warehouseId: string
  warehouseName: string
  zoneId: string | null
  zoneName: string | null
  status: CycleCountStatus
  scheduledDate: string
  priority: 'Normal' | 'Urgent'
  dueAt: string | null
  isBlindCount: boolean
  recountRound: number
  assignedTo: string | null
  assignedToName: string
  submittedBy: string | null
  submittedAt: string | null
  completedAt: string | null
  createdAt: string
  items: CycleCountItem[]
  code: string
  purpose: string | null
  dueDate: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdByName: string | null
  submittedByName: string | null
  finalizedByName: string | null
  finalizedAt: string | null
  cancelledByName: string | null
}

export interface AllowedActionsResponse {
  allowedActions: string[]
  selfApprovalRequired?: boolean
  denialReasonCode?: string | null
}

export interface CreateCycleCountRequest {
  warehouseId: string
  zoneId: string | null
  scheduledDate: string
  assignedTo: string
  priority: 'Normal' | 'Urgent'
  dueAt: string | null
  items: Array<{
    productId: string
    slotId: string
    lotId: string | null
    qualityStatus: 'Good' | 'Damaged' | 'Quarantine'
  }>
  isBlindCount: boolean
  purpose: string | null
  dueDate: string | null
}

export interface RequestRecountRequest {
  itemIds: string[]
  reason: string
}

export interface CancelCycleCountRequest {
  reason: string
}

export interface CreateStockAdjustmentRequest {
  cycleCountItemId: string
  reason: string
}

export interface RejectStockAdjustmentRequest {
  reason: string
}

export interface ApproveStockAdjustmentRequest {
  selfApprovalAcknowledged: boolean
}

export interface StockAdjustmentListQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  status?: StockAdjustmentStatus
  productId?: string
  createdBy?: string
  dateFrom?: string
  dateTo?: string
}

export interface StockAdjustment {
  id: string
  cycleCountItemId: string | null
  cycleCountId: string | null
  productId: string
  productName: string
  productSku: string
  warehouseId: string
  warehouseName: string
  slotId: string
  slotCode: string
  quantityChange: number
  systemQuantity: number | null
  countedQuantity: number | null
  reason: string
  status: StockAdjustmentStatus
  createdAt: string
  createdBy: string
  createdByName: string
  approvedBy: string | null
  approvedByName: string | null
  approvedAt: string | null
  rejectedBy: string | null
  rejectedByName: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  lotId: string | null
  lotNumber: string | null
  qualityStatus: 'Good' | 'Damaged' | 'Quarantine'
  unitName: string | null
  cycleCountCode: string | null
  isSystemDefaultSlot: boolean
  rackCode: string | null
  voucherId: string | null
  voucherCode: string | null
}

export interface StockAdjustmentVoucher {
  id: string
  code: string
  cycleCountId: string
  cycleCountCode: string
  warehouseId: string
  warehouseName: string
  reason: string
  status: StockAdjustmentStatus
  createdAt: string
  createdBy: string
  createdByName: string
  approvedBy: string | null
  approvedByName: string | null
  approvedAt: string | null
  rejectedBy: string | null
  rejectedByName: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  lineCount: number
  totalIncrease: number
  totalDecrease: number
  lines: StockAdjustment[]
}

export interface CreateStockAdjustmentVoucherRequest {
  cycleCountId: string
  cycleCountItemIds: string[]
  reason: string
}

export interface ApproveStockAdjustmentVoucherRequest {
  selfApprovalAcknowledged: boolean
  excludedLineIds: string[]
}

export interface StockAdjustmentVoucherListQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  status?: StockAdjustmentStatus
  cycleCountId?: string
}

export interface StockAdjustmentVoucherListResponse {
  items: StockAdjustmentVoucher[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface StockAdjustmentListResponse {
  items: StockAdjustment[]
  totalCount: number
  pageNumber: number
  pageSize: number
}
