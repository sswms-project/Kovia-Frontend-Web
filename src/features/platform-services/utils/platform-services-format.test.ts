import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '@/routes/app-routes'
import { getNotificationReferenceRoute, notificationActionRoutes } from './platform-services-format'

const id = '11111111-1111-4111-8111-111111111111'

describe('getNotificationReferenceRoute', () => {
  it('routes tenant approval notifications to the subscription page', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'TenantStatusUpdate',
        referenceType: 'TenantSubscription',
        referenceId: id,
      })
    ).toBe(APP_ROUTES.subscription)
  })

  it('returns null without a reference', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'TenantStatusUpdate',
        referenceType: null,
        referenceId: null,
      })
    ).toBeNull()
  })

  it('prefers the action over the reference type', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'TenantStatusUpdate',
        referenceType: 'Tenant',
        referenceId: id,
        action: 'ChooseSubscriptionPlan',
      })
    ).toBe(APP_ROUTES.subscription)
  })

  it('falls back to the reference type for unknown actions', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'TenantStatusUpdate',
        referenceType: 'Tenant',
        referenceId: id,
        action: 'SomethingNew',
      })
    ).toBe(APP_ROUTES.organization)
  })

  it('opens the exact transfer for transfer notifications, old and new', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'TransferUpdate',
        referenceType: 'StockTransfer',
        referenceId: id,
        action: 'ViewStockTransfer',
      })
    ).toBe(APP_ROUTES.transferDetail(id))
    expect(
      getNotificationReferenceRoute({
        type: 'TransferUpdate',
        referenceType: 'StockTransfer',
        referenceId: id,
        action: null,
      })
    ).toBe(APP_ROUTES.transferDetail(id))
    // Thông báo cũ đã lưu hành động chung của danh sách vẫn mở được.
    expect(
      getNotificationReferenceRoute({
        type: 'TransferUpdate',
        referenceType: 'StockTransfer',
        referenceId: id,
        action: 'ViewStockTransfers',
      })
    ).toBe(APP_ROUTES.transfers)
  })

  it('opens the tab of the transfer a notification is about', () => {
    const open = (action: string) =>
      getNotificationReferenceRoute({
        type: 'TransferUpdate',
        referenceType: 'StockTransfer',
        referenceId: id,
        action,
      })
    expect(open('ViewStockTransferShipments')).toBe(
      `${APP_ROUTES.transferDetail(id)}?tab=shipments`
    )
    expect(open('ViewStockTransferDiscrepancies')).toBe(
      `${APP_ROUTES.transferDetail(id)}?tab=discrepancies`
    )
    expect(open('ViewStockTransferFeedback')).toBe(`${APP_ROUTES.transferDetail(id)}?tab=feedback`)
  })

  it('sends a task assignment to the my-tasks page', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'TaskAssigned',
        referenceType: 'WarehouseTask',
        referenceId: id,
        action: 'ViewMyWarehouseTasks',
      })
    ).toBe(APP_ROUTES.myTasks)
    expect(
      getNotificationReferenceRoute({
        type: 'TaskAssigned',
        referenceType: 'WarehouseTask',
        referenceId: id,
      })
    ).toBe(APP_ROUTES.myTasks)
  })

  it('routes every known action', () => {
    for (const [action, route] of Object.entries(notificationActionRoutes)) {
      expect(route.to(id), action).toBeTruthy()
    }
  })
})
