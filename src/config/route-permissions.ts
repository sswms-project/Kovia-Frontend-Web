import { APP_ROUTES } from '@/routes/app-routes'
import { USER_ROLES, type UserRole } from './roles'
import { P } from './permissionCodes'

export const ROUTE_CAPABILITIES = {
  [APP_ROUTES.productImport]: P.PRODUCTS_IMPORT,
  [APP_ROUTES.unitImport]: P.UNITS_MANAGE,
  [APP_ROUTES.categoryImport]: P.CATEGORIES_MANAGE,
} as const

interface RoutePermission {
  pathPrefix: string
  allowedRoles: readonly UserRole[]
}

const ROUTE_PERMISSIONS: readonly RoutePermission[] = [
  {
    pathPrefix: APP_ROUTES.reports,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.notifications,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.auditLogs,
    allowedRoles: [
      USER_ROLES.SystemAdmin,
      USER_ROLES.TenantOwner,
      USER_ROLES.WarehouseManager,
      USER_ROLES.WarehouseStaff,
    ],
  },
  { pathPrefix: '/admin', allowedRoles: [USER_ROLES.SystemAdmin] },
  { pathPrefix: APP_ROUTES.subscription, allowedRoles: [USER_ROLES.TenantOwner] },
  { pathPrefix: APP_ROUTES.organization, allowedRoles: [USER_ROLES.TenantOwner] },
  {
    pathPrefix: APP_ROUTES.settings.accessControl,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.myTasks,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.suppliers,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.units,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.categories,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.inboundRequests,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.products,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.inbound,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.inventory,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.transfers,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.stockIssueRequests,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.goodsReturnRequests,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.stockRecipients,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.warehouses,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  {
    pathPrefix: APP_ROUTES.staff,
    allowedRoles: [USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff],
  },
  { pathPrefix: APP_ROUTES.dashboardByRole.tenant, allowedRoles: [USER_ROLES.TenantOwner] },
  { pathPrefix: APP_ROUTES.dashboardByRole.manager, allowedRoles: [USER_ROLES.WarehouseManager] },
  { pathPrefix: APP_ROUTES.dashboardByRole.staff, allowedRoles: [USER_ROLES.WarehouseStaff] },
]

function matchesPathPrefix(pathname: string, pathPrefix: string): boolean {
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`)
}

export function getAllowedRolesForPath(pathname: string): readonly UserRole[] | null {
  const permission = ROUTE_PERMISSIONS.find((entry) =>
    matchesPathPrefix(pathname, entry.pathPrefix)
  )
  return permission?.allowedRoles ?? null
}
