import type {
  LifecycleEvent,
  PagedResponse,
} from '@/features/inbound-request/types/inbound-request.types'
import type { InventoryEvidence } from '@/features/inventory/types/inventory.types'

export const GOODS_RECEIPT_STATUSES = [
  'Draft',
  'PendingApproval',
  'InspectionCorrectionRequired',
  'Approved',
  'Completed',
  'Cancelled',
] as const

export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number]
export type GoodsReceiptAction =
  | 'Update'
  | 'Submit'
  | 'Approve'
  | 'Reject'
  | 'PutAway'
  | 'AssignPutAway'
  | 'PlanPutAway'

export type WarehouseTaskExecutionStatus = 'Queued' | 'InProgress' | 'Paused' | 'Completed'
export type WarehouseTaskPriority = 'Normal' | 'Urgent'

export interface InboundListQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  status?: GoodsReceiptStatus
  warehouseId?: string
  creatorId?: string
  dateFrom?: string
  dateTo?: string
}

export interface ReceivingTaskQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  warehouseId?: string
  supplierId?: string
  expectedFrom?: string
  expectedTo?: string
  createdFrom?: string
  createdTo?: string
  unassigned?: boolean
}

export interface PutawayTaskQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  warehouseId?: string
  createdFrom?: string
  createdTo?: string
  unassigned?: boolean
}

export interface ReceivingTaskLine {
  baseUnitId?: string
  baseUnitName?: string
  enteredUnitId?: string
  enteredUnitName?: string
  conversionFactorSnapshot?: number
  baseUnitQuantityPrecision?: number
  enteredUnitQuantityPrecision?: number
  inboundRequestItemId: string
  productId: string
  productSKU: string
  productName: string
  barcodeValue: string | null
  isLotTracked: boolean
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
}

export interface ReceivingTask {
  warehouseCode?: string | null
  supplierCode?: string | null
  sourceName?: string | null
  inboundRequestId: string
  inboundRequestCode: string
  warehouseId: string
  warehouseName: string
  supplierId: string
  supplierName: string
  expectedDate: string | null
  createdAt?: string | null
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
  activeDocumentImportId: string | null
  activeGoodsReceiptId: string | null
  activeGoodsReceiptStatus: string | null
  assignedTo: string | null
  assignedToName: string | null
  assignedAt: string | null
  executionStatus: WarehouseTaskExecutionStatus
  priority: WarehouseTaskPriority
  dueAt: string | null
  lines: ReceivingTaskLine[]
}

export interface ReceivingTaskStats {
  totalOpenCount: number
  unassignedCount: number
  inProgressCount: number
  pausedCount: number
}

export interface GoodsReceiptSummary {
  id: string
  receiptCode: string
  inboundRequestId: string
  inboundRequestCode: string
  warehouseId: string
  warehouseName: string
  status: GoodsReceiptStatus
  createdBy: string
  createdByName: string
  createdAt: string
  lineCount: number
  receivedQuantity: number
  damagedQuantity: number
  putAwayQuantity: number
  putAwayAssignedTo: string | null
  putAwayAssignedToName: string | null
  putAwayAssignedAt: string | null
  putAwayExecutionStatus: WarehouseTaskExecutionStatus
  putAwayTaskPriority: WarehouseTaskPriority
  putAwayTaskDueAt: string | null
}

export interface GoodsReceiptItem {
  id: string
  inboundRequestItemId: string | null
  productId: string
  productSKU: string
  productName: string
  baseUnitId: string
  baseUnitName: string
  enteredUnitId: string | null
  enteredUnitName?: string | null
  conversionFactorSnapshot: number
  allowedUnits: PutAwayUnit[]
  lotId: string | null
  lotNumber: string | null
  manufacturedDate: string | null
  expiryDate: string | null
  orderedQuantity: number
  receivedQuantity: number
  damagedQuantity: number
  usableQuantity: number
  putAwayQuantity: number
  remainingPutAwayQuantity: number
  exceptionReason: string | null
  putAwayDetails: PutAwayDetail[]
  putAwayPlan: PutAwayPlanLine[]
}

/** Vị trí quản lý đã cấu hình; quantity là phần còn phải cất theo đơn vị gốc. */
export interface PutAwayPlanLine {
  id: string
  slotId: string
  slotCode: string
  rackCode: string
  isSystemDefaultSlot: boolean
  quantity: number
}

export interface PutAwayUnit {
  unitId: string
  unitName: string
  unitCode: string
  quantityPrecision: number
  conversionFactor: number
}

export interface PutAwayDetail {
  id: string
  inventoryStockId: string
  stockMovementId: string
  warehouseId: string
  slotId: string
  slotCode: string
  rackCode: string
  isSystemDefaultSlot: boolean
  lotId: string | null
  lotNumber: string | null
  qualityStatus: string
  performedByUserId: string
  performedByName: string
  quantity: number
  putAwayAt: string
  deviationId: string | null
  isOffPlan: boolean
  deviationReason: string | null
  deviationReasonCode: PutAwayDeviationReasonCode | null
  /** Lần cất đã lấn vào vị trí đang chừa cho hàng cùng sản phẩm khác sắp về. */
  usedHeldSlot: boolean
  /** Người cất đã quét hoặc nhập đúng mã vị trí để xác nhận. */
  isSlotCodeConfirmed: boolean
  deviationEvidence: InventoryEvidence[]
}

export type PutAwayDeviationReasonCode =
  | 'SlotFull'
  | 'SlotBlocked'
  | 'LabelMismatch'
  | 'Consolidation'
  | 'Other'

export interface PutAwayDeviationReport {
  from: string
  to: string
  totalLines: number
  deviatedLines: number
  heldSlotLines: number
  codeConfirmedLines: number
  byReason: { reasonCode: PutAwayDeviationReasonCode | null; label: string; count: number }[]
  byStaff: { userId: string; fullName: string; totalLines: number; deviatedLines: number }[]
  bySlot: { slotId: string; slotCode: string; count: number }[]
  recent: {
    goodsReceiptId: string
    receiptCode: string
    sku: string
    productName: string
    slotCode: string
    quantity: number
    performedByName: string
    putAwayAt: string
    reasonCode: PutAwayDeviationReasonCode | null
    reason: string
    usedHeldSlot: boolean
  }[]
}

export interface PutAwayDeviationReportQuery {
  from: string
  to: string
}

export interface GoodsReceiptDetail extends Omit<
  GoodsReceiptSummary,
  | 'lineCount'
  | 'receivedQuantity'
  | 'damagedQuantity'
  | 'putAwayQuantity'
  | 'putAwayExecutionStatus'
> {
  supplierCode?: string | null
  supplierName?: string | null
  sourceName?: string | null
  receivingAssignedTo: string | null
  receivingAssignedToName: string | null
  warehouseCode: string
  approvedBy: string | null
  approvedByName: string | null
  modifiedAt: string | null
  submittedAt: string | null
  approvedAt: string | null
  rejectionReason: string | null
  arrivalConfirmedBy: string | null
  arrivalConfirmedAt: string | null
  putAwayTaskExecutionStatus: 'Queued' | 'InProgress' | 'Paused' | 'Completed' | 'Cancelled'
  putAwayTaskCancelledAt: string | null
  putAwayTaskCancellationReason: string | null
  putAwayTaskRequiresReconciliation: boolean
  putAwayTaskReconciledAt: string | null
  putAwayTaskReconciliationNote: string | null
  putAwayPlanUpdatedAt: string | null
  version: string
  items: GoodsReceiptItem[]
  history: LifecycleEvent[]
}

export interface ReceiptLineRequest {
  enteredUnitId?: string
  inboundRequestItemId: string
  receivedQty: number
  damagedQty: number
  exceptionReason: string | null
  lotNumber: string | null
  manufacturedDate: string | null
  expiryDate: string | null
}

export interface SaveGoodsReceiptRequest {
  inboundRequestId: string
  receiptCode?: string
  lines: ReceiptLineRequest[]
}

export interface PutawayLineRequest {
  goodsReceiptItemId: string
  slotId: string
  enteredQuantity: number
  enteredUnitId: string
  /** Mã vị trí người cất đã quét hoặc nhập; Backend đối chiếu với mã/mã vạch của vị trí. */
  confirmedSlotCode?: string
}

export interface PutawayRequest {
  lines: PutawayLineRequest[]
  expectedVersion: string
  commandId: string
  overrideReason?: string | null
  overrideReasonCode?: PutAwayDeviationReasonCode
  evidenceIds?: string[]
}

export interface SavePutAwayPlanRequest {
  expectedVersion: string
  items: { goodsReceiptItemId: string; slots: { slotId: string; quantity: number }[] }[]
}

export interface PutAwaySlotSuggestion {
  slotId: string
  slotCode: string
  rackCode: string
  zoneName: string
  score: number
  reason: string
  source: 'Ai' | 'Rules'
  warnings: string[]
  /** Số lượng đề xuất cất vào vị trí (đơn vị gốc); 0 nếu chỉ là vị trí thay thế. */
  suggestedQuantity: number
  /** Số lượng tối đa vị trí còn nhận được; null khi không giới hạn. */
  availableQuantity: number | null
}

export interface PutAwayItemSuggestions {
  goodsReceiptItemId: string
  remainingQuantity: number
  suggestions: PutAwaySlotSuggestion[]
  /** Phần chưa tìm được vị trí đủ sức chứa (đơn vị gốc). */
  unallocatedQuantity: number
}

/** Vị trí đang được chừa cho hàng cùng sản phẩm sắp về. */
export interface PutAwayHeldSlot {
  slotId: string
  slotCode: string
  productId: string
  sku: string
  productName: string
  /** null khi cả vị trí dành riêng cho sản phẩm. */
  heldQuantity: number | null
  expectedDate: string
  inboundRequestCode: string
}

export interface PutAwaySuggestionsResponse {
  items: PutAwayItemSuggestions[]
  isAiAssisted: boolean
  aiNotice: string | null
  heldSlots: PutAwayHeldSlot[]
  /** Tóm tắt phương án: AI viết khi khả dụng, nếu không thì theo quy tắc kho. */
  summary: string | null
  risks: string[]
}

export interface ConfirmPhysicalArrivalRequest {
  expectedVersion: string
  commandId: string
  selfApprovalAcknowledged?: boolean
}

export interface CancelPutawayTaskRequest {
  reason: string
  expectedVersion: string
  commandId: string
  hasUnrecordedPhysicalMovement: boolean
}

export interface ReconcilePutawayCancellationRequest {
  note: string
  expectedVersion: string
}

export interface AssignableWarehouseStaff {
  id: string
  fullName: string
  email: string
  openReceivingTasks: number
  openPutAwayTasks: number
  hasTaskInProgress: boolean
}

export interface UnassignReceivingTaskRequest {
  expectedStaffId: string | null
  reason: string
}

export interface AssignWarehouseTaskRequest {
  staffId: string
  expectedStaffId: string | null
  reason: string | null
  priority: WarehouseTaskPriority
  dueAt: string | null
}

export interface InboundAllowedActionsResponse {
  allowedActions: GoodsReceiptAction[]
  selfApprovalRequired: boolean
  currentVersion: string | null
  denialReasonCode: string | null
}

export type GoodsReceiptListResponse = PagedResponse<GoodsReceiptSummary>
export type ReceivingTaskListResponse = PagedResponse<ReceivingTask> & {
  taskStats: ReceivingTaskStats
}

export const INBOUND_DOCUMENT_IMPORT_STATUSES = [
  'Pending',
  'Uploaded',
  'Scanning',
  'Processing',
  'NeedsReview',
  'ReadyForDraft',
  'DraftReceiptCreated',
  'Completed',
  'Failed',
  'Cancelled',
] as const

export type InboundDocumentImportStatus = (typeof INBOUND_DOCUMENT_IMPORT_STATUSES)[number]

export interface ExtractedField<T> {
  value: T | null
  rawValue: string | null
  confidence: number | null
  source:
    | 'AiExtracted'
    | 'DocumentParser'
    | 'InboundRequest'
    | 'SupplierMaster'
    | 'WarehouseMaster'
    | 'SystemGenerated'
    | 'UserEdited'
  verificationStatus:
    | 'Unverified'
    | 'Matched'
    | 'LowConfidence'
    | 'Mismatch'
    | 'UserConfirmed'
    | 'UserCorrected'
    | 'NotProvided'
}

export interface SupplierDocumentExtraction {
  schemaVersion: string
  documentNumber: ExtractedField<string> | null
  inboundRequestCode: ExtractedField<string> | null
  supplierName: ExtractedField<string> | null
  documentDate: ExtractedField<string> | null
  supplierDeliveryDate: ExtractedField<string> | null
  warehouseCode: ExtractedField<string> | null
  warehouseName: ExtractedField<string> | null
  items: SupplierDocumentLineExtraction[]
}

export interface SupplierDocumentLineExtraction {
  sourceLineNumber: number
  sku: ExtractedField<string> | null
  productName: ExtractedField<string> | null
  unitOfMeasure: ExtractedField<string> | null
  deliveredQuantity: ExtractedField<number> | null
  damagedQuantity: ExtractedField<number> | null
}

export interface InboundDocumentReviewLine {
  sourceLineNumber: number
  extractedSku: string | null
  extractedProductName: string | null
  extractedUnitOfMeasure: string | null
  documentQuantity: number | null
  inboundRequestItemId: string | null
  productId: string | null
  productSku: string | null
  productName: string | null
  unitName: string | null
  orderedQuantity: number
  previouslyReceivedQuantity: number
  remainingQuantity: number
  confirmedQuantity: number
  damagedQuantity: number
  exceptionReason: string | null
  isLotTracked: boolean
  lotNumber: string | null
  manufacturedDate: string | null
  expiryDate: string | null
  status: string
  isUserCorrected: boolean
}

export interface InboundDocumentReview {
  extraction: SupplierDocumentExtraction
  inboundRequestId: string | null
  inboundRequestVersion?: string | null
  inboundRequestCode: string | null
  supplierId: string | null
  supplierName: string | null
  warehouseId: string | null
  warehouseCode: string | null
  warehouseName: string | null
  warehouseAddress: string | null
  expectedReceiptDate: string | null
  hasWarehouseMismatch: boolean
  warehouseMismatchAcknowledged: boolean
  lines: InboundDocumentReviewLine[]
  warnings: string[]
  blockingErrors: string[]
  canCreateDraft: boolean
}

export interface InboundDocumentImport {
  id: string
  fileName: string
  contentType: string
  fileSize: number
  status: InboundDocumentImportStatus
  schemaVersion: string
  failureCode: string | null
  failureMessage: string | null
  extractionProvider: string | null
  extractionModel: string | null
  createdAt: string
  reviewedAt: string | null
  goodsReceiptId: string | null
  duplicateFileDetected: boolean
  review: InboundDocumentReview | null
}

export interface StartInboundDocumentImportRequest {
  file: File
  inboundRequestId?: string
  warehouseId?: string
}

export interface ReviewInboundDocumentLineRequest {
  sourceLineNumber: number
  inboundRequestItemId: string
  confirmedQuantity: number
  damagedQuantity: number
  exceptionReason: string | null
  lotNumber: string | null
  manufacturedDate: string | null
  expiryDate: string | null
}

export interface ReviewInboundDocumentImportRequest {
  id: string
  inboundRequestId: string
  acknowledgeWarehouseMismatch: boolean
  lines: ReviewInboundDocumentLineRequest[]
}
