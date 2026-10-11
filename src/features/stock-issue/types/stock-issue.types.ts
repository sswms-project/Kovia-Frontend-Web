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

export interface StockIssueRequestItem {
  id: string
  productId: string
  productName: string
  sku: string
  quantity: number
  pickedQuantity: number
  returnedQuantity: number
  returnableQuantity: number
  note: string | null
  barcode: string | null
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

export interface StockIssueRequestListResponse {
  items: StockIssueRequestSummary[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface CreateStockIssueRequestItemRequest {
  productId: string
  quantity: number
  note?: string | null
}

export interface CreateStockIssueRequestRequest {
  stockRecipientId: string
  warehouseId: string
  items: CreateStockIssueRequestItemRequest[]
  purpose?: string | null
  referenceCode?: string | null
  issueDate?: string | null
  note?: string | null
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
}

export interface StockIssueImportPreview {
  rows: StockIssueImportPreviewRow[]
}

export interface RecordStockPickingItemRequest {
  stockIssueRequestItemId: string
  inventoryStockId: string
  pickedQuantity: number
  scannedBarcode?: string | null
  scannedSlotCode?: string | null
}

export interface ConfirmStockDispatchRequest {
  scannedBarcodes: string[]
}

export interface ReportStockIssuePickIssueRequest {
  stockIssueRequestId: string
  stockIssueRequestItemId?: string | null
  reason: string
}

export interface RecordStockPickingRequest {
  items: RecordStockPickingItemRequest[]
}

export interface CreateGoodsReturnRequestItemRequest {
  stockIssuePickDetailId: string
  quantity: number
  condition: GoodsReturnRequestItemCondition
  restockSlotId: string | null
}

export interface CreateGoodsReturnRequestRequest {
  reason: string
  items: CreateGoodsReturnRequestItemRequest[]
}

export interface GoodsReturnRequestItem {
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
  reason: string
}

export interface RestockGoodsReturnRequestItem {
  returnItemId: string
  condition: GoodsReturnRequestItemCondition
  restockSlotId: string | null
}

export interface RestockGoodsReturnRequest {
  items: RestockGoodsReturnRequestItem[]
}

export interface StockIssueRequestFilters {
  status: StockIssueRequestStatus | ''
  warehouseId: string
}
