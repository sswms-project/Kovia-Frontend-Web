import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '@/routes/app-routes'
import { notificationCreatedEventSchema } from '../schemas/platform-services.schema'
import {
  getArchivedDocumentHref,
  getNotificationReferenceRoute,
  notificationActionRoutes,
} from './platform-services-format'

const id = '11111111-1111-4111-8111-111111111111'

describe('deleted document audit links', () => {
  it.each(['InboundRequest', 'StockTransfer', 'GoodsReturnRequest', 'SupplierReturnRequest'])(
    'links supported deleted %s documents to a read-only page',
    (entityType) => {
      expect(getArchivedDocumentHref({ entityType, entityId: id, action: 'DeleteDraft' })).toBe(
        APP_ROUTES.archivedDocument(entityType, id)
      )
    }
  )
  it('does not link non-delete actions, unrelated entities or invalid ids', () => {
    expect(
      getArchivedDocumentHref({ entityType: 'InboundRequest', entityId: id, action: 'Update' })
    ).toBeNull()
    expect(
      getArchivedDocumentHref({ entityType: 'User', entityId: id, action: 'Delete' })
    ).toBeNull()
    expect(
      getArchivedDocumentHref({
        entityType: 'InboundRequest',
        entityId: '../other',
        action: 'Delete',
      })
    ).toBeNull()
  })
})

describe('getNotificationReferenceRoute', () => {
  it.each([null, 'ViewStockIssueRequests', 'UnknownFutureAction'])(
    'opens the exact outbound request for legacy action %s',
    (action) => {
      for (const type of ['TaskAssigned', 'StockIssueRequestUpdate'] as const)
        expect(
          getNotificationReferenceRoute({
            type,
            referenceType: 'StockIssueRequest',
            referenceId: id,
            action,
          })
        ).toBe(APP_ROUTES.stockIssueRequestDetail(id))
    }
  )

  it.each([null, '', '../other', '00000000-0000-0000-0000-000000000000'])(
    'does not invent an outbound detail route for invalid reference %s',
    (referenceId) => {
      expect(
        getNotificationReferenceRoute({
          type: 'TaskAssigned',
          referenceType: 'StockIssueRequest',
          referenceId,
          action: 'ViewStockIssueRequests',
        })
      ).toBe(APP_ROUTES.stockIssueRequests)
      expect(
        getNotificationReferenceRoute({
          type: 'TaskAssigned',
          referenceType: 'StockIssueRequest',
          referenceId,
        })
      ).toBeNull()
    }
  )
  it.each([null, 'ViewInboundRequest', 'ViewMyWarehouseTasks'])(
    'routes inbound task assignments to tasks, including legacy action %s',
    (action) => {
      expect(
        getNotificationReferenceRoute({
          type: 'TaskAssigned',
          referenceType: 'InboundRequest',
          referenceId: id,
          action,
        })
      ).toBe(APP_ROUTES.myTasks)
      expect(
        getNotificationReferenceRoute({
          type: 'InboundRequestUpdate',
          referenceType: 'InboundRequest',
          referenceId: id,
          action: 'ViewInboundRequest',
        })
      ).toBe(APP_ROUTES.inboundRequestDetail(id))
    }
  )
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

  it.each([
    ['ViewStockTransferPick', 'pick'],
    ['ViewStockTransferReceive', 'receive'],
    ['ViewStockTransferPutAway', 'putaway'],
  ])('opens the correct stage for %s without guessing from notification text', (action, tab) => {
    const notification = {
      type: 'TaskAssigned',
      referenceType: 'StockTransfer',
      referenceId: id,
      action,
    } as const
    expect(getNotificationReferenceRoute(notification)).toBe(
      `${APP_ROUTES.transferDetail(id)}?tab=${tab}`
    )
    expect(getNotificationReferenceRoute({ ...notification, referenceId: null })).toBeNull()
  })

  it('routes every known action', () => {
    for (const [action, route] of Object.entries(notificationActionRoutes)) {
      expect(route.to(id), action).toBeTruthy()
    }
  })
  it('opens the supplier return a notification is about', () => {
    expect(
      getNotificationReferenceRoute({
        type: 'SupplierReturnUpdate',
        referenceType: 'SupplierReturnRequest',
        referenceId: id,
      })
    ).toBe(APP_ROUTES.supplierReturnDetail(id))
  })

  it('accepts realtime supplier return events', () => {
    expect(
      notificationCreatedEventSchema.safeParse({
        notificationId: id,
        type: 'SupplierReturnUpdate',
        createdAt: '2026-10-19T10:00:00+07:00',
        referenceType: 'SupplierReturnRequest',
        referenceId: id,
      }).success
    ).toBe(true)
  })
})
