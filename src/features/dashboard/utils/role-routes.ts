import type { Route } from 'next'
import { USER_ROLES, type UserRole } from '@/config/roles'
import { APP_ROUTES } from '@/routes/app-routes'

export function getDashboardRouteForRole(role: UserRole): Route {
  switch (role) {
    case USER_ROLES.TenantOwner:
      return APP_ROUTES.dashboardByRole.tenant as Route
    case USER_ROLES.SystemAdmin:
      return APP_ROUTES.admin.dashboard
    case USER_ROLES.WarehouseManager:
      return APP_ROUTES.dashboardByRole.manager as Route
    case USER_ROLES.WarehouseStaff:
      return APP_ROUTES.myTasks
    default:
      return APP_ROUTES.dashboard as Route
  }
}
