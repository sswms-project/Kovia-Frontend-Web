export const STOCK_ISSUE_REQUEST_STATUSES = [
  'Pending',
  'ReleasedForPicking',
  'Picking',
  'Picked',
  'AuthorizedForDispatch',
  'Dispatched',
  'Cancelled',
] as const

export type StockIssueRequestStatus = (typeof STOCK_ISSUE_REQUEST_STATUSES)[number]

export const GOODS_RETURN_REQUEST_STATUSES = [
  'Requested',
  'Approved',
  'Rejected',
  'Restocked',
  'Draft',
  'Cancelled',
] as const

export type GoodsReturnRequestStatus = (typeof GOODS_RETURN_REQUEST_STATUSES)[number]

export const GOODS_RETURN_REQUEST_ITEM_CONDITIONS = ['Good', 'Damaged', 'Expired', 'Scrap'] as const

export type GoodsReturnRequestItemCondition = (typeof GOODS_RETURN_REQUEST_ITEM_CONDITIONS)[number]

export interface StockIssueRequestListQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  status?: StockIssueRequestStatus
  warehouseId?: string
  stockRecipientId?: string
  dateFrom?: string
  dateTo?: string
  assignedToMe?: boolean
}

/** Một vị trí và lô hệ thống đã giữ hàng cho dòng phiếu: nơi nhân viên phải đến lấy. */
export interface StockIssuePickLocation {
  isSystemDefaultSlot?: boolean
  directFromReceiving?: boolean
  allocationReason?: string | null
  inventoryStockId: string
  slotId: string
  slotCode: string
  zoneCode: string
  rackCode: string
  lotId: string | null
  lotNumber: string | null
  expiryDate: string | null
  /** Tính theo đơn vị cơ sở. */
  reservedQuantity: number
}

export interface StockIssueRequestItem {
  id: string
  productId: string
  productName: string
  sku: string
  /** Số lượng theo đơn vị cơ sở của sản phẩm (cũng là đơn vị của pickedQuantity). */
  quantity: number
  pickedQuantity: number
  returnedQuantity: number
  returnableQuantity: number
  note: string | null
  barcode: string | null
  /** Số lượng theo đơn vị đã chọn khi lập phiếu (thùng, kiện…). */
  enteredQuantity: number
  enteredUnitId: string
  enteredUnitName: string
  /** Số đơn vị cơ sở trong một đơn vị đã chọn; hàng được giữ và lấy theo nguyên đơn vị này. */
  conversionFactor: number
  pickLocations: StockIssuePickLocation[]
  pickDetails: StockIssuePickDetail[]
}

export interface StockIssueAttachment {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
}

export interface StockIssuePickDetail {
  zoneCode?: string | null
  rackCode?: string | null
  isSystemDefaultSlot?: boolean
  stagingZoneCode?: string | null
  stagingRackCode?: string | null
  isSystemDefaultStagingSlot?: boolean
  id: string
  inventoryStockId: string
  slotId: string
  slotCode: string
  stagingSlotId: string
  stagingSlotCode: string
  lotId: string | null
  lotNumber: string | null
  qualityStatus: string
  pickedQuantity: number
  returnedQuantity: number
  returnableQuantity: number
  pickedByUserId: string
  pickedByName: string
  pickedAt: string
  issuedAt: string | null
}

export interface StockIssueRequestSummary {
  canAdjustPickingSources?: boolean
  createdBy?: string | null
  id: string
  stockIssueRequestCode: string
  stockRecipientId: string
  stockRecipientName: string
  recipientCode: string
  warehouseId: string
  warehouseName: string
  purpose: string | null
  referenceCode: string | null
  issueDate: string | null
  issueTime?: string | null
  note: string | null
  recipientName: string
  recipientPhone: string
  recipientEmail: string | null
  recipientAddress: string
  status: StockIssueRequestStatus
  createdAt: string
  dispatchAuthorizedByUserId: string | null
  dispatchAuthorizedAt: string | null
  dispatchedAt: string | null
  assignedStaffId: string | null
  assignedStaffName: string | null
  version: string | null
  items: StockIssueRequestItem[]
  attachments: StockIssueAttachment[]
}

export interface ReleaseStockIssueRequestRequest {
  stockIssueRequestId: string
  commandId: string
  expectedVersion: string
  assignedStaffId?: string
  allocations?: StockIssueSourceAllocation[]
  allocationReason?: string
}

export interface StockIssueSourceAllocation {
  itemId: string
  inventoryStockId: string
  /** Base units; UI converts from the order's entered unit. */
  quantity: number
}

export interface StockIssueManualSourceDraft {
  orderId: string
  version: string
  allocations: StockIssueSourceAllocation[]
  allocationReason: string
  labels?: Record<string, string>
}

export interface AssignStockIssuePickerRequest {
  stockIssueRequestId: string
  staffId: string
  expectedVersion: string
}

export interface CancelStockIssueRequestRequest {
  stockIssueRequestId: string
  commandId: string
  expectedVersion: string
  reason: string
}

export interface StockIssueAuditLogQuery {
  pageNumber: number
  pageSize: number
}

export interface StockIssueRequestStatusCount {
  status: StockIssueRequestStatus
  count: number
}

export interface StockIssueRequestListResponse {
  items: StockIssueRequestSummary[]
  statusCounts: StockIssueRequestStatusCount[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface CreateStockIssueRequestItemRequest {
  productId: string
  /** Theo đơn vị unitId; bỏ trống unitId thì theo đơn vị cơ sở. */
  quantity: number
  unitId?: string | null
  note?: string | null
}

export interface StockIssueProductUnit {
  unitId: string
  unitName: string
  conversionFactor: number
  quantityPrecision: number
}

/** Sản phẩm còn tồn khả dụng tại kho xuất. */
export interface StockIssueProductOption {
  id: string
  sku: string
  productName: string
  barcode: string | null
  unitId: string
  unitName: string
  /** Theo đơn vị cơ sở. */
  availableQuantity: number
  firstExpiringLotNumber: string | null
  firstExpiringLotDate: string | null
  units: StockIssueProductUnit[]
}

export interface StockIssueProductOptionQuery {
  warehouseId: string
  searchTerm?: string
  pageSize?: number
}

export interface CreateStockIssueRequestRequest {
  stockIssueRequestCode?: string | null
  stockRecipientId: string
  warehouseId: string
  items: CreateStockIssueRequestItemRequest[]
  purpose?: string | null
  referenceCode?: string | null
  issueDate?: string | null
  issueTime?: string | null
  note?: string | null
}

export interface UpdateStockIssueRequestRequest extends Omit<
  CreateStockIssueRequestRequest,
  'stockIssueRequestCode'
> {
  stockIssueRequestId: string
  expectedVersion: string
}

export interface ImportStockIssueRequestGroup {
  stockRecipientId: string
  referenceCode: string | null
  purpose: string | null
  items: CreateStockIssueRequestItemRequest[]
}

/** Tạo mọi phiếu của tệp nhập trong một giao dịch: tất cả hoặc không phiếu nào. */
export interface ImportStockIssueRequestsRequest {
  warehouseId: string
  requests: ImportStockIssueRequestGroup[]
}

export interface StockIssueImportPreviewRow {
  rowNumber: number
  warehouseCode: string | null
  recipientCode: string | null
  referenceCode: string | null
  purpose: string | null
  sku: string | null
  quantity: number | null
  warehouseId: string | null
  warehouseName: string | null
  stockRecipientId: string | null
  recipientName: string | null
  productId: string | null
  productName: string | null
  errors: string[]
  unitId: string | null
  unitName: string | null
  availableQuantity: number | null
  warnings: string[] | null
}

export interface StockIssueImportPreview {
  rows: StockIssueImportPreviewRow[]
}

export interface RecordStockPickingItemRequest {
  destinationStagingSlotId?: string | null
  scannedStagingSlotCode?: string | null
  stockIssueRequestItemId: string
  inventoryStockId: string
  pickedQuantity: number
  scannedBarcode?: string | null
  scannedSlotCode?: string | null
}

export interface ReportStockIssuePickIssueRequest {
  stockIssueRequestId: string
  stockIssueRequestItemId?: string | null
  reason: string
}

export interface RecordStockPickingRequest {
  expectedVersion?: string
  commandId?: string
  items: RecordStockPickingItemRequest[]
}

export interface CreateGoodsReturnRequestItemRequest {
  stockIssuePickDetailId: string
  quantity: number
  condition: GoodsReturnRequestItemCondition
  restockSlotId: string | null
}

export interface CreateGoodsReturnRequestRequest {
  goodsReturnRequestCode?: string
  reason: string
  items: CreateGoodsReturnRequestItemRequest[]
}

/** Dòng hàng cần gợi ý vị trí nhập lại; số lượng theo đơn vị cơ sở. */
export interface GoodsReturnSuggestionLineRequest {
  stockIssuePickDetailId: string
  quantity: number
  condition: GoodsReturnRequestItemCondition
}

export interface GoodsReturnSlotSuggestion {
  slotId: string
  slotCode: string
  path: string
  suggestedQuantity: number
  /** Số lượng tối đa vị trí còn nhận được; null khi không giới hạn. */
  availableQuantity: number | null
  /** Vị trí hàng được lấy ra khi xuất kho. */
  isOriginalSlot: boolean
  reason: string
  warnings: string[]
}

export interface GoodsReturnLineSuggestion {
  stockIssuePickDetailId: string
  condition: GoodsReturnRequestItemCondition
  suggestions: GoodsReturnSlotSuggestion[]
  unallocatedQuantity: number
}

export interface GoodsReturnRequestItem {
  unitName?: string | null
  actualCondition?: GoodsReturnRequestItemCondition | null
  restockLocation?: string | null
  id: string
  stockIssuePickDetailId: string | null
  productId: string
  productName: string
  sku: string
  quantity: number
  condition: GoodsReturnRequestItemCondition
  restockSlotId: string | null
  lotId: string | null
  lotNumber: string | null
}

export interface GoodsReturnRequestSummary {
  version?: string | null
  allowedActions?: readonly string[] | null
  history?: readonly import('@/types/return-document').ReturnDocumentEvent[] | null
  warehouseName?: string | null
  recipientName?: string | null
  createdByName?: string | null
  approvedByName?: string | null
  id: string
  goodsReturnRequestCode: string
  stockIssueRequestId: string
  stockIssueRequestCode: string
  reason: string
  status: GoodsReturnRequestStatus
  createdAt: string
  createdBy: string
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  items: GoodsReturnRequestItem[]
}

export interface GoodsReturnRequestListQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  status?: GoodsReturnRequestStatus
  stockIssueRequestId?: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
}

export interface GoodsReturnRequestListResponse {
  items: GoodsReturnRequestSummary[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface RejectGoodsReturnRequestRequest {
  expectedVersion?: string | null
  reason: string
}

export interface RestockGoodsReturnRequestItem {
  condition: GoodsReturnRequestItemCondition
  returnItemId: string
  restockSlotId: string | null
}

export interface GoodsReturnRestockOptions {
  version: string
  items: {
    returnItemId: string
    options: GoodsReturnSlotSuggestion[]
    conditionOptions?: {
      condition: GoodsReturnRequestItemCondition
      options: GoodsReturnSlotSuggestion[]
    }[]
  }[]
}

export interface RestockGoodsReturnRequest {
  taskId?: string
  taskVersion?: string
  commandId?: string
  expectedVersion?: string | null
  items: RestockGoodsReturnRequestItem[]
}

export interface StockIssueRequestFilters {
  status: StockIssueRequestStatus | ''
  warehouseId: string
}

/** Quyền thao tác trên phiếu xuất, do trang suy ra từ quyền hiệu lực rồi truyền xuống component. */
export interface StockIssueCapabilities {
  readonly currentUserId?: string | null
  readonly canCreate: boolean
  readonly canAssignPicker: boolean
  readonly canPick: boolean
  readonly canAuthorizeDispatch: boolean
  readonly canDispatch: boolean
  readonly canCancel: boolean
}

export interface StockIssueRowActionHandlers {
  readonly onReleaseForPicking: (order: StockIssueRequestSummary) => void
  readonly onRecordStockPicking: (order: StockIssueRequestSummary) => void
  readonly onReportPickIssue: (order: StockIssueRequestSummary) => void
  readonly onAuthorizeDispatch: (order: StockIssueRequestSummary) => void
  readonly onConfirmDispatch: (order: StockIssueRequestSummary) => void
  readonly onCancel: (order: StockIssueRequestSummary) => void
}
