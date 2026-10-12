import { queryKeys } from '@/lib/query-keys'
import { APP_ROUTES } from '@/routes/app-routes'
import type { NotificationItem, NotificationType } from '../types/platform-services.types'

const TZ = 'Asia/Ho_Chi_Minh'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
const vnTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
})

export function getNotificationDateGroup(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Cũ hơn'
  const now = new Date()
  const dateStr = vnDateFormatter.format(date)
  const today = vnDateFormatter.format(now)
  const yesterday = vnDateFormatter.format(new Date(now.getTime() - 86_400_000))
  const weekAgo = vnDateFormatter.format(new Date(now.getTime() - 6 * 86_400_000))
  if (dateStr === today) return 'Hôm nay'
  if (dateStr === yesterday) return 'Hôm qua'
  if (dateStr >= weekAgo) return 'Tuần này'
  return 'Cũ hơn'
}

export function formatNotificationTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : vnTimeFormatter.format(date)
}

export function formatPlatformDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Không xác định' : dateTimeFormatter.format(date)
}

export function getNotificationReferenceRoute(
  notification: Pick<NotificationItem, 'type' | 'referenceType' | 'referenceId'> & {
    readonly action?: string | null
  }
): string | null {
  const { action, referenceType, referenceId } = notification

  const actionRoute = action ? notificationActionRoutes[action] : undefined
  if (actionRoute) {
    if (actionRoute.requiresId && !referenceId) return null
    return actionRoute.to(referenceId ?? '')
  }

  if (!referenceType || !referenceId) return null
  const route = notificationReferenceRoutes[referenceType]
  return route ? route(referenceId) : null
}

export function formatAuditValue(value: string | null): string {
  if (!value) return 'Không có dữ liệu'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

// Thông báo loại nào thì dữ liệu màn hình nào đã đổi: invalidate prefix để trang đang mở tự tải lại.
const notificationTypeQueryRoots: Partial<
  Record<NotificationType, readonly (readonly string[])[]>
> = {
  CycleCountUpdate: [queryKeys.cycleCounts.all],
  StockAdjustmentUpdate: [
    queryKeys.stockAdjustments.all,
    queryKeys.cycleCounts.all,
    queryKeys.inventory.all,
  ],
  InboundRequestUpdate: [queryKeys.inboundRequests.all],
  InboundArrivalUpcoming: [queryKeys.inboundRequests.all],
  GoodsReceiptUpdate: [queryKeys.goodsReceipts.all, queryKeys.inboundRequests.all],
  TransferUpdate: [queryKeys.transfers.all],
  StockIssueRequestUpdate: [queryKeys.stockIssueRequests.all],
  GoodsReturnRequestUpdate: [queryKeys.goodsReturnRequests.all],
  InventoryUpdate: [queryKeys.inventory.all],
  OpeningStockUpdate: [queryKeys.inventory.all],
  DamageCaseUpdate: [queryKeys.inventory.all],
  StockDiscrepancyUpdate: [queryKeys.inventory.all],
  LowStock: [queryKeys.inventory.all],
  WarehouseUpdate: [queryKeys.warehouses.all],
  TaskAssigned: [
    queryKeys.cycleCounts.all,
    queryKeys.inboundRequests.all,
    queryKeys.goodsReceipts.all,
    queryKeys.transfers.all,
    ['warehouse-tasks'],
  ],
  StaffInvitationUpdate: [queryKeys.staff.all],
  SubscriptionPlanUpdate: [queryKeys.subscription.all],
  SubscriptionPaymentUpdate: [queryKeys.subscription.all, queryKeys.payments.all],
}

// Tham chiếu đến 1 phiếu cụ thể → key chi tiết (prefix phủ luôn allowed-actions).
const notificationReferenceDetailKeys: Record<string, (id: string) => readonly string[]> = {
  CycleCount: queryKeys.cycleCounts.detail,
  StockAdjustment: queryKeys.stockAdjustments.detail,
  StockAdjustmentVoucher: queryKeys.stockAdjustments.voucherDetail,
  InboundRequest: queryKeys.inboundRequests.detail,
  GoodsReceipt: queryKeys.goodsReceipts.detail,
  Product: queryKeys.products.detail,
}

/**
 * Query cần tải lại khi có thông báo. Có referenceId → chỉ chi tiết phiếu đó + các danh sách
 * cùng nhóm; nhóm khác (vd. StockAdjustmentUpdate cũng đổi phiếu kiểm kê) tải lại cả nhóm.
 */
export function getNotificationQueryKeys(
  notification: Pick<NotificationItem, 'type' | 'referenceType' | 'referenceId'>
): readonly (readonly unknown[])[] {
  const roots = notificationTypeQueryRoots[notification.type] ?? []
  const { referenceType, referenceId } = notification
  const detail =
    referenceType && referenceId
      ? notificationReferenceDetailKeys[referenceType]?.(referenceId)
      : null
  if (!detail) return roots
  return roots.flatMap((root) => (root[0] === detail[0] ? [detail, [...root, 'list']] : [root]))
}

const notificationReferenceRoutes: Record<string, (id: string) => string> = {
  InboundRequest: APP_ROUTES.inboundRequestDetail,
  GoodsReceipt: APP_ROUTES.goodsReceiptDetail,
  StockAdjustment: APP_ROUTES.stockAdjustmentDetail,
  CycleCount: APP_ROUTES.cycleCountDetail,
  StockAdjustmentVoucher: APP_ROUTES.stockAdjustmentVoucherDetail,
  Warehouse: APP_ROUTES.warehouseDetail,
  Product: APP_ROUTES.productDetail,
  StockTransfer: APP_ROUTES.transferDetail,
  WarehouseTask: () => APP_ROUTES.myTasks,
  StockIssueRequest: (id) => `${APP_ROUTES.stockIssueRequests}?id=${id}`,
  GoodsReturnRequest: () => APP_ROUTES.goodsReturnRequests,
  DamageCase: () => APP_ROUTES.inventoryDamageCases,
  OpeningStockRecord: () => APP_ROUTES.inventoryOpeningStocks,
  StockDiscrepancyReport: () => APP_ROUTES.inventoryDiscrepancies,
  Zone: () => APP_ROUTES.warehouses,
  Rack: () => APP_ROUTES.warehouses,
  Slot: () => APP_ROUTES.warehouses,
  Invitation: () => APP_ROUTES.staff,
  Tenant: () => APP_ROUTES.organization,
  TenantSubscription: () => APP_ROUTES.subscription,
  SubscriptionPlan: () => APP_ROUTES.subscription,
  Payment: () => APP_ROUTES.subscriptionPayments,
}

interface NotificationActionRoute {
  readonly to: (id: string) => string
  readonly requiresId?: boolean
}

// Mirrors the backend NotificationAction enum; the backend decides the intent, this table owns the route.
export const notificationActionRoutes: Record<string, NotificationActionRoute> = {
  ViewInboundRequest: { to: APP_ROUTES.inboundRequestDetail, requiresId: true },
  ViewGoodsReceipt: { to: APP_ROUTES.goodsReceiptDetail, requiresId: true },
  ViewStockAdjustment: { to: APP_ROUTES.stockAdjustmentDetail, requiresId: true },
  ViewCycleCount: { to: APP_ROUTES.cycleCountDetail, requiresId: true },
  ViewWarehouse: { to: APP_ROUTES.warehouseDetail, requiresId: true },
  ViewProduct: { to: APP_ROUTES.productDetail, requiresId: true },
  ViewWarehouses: { to: () => APP_ROUTES.warehouses },
  ViewStockTransfers: { to: () => APP_ROUTES.transfers },
  ViewStockTransfer: { to: APP_ROUTES.transferDetail, requiresId: true },
  ViewStockTransferShipments: {
    to: (id) => `${APP_ROUTES.transferDetail(id)}?tab=shipments`,
    requiresId: true,
  },
  ViewStockTransferDiscrepancies: {
    to: (id) => `${APP_ROUTES.transferDetail(id)}?tab=discrepancies`,
    requiresId: true,
  },
  ViewStockTransferFeedback: {
    to: (id) => `${APP_ROUTES.transferDetail(id)}?tab=feedback`,
    requiresId: true,
  },
  ViewMyWarehouseTasks: { to: () => APP_ROUTES.myTasks },
  ViewStockIssueRequests: { to: () => APP_ROUTES.stockIssueRequests },
  ViewGoodsReturnRequests: { to: () => APP_ROUTES.goodsReturnRequests },
  ViewDamageCases: { to: () => APP_ROUTES.inventoryDamageCases },
  ViewOpeningStock: { to: () => APP_ROUTES.inventoryOpeningStocks },
  ViewStockDiscrepancies: { to: () => APP_ROUTES.inventoryDiscrepancies },
  ViewStaff: { to: () => APP_ROUTES.staff },
  ViewOrganization: { to: () => APP_ROUTES.organization },
  ChooseSubscriptionPlan: { to: () => APP_ROUTES.subscription },
  ViewSubscription: { to: () => APP_ROUTES.subscription },
  ViewSubscriptionPayments: { to: () => APP_ROUTES.subscriptionPayments },
  ViewPlatformTenant: { to: APP_ROUTES.admin.tenantDetail, requiresId: true },
  ViewPlatformTenants: { to: () => APP_ROUTES.admin.tenants },
}
