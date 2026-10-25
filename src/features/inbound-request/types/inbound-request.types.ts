import type { OrderType } from '@/types/api'
export const INBOUND_REQUEST_STATUS = {
  Draft: 'Draft',
  PendingApproval: 'PendingApproval',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Sent: 'Sent',
  Confirmed: 'Confirmed',
  PartiallyReceived: 'PartiallyReceived',
  Received: 'Received',
  Cancelled: 'Cancelled',
  Closed: 'Closed',
} as const

export const INBOUND_REQUEST_STATUSES = Object.values(INBOUND_REQUEST_STATUS)

export type InboundRequestStatus = (typeof INBOUND_REQUEST_STATUSES)[number]
export const INBOUND_REQUEST_ACTION = {
  AssignReceivingTask: 'AssignReceivingTask',
  Update: 'Update',
  UpdateCode: 'UpdateCode',
  Submit: 'Submit',
  Approve: 'Approve',
  ApproveAndSend: 'ApproveAndSend',
  SendToSupplier: 'SendToSupplier',
  AcceptSupplierProposedDate: 'AcceptSupplierProposedDate',
  Reject: 'Reject',
  Cancel: 'Cancel',
  CloseRemaining: 'CloseRemaining',
} as const
export type InboundRequestAction =
  (typeof INBOUND_REQUEST_ACTION)[keyof typeof INBOUND_REQUEST_ACTION]
export const INBOUND_SOURCE_TYPE = {
  Supplier: 'Supplier',
  InternalBranch: 'InternalBranch',
  InternalDepartment: 'InternalDepartment',
  ExternalPartner: 'ExternalPartner',
  Other: 'Other',
} as const
export type InboundSourceType = (typeof INBOUND_SOURCE_TYPE)[keyof typeof INBOUND_SOURCE_TYPE]
export const RECORD_STATUS = { Active: 'Active', Inactive: 'Inactive' } as const

export interface LookupQuery {
  pageNumber: number
  pageSize: number
  searchTerm?: string
  status?: (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS]
}

export interface InboundRequestListQuery {
  sortDirection?: OrderType
  pageNumber: number
  pageSize: number
  searchTerm?: string
  status?: InboundRequestStatus
  supplierId?: string
  warehouseId?: string
  creatorId?: string
  dateFrom?: string
  dateTo?: string
}

export interface InboundRequestSummary {
  id: string
  inboundRequestCode: string
  warehouseId: string | null
  warehouseCode: string | null
  warehouseName: string | null
  supplierId: string | null
  supplierName: string | null
  sourceType: InboundSourceType
  sourceName: string | null
  sourceReference: string | null
  status: InboundRequestStatus
  createdBy: string
  createdByName: string
  expectedDate: string | null
  createdAt: string
  lineCount: number
  orderedQuantity: number
  receivedQuantity: number
  supplierEmailSentAt?: string | null
  supplierResponse?: SupplierResponseDecision | null
}

export interface LifecycleEvent {
  action: string
  fromState: string | null
  toState: string | null
  actorId: string
  actorName: string
  reason: string | null
  createdAt: string
}

export interface InboundRequestLine {
  baseUnitId?: string
  id: string
  productId: string
  productSKU: string
  productName: string
  unitName: string | null
  enteredUnitId: string
  enteredUnitName: string | null
  unitQuantityPrecision: number
  enteredUnitQuantityPrecision: number
  enteredQuantity: number
  conversionFactorSnapshot: number
  quantity: number
  receivedQuantity: number
  closedQuantity: number
  remainingQuantity: number
}

export interface InboundRequestDetail extends Omit<
  InboundRequestSummary,
  'lineCount' | 'orderedQuantity' | 'receivedQuantity'
> {
  approvedBy: string | null
  approvedByName: string | null
  submittedBy: string | null
  modifiedAt: string | null
  submittedAt: string | null
  approvedAt: string | null
  rejectionReason: string | null
  receivingAssignedTo?: string | null
  receivingAssignedToName?: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  closedBy: string | null
  closedAt: string | null
  closureReason: string | null
  supplierEmail: string | null
  supplierEmailSentAt: string | null
  supplierEmailSentTo: string | null
  supplierEmailSentByName: string | null
  supplierResponse?: SupplierResponseDecision | null
  supplierRespondedAt?: string | null
  supplierResponseNote?: string | null
  supplierProposedDate?: string | null
  supplierProposalAcceptedAt?: string | null
  version: string
  lines: InboundRequestLine[]
  history: LifecycleEvent[]
}

export const SUPPLIER_RESPONSE_DECISION = {
  Confirmed: 'Confirmed',
  Rejected: 'Rejected',
  ProposedNewDate: 'ProposedNewDate',
} as const
export type SupplierResponseDecision =
  (typeof SUPPLIER_RESPONSE_DECISION)[keyof typeof SUPPLIER_RESPONSE_DECISION]

/** State of the link a supplier opened from the order email. */
export type SupplierResponseLinkStatus = 'Open' | 'Responded' | 'Expired' | 'Revoked' | 'Closed'

export interface SupplierInboundResponseLine {
  sku: string
  productName: string
  unit: string
  quantity: number
}

export interface SupplierInboundResponsePreview {
  linkStatus: SupplierResponseLinkStatus
  expiresAt: string
  tenantName: string
  inboundRequestCode: string
  supplierName: string
  warehouseName: string | null
  warehouseAddress: string | null
  expectedDate: string | null
  sourceReference: string | null
  response: SupplierResponseDecision | null
  respondedAt: string | null
  responseNote: string | null
  proposedDate: string | null
  lines: SupplierInboundResponseLine[]
}

export interface SupplierInboundResponseRequest {
  decision: SupplierResponseDecision
  note: string | null
  proposedDate: string | null
}

export interface SupplierEmailDispatch {
  sent: boolean
  sentTo: string | null
  error: string | null
}

export interface PagedResponse<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface InboundRequestStatusCount {
  status: InboundRequestStatus
  count: number
}

export interface InboundRequestListResponse extends PagedResponse<InboundRequestSummary> {
  canEditRequests?: boolean
  canEditApprovedRequests?: boolean
  canDeleteApprovedRequests?: boolean
  statusCounts: InboundRequestStatusCount[]
}

export interface AllowedActionsResponse {
  allowedActions: InboundRequestAction[]
  selfApprovalRequired: boolean
  currentVersion: string | null
  denialReasonCode: string | null
}

export interface InboundDecisionRequest {
  expectedVersion: string
  selfApprovalAcknowledged: boolean
}

export interface InboundReconciliationRequest {
  reason: string
  expectedVersion: string
  commandId: string
}

export interface InboundRequestLineRequest {
  productId: string
  quantity: number
  unitId: string | null
}

export interface SaveInboundRequestRequest {
  inboundRequestCode: string
  expectedVersion?: string
  warehouseId: string
  supplierId: string | null
  sourceType: InboundSourceType
  sourceName: string | null
  sourceReference: string | null
  expectedDate: string | null
  lines: InboundRequestLineRequest[]
}

export interface CreateInboundRequestRequest extends SaveInboundRequestRequest {
  receivingAssignedTo?: string | null
}

export interface ProductOption {
  id: string
  sku: string
  productName: string
  unitId: string
  unitName: string
  status: string
}

export interface SupplierOption {
  id: string
  supplierName: string
  phone: string
  email: string | null
  status: string
}

export interface LookupListResponse<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface LookupOption {
  value: string
  label: string
  /** Dòng phụ nhỏ dưới nhãn trong danh sách thả xuống (ví dụ lý do gợi ý). */
  description?: string
}

export interface ProductSearchState {
  readonly scope: string
  readonly value: string
}
