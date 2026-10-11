import { describe, expect, it } from 'vitest'
import { P } from '@/config/permissionCodes'
import { USER_ROLES } from '@/config/roles'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  getNavItems,
  getVisibleNavSections,
  isNavItemActive,
  isNavSectionActive,
  NAV_CONFIG,
} from './nav-config'

function getVisibleNavItems(
  role: Parameters<typeof getVisibleNavSections>[0],
  permissions: string[]
) {
  return getVisibleNavSections(role, new Set(permissions)).flatMap((section) => section.items)
}

describe('application navigation visibility', () => {
  it.each([USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff])(
    'activates only task history for %s',
    (role) => {
      const items = getNavItems(role)
      const tasks = items.find((item) => item.href === APP_ROUTES.myTasks)!
      const history = items.find((item) => item.href === APP_ROUTES.myTaskHistory)!
      expect(isNavItemActive(APP_ROUTES.myTaskHistory, tasks)).toBe(false)
      expect(isNavItemActive(APP_ROUTES.myTaskHistory, history)).toBe(true)
      expect(isNavItemActive(APP_ROUTES.myTasks, tasks)).toBe(true)
      expect(isNavItemActive(APP_ROUTES.myTasks, history)).toBe(false)
    }
  )
  it.each([USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff])(
    'opens an authorized inbound entry point for %s without hiding delegated requests',
    (role) => {
      const requestOnlyItems = getVisibleNavItems(role, [P.INBOUND_REQUESTS_VIEW])
      const requestEntry = requestOnlyItems.find((item) => item.label === 'Nhập kho')
      expect(requestEntry?.href).toBe(APP_ROUTES.inboundRequests)
      expect(requestEntry?.requiredPermission).toBe(P.INBOUND_REQUESTS_VIEW)
      expect(isNavItemActive(`${APP_ROUTES.inboundRequests}/request-1`, requestEntry!)).toBe(true)
      expect(requestOnlyItems.some((item) => item.href === APP_ROUTES.inbound)).toBe(false)

      for (const permissions of [
        [P.GOODS_RECEIPTS_VIEW],
        [P.GOODS_RECEIPTS_VIEW, P.INBOUND_REQUESTS_VIEW],
      ]) {
        const entry = getVisibleNavItems(role, permissions).find(
          (item) => item.label === 'Nhập kho'
        )
        const canViewRequests = permissions.includes(P.INBOUND_REQUESTS_VIEW)
        expect(entry?.href).toBe(canViewRequests ? APP_ROUTES.inboundRequests : APP_ROUTES.inbound)
        expect(entry?.requiredPermission).toBe(
          canViewRequests ? P.INBOUND_REQUESTS_VIEW : P.GOODS_RECEIPTS_VIEW
        )
        expect(isNavItemActive(APP_ROUTES.goodsReceipts, entry!)).toBe(true)
        expect(isNavItemActive(APP_ROUTES.inboundPutaway, entry!)).toBe(true)
      }

      expect(getVisibleNavItems(role, []).some((item) => item.label === 'Nhập kho')).toBe(false)
      expect(getNavItems(role).find((item) => item.label === 'Nhập kho')?.href).toBe(
        APP_ROUTES.inbound
      )
    }
  )

  it.each([USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff])(
    'shows the warehouse workspace for %s',
    (role) => {
      expect(getNavItems(role).some((item) => item.href === APP_ROUTES.warehouses)).toBe(true)
    }
  )

  it('keeps tenant warehouse navigation hidden from the system admin', () => {
    expect(
      getNavItems(USER_ROLES.SystemAdmin).some((item) => item.href === APP_ROUTES.warehouses)
    ).toBe(false)
  })

  it('uses Vietnamese labels throughout the system admin sidebar', () => {
    const adminSections = NAV_CONFIG[USER_ROLES.SystemAdmin]

    expect(
      adminSections.map((section) => ({
        label: section.label ?? null,
        items: section.items.map((item) => item.label),
      }))
    ).toEqual([
      { label: null, items: ['Tổng quan'] },
      {
        label: 'Quản trị nền tảng',
        items: [
          'Đơn vị thuê',
          'Phân quyền',
          'Gói đăng ký',
          'Thông báo hệ thống',
          'Giao dịch thanh toán',
        ],
      },
      { label: 'Hệ thống', items: ['Nhật ký hoạt động', 'Cài đặt'] },
    ])
  })

  it('shows permission-gated workspaces only when the current user has access', () => {
    expect(
      getVisibleNavItems(USER_ROLES.TenantOwner, [P.GOODS_RECEIPTS_VIEW]).some(
        (item) => item.href === APP_ROUTES.inbound
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseManager, [P.GOODS_RECEIPTS_VIEW]).some(
        (item) => item.href === APP_ROUTES.inbound
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, [P.GOODS_RECEIPTS_VIEW]).some(
        (item) => item.href === APP_ROUTES.inbound
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, []).some(
        (item) => item.href === APP_ROUTES.inbound
      )
    ).toBe(false)

    const staffItems = getVisibleNavItems(USER_ROLES.WarehouseStaff, [
      'suppliers:view',
      'products:view',
      'goods-receipts:view',
      'inventory:view',
    ])
    expect(staffItems.some((item) => item.href === APP_ROUTES.suppliers)).toBe(true)
    expect(staffItems.some((item) => item.href === APP_ROUTES.products)).toBe(true)
    expect(staffItems.some((item) => item.href === APP_ROUTES.inbound)).toBe(true)
    expect(staffItems.some((item) => item.href === APP_ROUTES.inventory)).toBe(true)
  })

  it('shows Staff and Manager task navigation only with the own-task permission', () => {
    const visibleItems = getVisibleNavItems(USER_ROLES.WarehouseStaff, ['warehouse-tasks:view-own'])

    expect(visibleItems.some((item) => item.href === APP_ROUTES.myTasks)).toBe(true)
    expect(visibleItems.some((item) => item.href === APP_ROUTES.myTaskHistory)).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, ['dashboard:view']).some(
        (item) => item.href === APP_ROUTES.myTasks
      )
    ).toBe(false)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseManager, ['warehouse-tasks:view-own']).some(
        (item) => item.href === APP_ROUTES.myTasks
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseManager, ['warehouse-tasks:view-own']).some(
        (item) => item.href === APP_ROUTES.myTaskHistory
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseManager, ['dashboard:view']).some(
        (item) => item.href === APP_ROUTES.myTasks
      )
    ).toBe(false)
  })

  it('shows Owner task navigation only with the all-task permission', () => {
    const ownerItems = getVisibleNavItems(USER_ROLES.TenantOwner, [P.WAREHOUSE_TASKS_VIEW_ALL])

    expect(ownerItems.some((item) => item.href === APP_ROUTES.myTasks)).toBe(true)
    expect(ownerItems.some((item) => item.href === APP_ROUTES.myTaskHistory)).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.TenantOwner, [P.WAREHOUSE_TASKS_VIEW_OWN]).some(
        (item) => item.href === APP_ROUTES.myTasks
      )
    ).toBe(false)
  })

  it.each([USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff])(
    'shows warehouse layout navigation for %s only with warehouse view permission',
    (role) => {
      expect(
        getVisibleNavItems(role, [P.WAREHOUSES_VIEW]).some(
          (item) => item.href === APP_ROUTES.warehouseLayouts
        )
      ).toBe(true)
      expect(
        getVisibleNavItems(role, []).some((item) => item.href === APP_ROUTES.warehouseLayouts)
      ).toBe(false)
    }
  )

  it('groups subscription management without duplicate payment entries', () => {
    const serviceSection = NAV_CONFIG[USER_ROLES.TenantOwner].find(
      (section) => section.id === 'services'
    )

    expect(serviceSection?.label).toBe('Dịch vụ')
    expect(serviceSection?.items.map((item) => [item.label, item.href])).toEqual([
      ['Gói dịch vụ', APP_ROUTES.subscription],
      ['Lịch sử thanh toán', APP_ROUTES.subscriptionPayments],
    ])
  })

  it('shows payment history only with the payment viewing permission', () => {
    expect(
      getVisibleNavItems(USER_ROLES.TenantOwner, [P.PAYMENTS_VIEW]).some(
        (item) => item.href === APP_ROUTES.subscriptionPayments
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.TenantOwner, [P.SUBSCRIPTION_PLANS_VIEW]).some(
        (item) => item.href === APP_ROUTES.subscriptionPayments
      )
    ).toBe(false)
  })

  it('places staff management under organization management for warehouse managers', () => {
    const managerSections = NAV_CONFIG[USER_ROLES.WarehouseManager]
    const organizationSection = managerSections.find(
      (section) => section.id === 'organization-management'
    )
    const subjectsSection = managerSections.find((section) => section.id === 'subjects')

    expect(organizationSection?.items.some((item) => item.href === APP_ROUTES.staff)).toBe(true)
    expect(subjectsSection?.items.some((item) => item.href === APP_ROUTES.staff)).toBe(false)
  })

  it('uses the requested tenant sidebar hierarchy and order', () => {
    const tenantSections = NAV_CONFIG[USER_ROLES.TenantOwner]

    expect(
      tenantSections.map((section) => ({
        label: section.label ?? null,
        items: section.items.map((item) => item.label),
      }))
    ).toEqual([
      { label: null, items: ['Dashboard', 'Công việc kho', 'Lịch sử công việc kho'] },
      { label: 'Quản trị doanh nghiệp', items: ['Doanh nghiệp', 'Phân quyền', 'Nhân viên'] },
      { label: 'Quản Lý Kho', items: ['Kho hàng', 'Sơ đồ kho'] },
      { label: 'Đối tượng', items: ['Nhà cung cấp', 'Khách hàng'] },
      {
        label: 'Danh mục',
        items: ['Danh mục VTHH', 'Nhóm VTHH', 'Đơn vị tính'],
      },
      {
        label: 'Hoạt Động Kho',
        items: ['Nhập kho', 'Tồn kho', 'Điều chuyển kho', 'Kiểm kê', 'Xuất kho & Trả hàng'],
      },
      {
        label: 'Báo cáo & phân tích',
        items: ['Báo cáo kho', 'Dự báo & bổ sung hàng'],
      },
      { label: 'Dịch vụ', items: ['Gói dịch vụ', 'Lịch sử thanh toán'] },
      { label: 'Hệ thống', items: ['Thông báo', 'Nhật ký hoạt động', 'Cài đặt'] },
    ])
  })

  it('keeps unfinished tenant destinations non-navigable', () => {
    const plannedItems = getNavItems(USER_ROLES.TenantOwner).filter(
      (item) => item.status === 'planned'
    )

    expect(plannedItems.map((item) => item.label)).toEqual([])
    expect(plannedItems.every((item) => item.href === undefined)).toBe(true)
    expect(plannedItems.every((item) => !isNavItemActive('/anything', item))).toBe(true)
  })

  it('shows Platform Services only with the matching permission', () => {
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, ['notifications:view']).some(
        (item) => item.href === APP_ROUTES.notifications
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, ['audit-logs:view']).some(
        (item) => item.href === APP_ROUTES.auditLogs
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseManager, ['audit-logs:view']).some(
        (item) => item.href === APP_ROUTES.auditLogs
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.SystemAdmin, ['audit-logs:view']).some(
        (item) => item.href === APP_ROUTES.auditLogs
      )
    ).toBe(true)
  })

  it('separates staff task history, personal activity and security settings', () => {
    const items = getVisibleNavItems(USER_ROLES.WarehouseStaff, [
      P.WAREHOUSE_TASKS_VIEW_OWN,
      P.AUDIT_LOGS_VIEW,
    ])

    expect(items.find((item) => item.href === APP_ROUTES.myTaskHistory)?.label).toBe(
      'Công việc đã xử lý'
    )
    expect(items.find((item) => item.href === APP_ROUTES.auditLogs)?.label).toBe(
      'Hoạt động của tôi'
    )
    expect(items.some((item) => item.href === APP_ROUTES.settings.security)).toBe(true)
  })

  it('lets staff see delegated staff-management navigation without role hard-coding', () => {
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, ['staff:view']).some(
        (item) => item.href === APP_ROUTES.staff
      )
    ).toBe(true)
    expect(
      getVisibleNavItems(USER_ROLES.WarehouseStaff, []).some(
        (item) => item.href === APP_ROUTES.staff
      )
    ).toBe(false)
  })

  it('marks a tenant group active when one of its child routes is active', () => {
    const catalogSection = NAV_CONFIG[USER_ROLES.TenantOwner].find(
      (section) => section.id === 'catalog'
    )

    expect(catalogSection).toBeDefined()
    expect(isNavSectionActive('/products/product-1', catalogSection!)).toBe(true)
    expect(isNavSectionActive(APP_ROUTES.categories, catalogSection!)).toBe(true)
    expect(isNavSectionActive('/inventory', catalogSection!)).toBe(false)
  })

  it('keeps the inbound menu active across the complete inbound workspace', () => {
    const inboundItem = getNavItems(USER_ROLES.TenantOwner).find(
      (item) => item.href === APP_ROUTES.inbound
    )

    expect(inboundItem).toBeDefined()
    expect(isNavItemActive(APP_ROUTES.inboundRequests, inboundItem!)).toBe(true)
    expect(isNavItemActive(APP_ROUTES.goodsReceipts, inboundItem!)).toBe(true)
    expect(isNavItemActive(APP_ROUTES.inboundPutaway, inboundItem!)).toBe(true)
  })

  it.each([
    [USER_ROLES.TenantOwner, APP_ROUTES.dashboardByRole.tenant],
    [USER_ROLES.WarehouseManager, APP_ROUTES.dashboardByRole.manager],
    [USER_ROLES.WarehouseStaff, APP_ROUTES.dashboardByRole.staff],
  ])('marks the redirected dashboard route active for %s', (role, pathname) => {
    const dashboardItem = getNavItems(role).find((item) => item.href === APP_ROUTES.dashboard)

    expect(dashboardItem).toBeDefined()
    expect(isNavItemActive(pathname, dashboardItem!)).toBe(true)
  })

  it('marks only the correct subscription navigation item as active', () => {
    const serviceItems = NAV_CONFIG[USER_ROLES.TenantOwner].find(
      (section) => section.id === 'services'
    )?.items
    const planItem = serviceItems?.find((item) => item.href === APP_ROUTES.subscription)
    const paymentsItem = serviceItems?.find((item) => item.href === APP_ROUTES.subscriptionPayments)

    expect(planItem).toBeDefined()
    expect(paymentsItem).toBeDefined()
    expect(isNavItemActive('/subscription', planItem!)).toBe(true)
    expect(isNavItemActive('/subscription/payments', planItem!)).toBe(false)
    expect(isNavItemActive('/subscription/payments', paymentsItem!)).toBe(true)
    expect(isNavItemActive('/subscription/invoices/payment-1/print', paymentsItem!)).toBe(true)
  })

  it.each([USER_ROLES.TenantOwner, USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff])(
    'places forecasting under reports with the existing inventory view permission for %s',
    (role) => {
      const reports = getVisibleNavSections(role, new Set([P.INVENTORY_VIEW])).find(
        (section) => section.id === 'reports'
      )
      const forecast = reports?.items.find((item) => item.href === APP_ROUTES.reportForecast)
      expect(reports?.label).toBe('Báo cáo & phân tích')
      expect(forecast?.status).toBeUndefined()
      expect(forecast?.requiredPermission).toBe(P.INVENTORY_VIEW)
      expect(
        getVisibleNavItems(role, [P.REPORTS_VIEW]).some(
          (item) => item.href === APP_ROUTES.reportForecast
        )
      ).toBe(false)
      expect(getNavItems(role).some((item) => item.href === APP_ROUTES.inventoryForecast)).toBe(
        false
      )
    }
  )

  it('activates only forecasting when opening the forecast workspace', () => {
    const items = getNavItems(USER_ROLES.WarehouseManager)
    const forecast = items.find((item) => item.href === APP_ROUTES.reportForecast)!
    const reports = items.find((item) => item.href === APP_ROUTES.reports)!
    expect(isNavItemActive(APP_ROUTES.reportForecast, forecast)).toBe(true)
    expect(isNavItemActive(APP_ROUTES.reportForecast, reports)).toBe(false)
    expect(isNavItemActive('/reports/stock-flow', reports)).toBe(true)
  })

  it('keeps tenant inventory hidden from the system admin', () => {
    expect(
      getNavItems(USER_ROLES.SystemAdmin).some((item) => item.href === APP_ROUTES.inventory)
    ).toBe(false)
  })

  it('shows tenant access control to delegated tenant roles', () => {
    expect(
      getNavItems(USER_ROLES.TenantOwner).some(
        (item) => item.href === APP_ROUTES.settings.accessControl
      )
    ).toBe(true)

    for (const role of [USER_ROLES.WarehouseManager, USER_ROLES.WarehouseStaff]) {
      expect(
        getVisibleNavItems(role, [P.TENANT_ROLE_PERMISSIONS_VIEW]).some(
          (item) => item.href === APP_ROUTES.settings.accessControl
        )
      ).toBe(true)
      expect(
        getVisibleNavItems(role, []).some((item) => item.href === APP_ROUTES.settings.accessControl)
      ).toBe(false)
    }

    expect(
      getNavItems(USER_ROLES.SystemAdmin).some(
        (item) => item.href === APP_ROUTES.settings.accessControl
      )
    ).toBe(false)
  })
})

describe('inventory and cycle count navigation', () => {
  const items = getVisibleNavItems(USER_ROLES.WarehouseManager, [
    P.INVENTORY_VIEW,
    P.CYCLE_COUNTS_VIEW,
  ])
  const activeLabels = (pathname: string) =>
    items.filter((item) => isNavItemActive(pathname, item)).map((item) => item.label)

  it('highlights only the cycle count entry on cycle count pages', () => {
    expect(activeLabels(APP_ROUTES.cycleCounts)).toEqual(['Kiểm kê'])
    expect(activeLabels(`${APP_ROUTES.cycleCounts}/cycle-count-1`)).toEqual(['Kiểm kê'])
  })

  it('keeps highlighting the inventory entry on its other pages', () => {
    expect(activeLabels(APP_ROUTES.inventoryMovements)).toEqual(['Tồn kho'])
  })
})
