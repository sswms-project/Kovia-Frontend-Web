import { describe, expect, it } from 'vitest'
import { USER_ROLES } from '@/config/roles'
import { APP_ROUTES } from '@/routes/app-routes'
import { getDashboardRouteForRole } from './role-routes'

describe('getDashboardRouteForRole', () => {
  it('sends warehouse staff to My Tasks instead of the retired staff dashboard', () => {
    expect(getDashboardRouteForRole(USER_ROLES.WarehouseStaff)).toBe(APP_ROUTES.myTasks)
  })

  it('keeps the dashboard of every other role', () => {
    expect(getDashboardRouteForRole(USER_ROLES.TenantOwner)).toBe(APP_ROUTES.dashboardByRole.tenant)
    expect(getDashboardRouteForRole(USER_ROLES.WarehouseManager)).toBe(
      APP_ROUTES.dashboardByRole.manager
    )
    expect(getDashboardRouteForRole(USER_ROLES.SystemAdmin)).toBe(APP_ROUTES.admin.dashboard)
  })
})
