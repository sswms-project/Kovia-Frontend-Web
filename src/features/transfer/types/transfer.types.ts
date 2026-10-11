export const TRANSFER_WORKFLOW_STATUSES = [
  'Draft',
  'InProgress',
  'AwaitingResolution',
  'Completed',
  'Cancelled',
] as const

export const TRANSFER_LEGACY_STATUSES = [
  'PendingSourceApproval',
  'Approved',
  'InTransit',
  'ReceivedWithVariance',
  'Rejected',
] as const

export type TransferWorkflowStatus = (typeof TRANSFER_WORKFLOW_STATUSES)[number]
export type TransferLegacyStatus = (typeof TRANSFER_LEGACY_STATUSES)[number]
export type TransferStatus = TransferWorkflowStatus | TransferLegacyStatus

export type TransferDispatchProgress = 'NotDispatched' | 'PartiallyDispatched' | 'Dispatched'
export type TransferReceiveProgress = 'NotReceived' | 'PartiallyReceived' | 'Received'

export type TransferShipmentStatus =
  | 'Picking'
  | 'ReadyToDispatch'
  | 'InTransit'
  | 'Receiving'
  | 'Received'
  | 'ReceivedWithDiscrepancy'
  | 'Cancelled'

export type TransferShipmentLineStatus =
  | 'Pending'
  | 'Picking'
  | 'Picked'
  | 'PendingManager'
  | 'Dispatched'

export type TransferDiscrepancyType = 'Damaged' | 'Missing'

export type TransferFeedbackStatus = 'Open' | 'Answered' | 'Closed'

export const TRANSFER_FEEDBACK_REASONS = [
  'InsufficientStock',
  'DamagedStock',
  'CannotMeetDeadline',
  'Other',
] as const
export type TransferFeedbackReason = (typeof TRANSFER_FEEDBACK_REASONS)[number]

export const TRANSFER_PICK_REASONS = [
  'InsufficientAtLocation',
  'NotFound',
  'Damaged',
  'LocationBlocked',
  'LotExhausted',
  'NonFefoLot',
  'Other',
] as const
export type TransferPickReason = (typeof TRANSFER_PICK_REASONS)[number]

export const TRANSFER_RECEIPT_REASONS = ['TransitDamage', 'Lost', 'WrongShipment', 'Other'] as const
export type TransferReceiptReason = (typeof TRANSFER_RECEIPT_REASONS)[number]

export const TRANSFER_ESCALATION_ACTIONS = ['UseStock', 'ReduceQuantity', 'StopLine'] as const
export type TransferEscalationAction = (typeof TRANSFER_ESCALATION_ACTIONS)[number]

export const TRANSFER_DISCREPANCY_ACTIONS = [
  'LateReceipt',
  'ConfirmLoss',
  'AcknowledgeDamage',
] as const
export type TransferDiscrepancyAction = (typeof TRANSFER_DISCREPANCY_ACTIONS)[number]

export const TRANSFER_STAGES = ['request', 'transfer', 'discrepancy'] as const
export type TransferStage = (typeof TRANSFER_STAGES)[number]

export interface TransferListQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  status?: TransferStatus
  sourceWarehouseId?: string
  destinationWarehouseId?: string
  dateFrom?: string
  dateTo?: string
  /** Tab: request = mọi yêu cầu đã tạo, transfer = đã có đợt rời kho, discrepancy = còn chênh lệch chưa xử lý. */
  stage?: TransferStage
}

export interface TransferSourceWarehouseQuery {
  destinationWarehouseId: string
  top: number
  skip: number
  needTotalCount: true
  searchText?: string
}

export interface TransferAvailabilityQuery {
  sourceWarehouseId: string
  destinationWarehouseId: string
  productIds: string[]
}

export interface TransferSourceProductsQuery {
  sourceWarehouseId: string
  destinationWarehouseId: string
  searchTerm?: string
  pageSize?: number
}

/** Sản phẩm còn tồn khả dụng ở kho xuất (theo ĐVT chính). */
export interface TransferSourceProduct {
  productId: string
  sku: string
  productName: string
  baseUnitName: string
  availableQuantity: number
}

export interface TransferSummary {
  id: string
  transferCode: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  status: TransferStatus
  isLegacyWorkflow: boolean
  reason: string | null
  requiredBy: string | null
  createdAt: string
  createdBy: string
  createdByName: string | null
  lineCount: number
  requestedQuantity: number
  dispatchedQuantity: number
  receivedQuantity: number
  dispatchProgress: TransferDispatchProgress
  receiveProgress: TransferReceiveProgress
  hasOpenFeedback: boolean
  hasPendingPickEscalation: boolean
  version: string | null
  hasOpenDiscrepancy: boolean
}

export interface TransferListResponse {
  items: TransferSummary[]
  totalCount: number
  pageNumber: number
  pageSize: number
  /** Số phiếu còn chênh lệch chưa xử lý (hiện trên tab chờ xử lý chênh lệch). */
  openDiscrepancyCount: number
}

export interface TransferRequesterOption {
  userId: string
  fullName: string
  roleName: string
}

export interface TransferItem {
  id: string
  productId: string
  productName: string
  sku: string
  sourceSlotId: string | null
  sourceSlotCode: string | null
  destinationSlotId: string | null
  destinationSlotCode: string | null
  quantity: number
  approvedQuantity: number
  dispatchedQuantity: number
  receivedQuantity: number
  damagedQuantity: number
  missingQuantity: number
  lotId: string | null
  lotNumber: string | null
  unitId: string | null
  unitName: string | null
  baseUnitId: string | null
  baseUnitName: string | null
  conversionFactor: number
  requestedQuantity: number
  batchedQuantity: number
  pickedQuantity: number
  resolvedMissingQuantity: number
  stoppedQuantity: number
  unbatchedQuantity: number
  /** Chỉ người kho xuất (hoặc chủ) nhận được; BE bỏ trống với người chỉ thuộc kho nhập. */
  allocations?: TransferAllocation[] | null
  /** "Khu K01 / Kệ A07 / S-01"; BE bỏ trống với người chỉ thuộc kho xuất. */
  destinationSlotPath?: string | null
  /** Vị trí lấy hàng ưu tiên do chủ/quản lý kho xuất chọn; BE bỏ trống với người chỉ thuộc kho nhập. */
  sourceSlotPath?: string | null
}

/** Hàng của một dòng phiếu đang được giữ chỗ ở đâu (vị trí lấy do hệ thống phân bổ). */
export interface TransferAllocation {
  inventoryStockId: string
  location: string
  lotNumber: string | null
  expiryDate: string | null
  quantity: number
}

/** Vị trí của kho xuất đang có tồn khả dụng của một sản phẩm. */
export interface TransferSourceLocation {
  slotId: string
  code: string
  path: string
  availableQuantity: number
  earliestExpiry: string | null
}

export interface TransferSourceLocationsQuery {
  sourceWarehouseId: string
  productId: string
}

export interface TransferPutAwaySlotSuggestion {
  slotId: string
  path: string
  reason: string
  /** Số lượng còn nhận được (đơn vị chính); null khi vị trí không giới hạn sức chứa. */
  available: number | null
  warnings: string[]
}

export interface TransferPutAwayItemSuggestions {
  itemId: string
  suggestions: TransferPutAwaySlotSuggestion[]
}

export interface TransferReceivableSlotOption {
  id: string
  code: string
  path: string
}

export interface TransferReceivableSlotsQuery {
  warehouseId: string
  search?: string
  top?: number
}

export interface TransferShipmentLine {
  id: string
  itemId: string
  productId: string
  sku: string
  productName: string
  plannedQuantity: number
  pickedQuantity: number
  dispatchedQuantity: number
  status: TransferShipmentLineStatus
  pendingReturnQuantity: number
  openExceptionCount: number
}

export interface TransferShipment {
  id: string
  shipmentNumber: number
  status: TransferShipmentStatus
  pickTaskId: string | null
  pickTaskCode: string | null
  pickTaskStatus: string | null
  pickAssigneeId: string | null
  receiveTaskId: string | null
  receiveTaskCode: string | null
  receiveTaskStatus: string | null
  receiveAssigneeId: string | null
  createdAt: string
  dispatchedAt: string | null
  receivedAt: string | null
  cancellationReason: string | null
  version: string | null
  lines: TransferShipmentLine[]
  pickTaskVersion: string | null
  receiveTaskVersion: string | null
  pickAssigneeName?: string | null
  receiveAssigneeName?: string | null
}

export interface TransferDiscrepancy {
  id: string
  itemId: string
  shipmentId: string
  sku: string
  productName: string
  type: TransferDiscrepancyType
  quantity: number
  resolvedQuantity: number
  reasonCode: string | null
  note: string | null
  isOpen: boolean
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface TransferFeedback {
  id: string
  itemId: string | null
  reasonCode: TransferFeedbackReason
  message: string
  status: TransferFeedbackStatus
  reply: string | null
  authorId: string
  authorName: string | null
  createdAt: string
  repliedAt: string | null
}

export interface TransferDetail {
  id: string
  transferCode: string
  requesterName: string | null
  requestingDepartment: string | null
  sourceWarehouseId: string
  sourceWarehouseName: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  status: TransferStatus
  createdAt: string
  createdBy: string
  approvedBy: string | null
  approvedAt: string | null
  approvalNote: string | null
  rejectionReason: string | null
  dispatchedBy: string | null
  dispatchedAt: string | null
  receivedBy: string | null
  receivedAt: string | null
  items: TransferItem[]
  isLegacyWorkflow: boolean
  createdByName: string | null
  reason: string | null
  requiredBy: string | null
  note: string | null
  submittedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  stoppedAt: string | null
  stopReason: string | null
  hasOpenFeedback: boolean
  version: string | null
  shipments: TransferShipment[] | null
  discrepancies: TransferDiscrepancy[] | null
  feedbacks: TransferFeedback[] | null
}

export interface TransferAvailabilityUnit {
  unitId: string
  unitName: string
  conversionFactor: number
  quantityPrecision: number
  availableQuantity: number
}

export interface TransferAvailability {
  productId: string
  sku: string
  productName: string
  baseUnitId: string
  baseUnitName: string
  availableQuantity: number
  units: TransferAvailabilityUnit[]
}

/** Một đơn vị chọn được trên dòng hàng; tồn chỉ có khi đã chọn kho xuất. */
export interface TransferLineUnitOption {
  unitId: string
  unitName: string
  /** Số đơn vị chính trong 1 đơn vị này (đơn vị chính luôn là 1). */
  conversionFactor: number
  quantityPrecision: number
  isBase: boolean
  availableQuantity?: number
}

export interface TransferLineUnits {
  productId: string
  baseUnitId: string
  baseUnitName: string
  units: TransferLineUnitOption[]
}

export interface TransferLineInput {
  itemId: string | null
  productId: string
  unitId: string | null
  quantity: number
  /** Vị trí cất hàng gợi ý ở kho nhập (tùy chọn). */
  destinationSlotId?: string | null
  /** Vị trí lấy hàng ưu tiên ở kho xuất (tùy chọn); chỉ chủ và quản lý kho xuất đặt được. */
  sourceSlotId?: string | null
}

export interface SaveTransferDraftRequest {
  expectedVersion: string | null
  transferCode: string | null
  requesterName: string | null
  requestingDepartment: string | null
  sourceWarehouseId: string
  destinationWarehouseId: string
  reason: string | null
  requiredBy: string | null
  note: string | null
  items: TransferLineInput[]
}

export interface UpdateTransferRequest {
  expectedVersion: string
  requesterName: string
  requestingDepartment: string
  sourceWarehouseId: string | null
  destinationWarehouseId: string | null
  reason: string | null
  requiredBy: string | null
  note: string | null
  items: TransferLineInput[]
}

export interface SubmitTransferRequest {
  expectedVersion: string | null
}

export interface CancelTransferRequest {
  reason: string
  expectedVersion: string | null
}

export interface AddTransferFeedbackRequest {
  itemId: string | null
  reasonCode: TransferFeedbackReason
  message: string
}

export interface ReplyTransferFeedbackRequest {
  reply: string
  close: boolean
}

export interface CreateTransferShipmentRequest {
  lines: Array<{ itemId: string; quantity: number | null }>
}

export interface CancelTransferShipmentRequest {
  reason: string
}

export interface RecordTransferPickRequest {
  /** Mã thao tác: gửi lại cùng mã thì BE không ghi lần hai. */
  commandId: string
  lineId: string
  inventoryStockId: string
  quantity: number | null
  scannedSlotCode: string
  scannedProductCode: string | null
}

export interface SwitchTransferPickRequest {
  /** Mã thao tác: gửi lại cùng mã thì BE không ghi lần hai. */
  commandId: string
  fromInventoryStockId: string
  toInventoryStockId: string
  quantity: number
  reasonCode: TransferPickReason
  note: string | null
}

export interface EscalateTransferPickRequest {
  /** Mã thao tác: gửi lại cùng mã thì BE không ghi lần hai. */
  commandId: string
  reasonCode: TransferPickReason
  note: string
}

export interface ResolveTransferEscalationRequest {
  action: TransferEscalationAction
  fromInventoryStockId: string | null
  toInventoryStockId: string | null
  quantity: number | null
  note: string | null
}

export interface ReturnTransferPickRequest {
  /** Mã thao tác: gửi lại cùng mã thì BE không ghi lần hai. */
  commandId: string
  pickDetailId: string
  quantity: number | null
  scannedSlotCode: string
}

export interface CompleteTransferPickingRequest {
  expectedVersion: string
}

/** Một vị trí/lô ở kho xuất mà dòng phiếu đang giữ chỗ hoặc có thể chuyển sang. */
export interface TransferAllocationOption {
  inventoryStockId: string
  location: string
  lotNumber: string | null
  expiryDate: string | null
  /** Tồn khả dụng cho người khác (chưa tính phần dòng này đang giữ). */
  availableQuantity: number
  /** Dòng này đang giữ chỗ bao nhiêu ở đây. */
  reservedForItem: number
  /** Phần giữ chỗ chưa bị lấy ra, chuyển đi được. */
  movableQuantity: number
}

export interface TransferAllocationMove {
  itemId: string
  fromInventoryStockId: string
  toInventoryStockId: string
  quantity: number
}

export interface AdjustTransferAllocationRequest {
  expectedVersion: string
  moves: TransferAllocationMove[]
  reason: string | null
  commandId: string
}

export interface SetTransferPutAwaySlotsRequest {
  expectedVersion: string
  slots: { itemId: string; destinationSlotId: string | null }[]
}

export interface ReopenTransferPickingRequest {
  expectedVersion: string
  reason: string
}

export interface DispatchTransferShipmentRequest {
  expectedVersion: string
}

export interface TransferReceiptEntryRequest {
  lineId: string
  lotId: string | null
  destinationSlotId: string | null
  goodQuantity: number
  damagedQuantity: number
  missingQuantity: number
  reasonCode: string | null
  note: string | null
  scannedSlotCode: string | null
  scannedProductCode: string | null
}

export interface ReceiveTransferShipmentRequest {
  expectedVersion: string
  entries: TransferReceiptEntryRequest[]
}

export interface ResolveTransferDiscrepancyRequest {
  action: TransferDiscrepancyAction
  quantity: number | null
  lotId: string | null
  destinationSlotId: string | null
  scannedSlotCode: string | null
  note: string | null
}

export interface TransferPickSuggestion {
  inventoryStockId: string
  slotId: string
  slotCode: string
  slotBarcode: string | null
  lotId: string | null
  lotNumber: string | null
  expiryDate: string | null
  suggestedQuantity: number
  reservedQuantity: number
  rackCode: string | null
  isSystemDefaultSlot: boolean
  rackId?: string | null
  zoneCode?: string | null
}

export interface TransferPickAlternative {
  inventoryStockId: string
  slotId: string
  slotCode: string
  slotBarcode: string | null
  lotId: string | null
  lotNumber: string | null
  expiryDate: string | null
  availableQuantity: number
  rackCode: string | null
  isSystemDefaultSlot: boolean
  rackId?: string | null
  zoneCode?: string | null
}

export interface TransferPickDetail {
  id: string
  inventoryStockId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  pickedQuantity: number
  returnedQuantity: number
  dispatchedQuantity: number
  pickedAt: string
  rackCode: string | null
  isSystemDefaultSlot: boolean
  rackId?: string | null
  zoneCode?: string | null
}

export interface TransferPickException {
  id: string
  type: string
  reasonCode: string
  note: string | null
  quantity: number
  status: 'Resolved' | 'PendingManager'
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
  /** Lô được chọn hết hạn muộn hơn lô khác còn hàng; lý do nhân viên chọn nằm ở reasonCode. */
  isNonFefo: boolean
}

export interface TransferPickSheetLine {
  lineId: string
  itemId: string
  productId: string
  sku: string
  productName: string
  productBarcode: string | null
  baseUnitName: string
  plannedQuantity: number
  pickedQuantity: number
  remainingQuantity: number
  pendingReturnQuantity: number
  status: TransferShipmentLineStatus
  suggestions: TransferPickSuggestion[]
  picks: TransferPickDetail[]
  exceptions: TransferPickException[]
}

export interface TransferPickSheet {
  shipmentId: string
  shipmentNumber: number
  transferId: string
  transferCode: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  shipmentStatus: TransferShipmentStatus
  version: string | null
  lines: TransferPickSheetLine[]
}

export interface TransferReceiveSheetLot {
  lotId: string | null
  lotNumber: string | null
  expiryDate: string | null
  dispatchedQuantity: number
  receivedQuantity: number
}

export interface TransferReceiveSheetLine {
  lineId: string
  itemId: string
  productId: string
  sku: string
  productName: string
  productBarcode: string | null
  baseUnitName: string
  suggestedSlotId: string | null
  suggestedSlotCode: string | null
  suggestedRackCode: string | null
  suggestedIsSystemDefaultSlot: boolean
  suggestedZoneCode?: string | null
  lots: TransferReceiveSheetLot[]
}

export interface TransferReceiveSheet {
  shipmentId: string
  shipmentNumber: number
  transferId: string
  transferCode: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  shipmentStatus: TransferShipmentStatus
  version: string | null
  lines: TransferReceiveSheetLine[]
}
