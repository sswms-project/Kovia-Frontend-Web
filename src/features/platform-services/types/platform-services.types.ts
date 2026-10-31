export const NOTIFICATION_TYPES = [
  'LowStock',
  'TaskAssigned',
  'InboundRequestUpdate',
  'TenantStatusUpdate',
  'SubscriptionPlanUpdate',
  'SubscriptionPaymentUpdate',
  'GoodsReceiptUpdate',
  'StockAdjustmentUpdate',
  'TransferUpdate',
  'StockIssueRequestUpdate',
  'GoodsReturnRequestUpdate',
  'CycleCountUpdate',
  'WarehouseUpdate',
  'StaffInvitationUpdate',
  'SessionRevoked',
  'InventoryUpdate',
  'OpeningStockUpdate',
  'DamageCaseUpdate',
  'StockDiscrepancyUpdate',
  'InboundArrivalUpcoming',
  'SupplierReturnUpdate',
  'DailyOperationsDigest',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationQuery {
  readonly search?: string
  readonly isRead?: boolean
  readonly type?: NotificationType
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly pageNumber: number
  readonly pageSize: number
}

export interface NotificationItem {
  readonly id: string
  readonly type: NotificationType
  readonly title: string
  readonly message: string
  readonly isRead: boolean
  readonly referenceType: string | null
  readonly referenceId: string | null
  readonly action?: string | null
  readonly createdAt: string
}

export interface NotificationListResponse {
  readonly items: NotificationItem[]
  readonly totalCount: number
  readonly pageNumber: number
  readonly pageSize: number
}

export interface AuditLogQuery {
  readonly search?: string
  readonly action?: string
  readonly entityType?: string
  readonly entityId?: string
  readonly userId?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly pageNumber: number
  readonly pageSize: number
}

export const AUDIT_LOG_TIME_RANGES = [
  'today',
  'this-week',
  'week-to-date',
  'this-month',
  'month-to-date',
  'this-quarter',
  'quarter-to-date',
  'this-year',
  'year-to-date',
  'custom',
] as const

export type AuditLogTimeRange = (typeof AUDIT_LOG_TIME_RANGES)[number]

export interface AuditLogItem {
  readonly id: string
  readonly tenantId: string | null
  readonly warehouseId: string | null
  readonly warehouseCode: string | null
  readonly warehouseName: string | null
  readonly userId: string
  readonly actorName: string
  readonly actorEmail: string
  readonly action: string
  readonly actionLabel: string
  readonly entityType: string
  readonly entityTypeLabel: string
  readonly entityId: string
  readonly referenceDisplay: string
  readonly summary: string
  readonly description: string
  readonly reason: string | null
  readonly oldValue: string | null
  readonly newValue: string | null
  readonly changes: AuditLogChange[]
  readonly createdAt: string
}

export interface AuditLogChange {
  readonly label: string
  readonly before: string | null
  readonly after: string | null
}

export interface AuditLogListResponse {
  readonly items: AuditLogItem[]
  readonly totalCount: number
  readonly pageNumber: number
  readonly pageSize: number
}

export interface NotificationCreatedEvent {
  readonly notificationId: string
  readonly type: NotificationType
  readonly createdAt: string
}
