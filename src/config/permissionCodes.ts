/**
 * Permission codes mirrored from BE [HasPermission] attributes.
 * Keep this file in sync when BE permission routes change.
 */
export const P = {
  // Admin
  ADMIN_DASHBOARD_VIEW: 'admin:dashboard:view',
  ADMIN_TENANTS_VIEW: 'admin:tenants:view',
  ADMIN_TENANTS_APPROVE: 'admin:tenants:approve',
  ADMIN_TENANTS_SUSPEND: 'admin:tenants:suspend',
  ADMIN_PAYMENTS_VIEW: 'admin:payments:view',
  ADMIN_ANNOUNCEMENTS_SEND: 'admin:announcements:send',

  // Audit Logs
  AUDIT_LOGS_VIEW: 'audit-logs:view',

  // Cycle Counts
  CYCLE_COUNTS_VIEW: 'cycle-counts:view',
  CYCLE_COUNTS_RECORD: 'cycle-counts:record',
  CYCLE_COUNTS_CREATE: 'cycle-counts:create',
  CYCLE_COUNTS_FINALIZE: 'cycle-counts:finalize',

  // Dashboard / Reports
  DASHBOARD_VIEW: 'dashboard:view',
  REPORTS_VIEW: 'reports:view',

  // Goods Receipts
  GOODS_RECEIPTS_VIEW: 'goods-receipts:view',
  GOODS_RECEIPTS_CREATE: 'goods-receipts:create',
  GOODS_RECEIPTS_SUBMIT: 'goods-receipts:submit',
  GOODS_RECEIPTS_PUTAWAY: 'goods-receipts:putaway',
  GOODS_RECEIPTS_PLAN_PUTAWAY: 'goods-receipts:plan-putaway',
  GOODS_RECEIPTS_APPROVE: 'goods-receipts:approve',
  GOODS_RECEIPTS_SELF_APPROVE: 'goods-receipts:self-approve',
  GOODS_RECEIPTS_REJECT: 'goods-receipts:reject',

  // Warehouse Tasks (công việc được giao của Nhân viên kho)
  WAREHOUSE_TASKS_VIEW_OWN: 'warehouse-tasks:view-own',
  WAREHOUSE_TASKS_MANAGE_OWN: 'warehouse-tasks:manage-own',
  WAREHOUSE_TASKS_VIEW_ALL: 'warehouse-tasks:view-all',
  WAREHOUSE_TASKS_CREATE: 'warehouse-tasks:create',
  WAREHOUSE_TASKS_ASSIGN: 'warehouse-tasks:assign',

  // Goods Return Requests
  GOODS_RETURN_REQUESTS_VIEW: 'goods-return-requests:view',
  GOODS_RETURN_REQUESTS_APPROVE: 'goods-return-requests:approve',

  // Inbound Requests
  INBOUND_REQUESTS_VIEW: 'inbound-requests:view',
  INBOUND_REQUESTS_VIEW_DRAFT: 'inbound-requests:view-draft',
  INBOUND_REQUESTS_CREATE: 'inbound-requests:create',
  INBOUND_REQUESTS_EDIT: 'inbound-requests:edit',
  INBOUND_REQUESTS_DELETE: 'inbound-requests:delete',
  INBOUND_REQUESTS_SUBMIT: 'inbound-requests:submit',
  INBOUND_REQUESTS_APPROVE: 'inbound-requests:approve',
  INBOUND_REQUESTS_REJECT: 'inbound-requests:reject',
  INBOUND_REQUESTS_SELF_APPROVE: 'inbound-requests:self-approve',
  INBOUND_REQUESTS_CANCEL: 'inbound-requests:cancel',
  INBOUND_REQUESTS_CLOSE_REMAINING: 'inbound-requests:close-remaining',

  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_RESERVE: 'inventory:reserve',
  INVENTORY_REPORT_DAMAGED: 'inventory:report-damaged',
  INVENTORY_SELF_APPROVE_OPENING_STOCK: 'inventory:self-approve-opening-stock',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications:view',

  // Organization
  ORGANIZATION_VIEW: 'organization:view',
  ORGANIZATION_UPDATE: 'organization:update',

  // Payments / Subscription
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_INVOICE: 'payments:invoice',
  PAYMENTS_SYNC: 'payments:sync',
  SUBSCRIPTIONS_VIEW: 'subscriptions:view',
  SUBSCRIPTIONS_UPGRADE: 'subscriptions:upgrade',
  SUBSCRIPTIONS_RENEW: 'subscriptions:renew',
  SUBSCRIPTIONS_CANCEL: 'subscriptions:cancel',
  SUBSCRIPTION_PLANS_VIEW: 'subscription-plans:view',
  SUBSCRIPTION_PLANS_CREATE: 'subscription-plans:create',
  SUBSCRIPTION_PLANS_UPDATE: 'subscription-plans:update',
  SUBSCRIPTION_PLANS_ACTIVATE: 'subscription-plans:activate',
  SUBSCRIPTION_PLANS_DELETE: 'subscription-plans:delete',

  // Products
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_CONFIGURE_POLICY: 'products:configure-policy',
  PRODUCTS_GENERATE_BARCODE: 'products:generate-barcode',
  PRODUCTS_IMPORT: 'products:import',

  // Product categories
  CATEGORIES_VIEW: 'categories:view',
  CATEGORIES_MANAGE: 'categories:manage',

  // Units
  UNITS_VIEW: 'units:view',
  UNITS_MANAGE: 'units:manage',

  // RBAC
  ROLES_VIEW: 'roles:view',
  ROLES_ASSIGN_PERMISSION: 'roles:assign-permission',
  TENANT_ROLE_PERMISSIONS_VIEW: 'tenant-role-permissions:view',
  TENANT_ROLE_PERMISSIONS_MANAGE: 'tenant-role-permissions:manage',

  // Staff
  STAFF_VIEW: 'staff:view',
  STAFF_INVITE: 'staff:invite',
  STAFF_TERMINATE: 'staff:terminate',
  STAFF_ASSIGN_MANAGER: 'staff:assign-manager',
  STAFF_ASSIGN_WAREHOUSE: 'staff:assign-warehouse',

  // Stock Adjustments
  STOCK_ADJUSTMENTS_VIEW: 'stock-adjustments:view',
  STOCK_ADJUSTMENTS_CREATE: 'stock-adjustments:create',
  STOCK_ADJUSTMENTS_APPROVE: 'stock-adjustments:approve',

  // Stock Issue Requests
  STOCK_ISSUE_REQUESTS_VIEW: 'stock-issue-requests:view',
  STOCK_ISSUE_REQUESTS_CREATE: 'stock-issue-requests:create',
  STOCK_ISSUE_REQUESTS_PICK: 'stock-issue-requests:pick',
  STOCK_ISSUE_REQUESTS_DISPATCH: 'stock-issue-requests:dispatch',
  STOCK_ISSUE_REQUESTS_AUTHORIZE_DISPATCH: 'stock-issue-requests:authorize-dispatch',
  STOCK_ISSUE_REQUESTS_RETURN: 'stock-issue-requests:return',
  STOCK_ISSUE_REQUESTS_CANCEL: 'stock-issue-requests:cancel',
  STOCK_ISSUE_REQUESTS_ASSIGN_PICKER: 'stock-issue-requests:assign-picker',

  // Stock Recipients
  STOCK_RECIPIENTS_VIEW: 'stock-recipients:view',
  STOCK_RECIPIENTS_CREATE: 'stock-recipients:create',
  STOCK_RECIPIENTS_UPDATE: 'stock-recipients:update',
  STOCK_RECIPIENTS_MANAGE_STATUS: 'stock-recipients:manage-status',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers:view',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_UPDATE: 'suppliers:update',
  SUPPLIERS_DEACTIVATE: 'suppliers:deactivate',
  SUPPLIERS_REACTIVATE: 'suppliers:reactivate',

  // Transfers
  TRANSFERS_VIEW: 'transfers:view',
  TRANSFERS_CREATE: 'transfers:create',
  TRANSFERS_DISPATCH: 'transfers:dispatch',
  TRANSFERS_RECEIVE: 'transfers:receive',
  TRANSFERS_PICK: 'transfers:pick',
  TRANSFERS_CANCEL: 'transfers:cancel',
  TRANSFERS_RESOLVE: 'transfers:resolve',

  // Warehouses
  WAREHOUSES_VIEW: 'warehouses:view',
  WAREHOUSES_CREATE: 'warehouses:create',
  WAREHOUSES_UPDATE: 'warehouses:update',
  WAREHOUSES_DEACTIVATE: 'warehouses:deactivate',
  WAREHOUSES_CONFIGURE_LAYOUT: 'warehouses:configure-layout',
  WAREHOUSES_GENERATE_BARCODE: 'warehouses:generate-barcode',
} as const

export type PermissionCode = (typeof P)[keyof typeof P]

const PLATFORM_ONLY_PERMISSION_CODES: ReadonlySet<string> = new Set([
  P.ADMIN_DASHBOARD_VIEW,
  P.ADMIN_TENANTS_VIEW,
  P.ADMIN_TENANTS_APPROVE,
  P.ADMIN_TENANTS_SUSPEND,
  P.ADMIN_PAYMENTS_VIEW,
  P.ADMIN_ANNOUNCEMENTS_SEND,
  P.SUBSCRIPTION_PLANS_VIEW,
  P.SUBSCRIPTION_PLANS_CREATE,
  P.SUBSCRIPTION_PLANS_UPDATE,
  P.SUBSCRIPTION_PLANS_ACTIVATE,
  P.SUBSCRIPTION_PLANS_DELETE,
])

export const isPlatformOnlyPermission = (permissionKey: string): boolean =>
  PLATFORM_ONLY_PERMISSION_CODES.has(permissionKey)
