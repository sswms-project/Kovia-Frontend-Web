import { describe, expect, it } from 'vitest'
import { P } from '@/config/permissionCodes'
import {
  getShipmentCapabilities,
  getTransferCapabilities,
  type TransferViewer,
} from './transfer-capabilities'
import {
  MANAGER_ID,
  OWNER_ID,
  buildShipment,
  buildTransfer,
  buildTransferItem,
} from './transfer-test-fixtures'

function viewer(permissions: string[], overrides: Partial<TransferViewer> = {}): TransferViewer {
  return { permissions, currentUserId: OWNER_ID, isTenantOwner: false, ...overrides }
}

describe('getTransferCapabilities', () => {
  it('grants nothing without a transfer or on a legacy transfer', () => {
    const everything = viewer(Object.values(P), { isTenantOwner: true })
    expect(getTransferCapabilities(everything, null).closingAction).toBeNull()
    expect(
      getTransferCapabilities(everything, buildTransfer({ isLegacyWorkflow: true }))
    ).toMatchObject({
      canEdit: false,
      canCreateShipment: false,
      closingAction: null,
    })
  })

  it('lets the creator edit and cancel an in-progress transfer that has not shipped', () => {
    const result = getTransferCapabilities(
      viewer([P.TRANSFERS_CREATE, P.TRANSFERS_CANCEL]),
      buildTransfer()
    )
    expect(result.canEdit).toBe(true)
    expect(result.closingAction).toBe('cancel')
  })

  it('shows a single stop action once any shipment has left the warehouse', () => {
    const dispatched = buildTransfer({
      items: [
        buildTransferItem({ dispatchedQuantity: 4, batchedQuantity: 4, unbatchedQuantity: 6 }),
      ],
    })
    const result = getTransferCapabilities(viewer([P.TRANSFERS_CANCEL]), dispatched)
    expect(result.closingAction).toBe('stop')
  })

  it('shows no closing action when nothing remains to stop', () => {
    const finished = buildTransfer({
      items: [buildTransferItem({ dispatchedQuantity: 10, unbatchedQuantity: 0 })],
    })
    expect(getTransferCapabilities(viewer([P.TRANSFERS_CANCEL]), finished).closingAction).toBeNull()
  })

  it('requires the cancel permission for both closing actions', () => {
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_CREATE]), buildTransfer()).closingAction
    ).toBeNull()
  })

  it('does not let a different non-owner edit or close the transfer', () => {
    const other = viewer([P.TRANSFERS_CREATE, P.TRANSFERS_CANCEL], { currentUserId: MANAGER_ID })
    const result = getTransferCapabilities(other, buildTransfer())
    expect(result.canEdit).toBe(false)
    expect(result.closingAction).toBeNull()
  })

  it('lets the tenant owner edit and close transfers created by someone else', () => {
    const owner = viewer([P.TRANSFERS_CREATE, P.TRANSFERS_CANCEL], {
      currentUserId: MANAGER_ID,
      isTenantOwner: true,
    })
    const result = getTransferCapabilities(owner, buildTransfer())
    expect(result.canEdit).toBe(true)
    expect(result.closingAction).toBe('cancel')
  })

  it('limits draft actions to the creator of the draft', () => {
    const draft = buildTransfer({ status: 'Draft' })
    expect(getTransferCapabilities(viewer([P.TRANSFERS_CREATE]), draft).canEditDraft).toBe(true)
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_CREATE], { currentUserId: MANAGER_ID }), draft)
        .canEditDraft
    ).toBe(false)
  })

  it('allows creating a shipment only for a manager while goods remain unbatched', () => {
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_DISPATCH]), buildTransfer()).canCreateShipment
    ).toBe(true)
    const batched = buildTransfer({ items: [buildTransferItem({ unbatchedQuantity: 0 })] })
    expect(getTransferCapabilities(viewer([P.TRANSFERS_DISPATCH]), batched).canCreateShipment).toBe(
      false
    )
    expect(getTransferCapabilities(viewer([]), buildTransfer()).canCreateShipment).toBe(false)
  })

  it('lets only receiving or dispatching managers send feedback and the requester reply', () => {
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_RECEIVE]), buildTransfer()).canGiveFeedback
    ).toBe(true)
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_VIEW]), buildTransfer()).canGiveFeedback
    ).toBe(false)
    const withFeedback = buildTransfer({
      feedbacks: [
        {
          id: 'f1',
          itemId: null,
          reasonCode: 'InsufficientStock',
          message: 'Thiếu hàng',
          status: 'Open',
          reply: null,
          authorId: MANAGER_ID,
          authorName: 'Quản lý',
          createdAt: '2026-10-08T02:00:00Z',
          repliedAt: null,
        },
      ],
    })
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_CREATE]), withFeedback).canReplyFeedback
    ).toBe(true)
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_CREATE]), buildTransfer()).canReplyFeedback
    ).toBe(false)
  })

  it('offers discrepancy resolution only with the resolve permission and an open discrepancy', () => {
    const awaiting = buildTransfer({
      status: 'AwaitingResolution',
      discrepancies: [
        {
          id: 'd1',
          itemId: 'i1',
          shipmentId: 's1',
          sku: 'SKU-001',
          productName: 'Sữa tươi',
          type: 'Missing',
          quantity: 2,
          resolvedQuantity: 0,
          reasonCode: 'Lost',
          note: null,
          isOpen: true,
          resolution: null,
          createdAt: '2026-10-08T03:00:00Z',
          resolvedAt: null,
        },
      ],
    })
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_RESOLVE]), awaiting).canResolveDiscrepancy
    ).toBe(true)
    expect(
      getTransferCapabilities(viewer([P.TRANSFERS_VIEW]), awaiting).canResolveDiscrepancy
    ).toBe(false)
  })
})

describe('getShipmentCapabilities', () => {
  it('allows a manager to cancel only a shipment that is still being picked', () => {
    const manager = viewer([P.TRANSFERS_DISPATCH])
    expect(getShipmentCapabilities(manager, buildShipment()).canCancel).toBe(true)
    expect(getShipmentCapabilities(manager, buildShipment({ status: 'InTransit' })).canCancel).toBe(
      false
    )
  })

  it('opens the pick screen for pickers and the receive screen for receivers', () => {
    expect(getShipmentCapabilities(viewer([P.TRANSFERS_PICK]), buildShipment()).canOpenPick).toBe(
      true
    )
    expect(
      getShipmentCapabilities(viewer([P.TRANSFERS_PICK]), buildShipment({ status: 'InTransit' }))
        .canOpenPick
    ).toBe(false)
    expect(
      getShipmentCapabilities(viewer([P.TRANSFERS_RECEIVE]), buildShipment({ status: 'InTransit' }))
        .canOpenReceive
    ).toBe(true)
    expect(
      getShipmentCapabilities(viewer([P.TRANSFERS_RECEIVE]), buildShipment({ status: 'Received' }))
        .canOpenReceive
    ).toBe(false)
  })

  it('flags escalations only for dispatching managers', () => {
    const shipment = buildShipment({
      lines: [
        {
          id: 'l1',
          itemId: 'i1',
          productId: 'p1',
          sku: 'SKU-001',
          productName: 'Sữa tươi',
          plannedQuantity: 5,
          pickedQuantity: 0,
          dispatchedQuantity: 0,
          status: 'PendingManager',
          pendingReturnQuantity: 0,
          openExceptionCount: 1,
        },
      ],
    })
    expect(
      getShipmentCapabilities(viewer([P.TRANSFERS_DISPATCH]), shipment).canResolveEscalation
    ).toBe(true)
    expect(getShipmentCapabilities(viewer([P.TRANSFERS_PICK]), shipment).canResolveEscalation).toBe(
      false
    )
  })

  it('lets only a dispatching manager confirm departure or reopen a shipment waiting to leave', () => {
    const waiting = buildShipment({ status: 'ReadyToDispatch' })
    const manager = getShipmentCapabilities(viewer([P.TRANSFERS_DISPATCH]), waiting)
    expect(manager).toMatchObject({
      canConfirmDeparture: true,
      canReopenPicking: true,
      canOpenPick: false,
      canCancel: false,
    })
    const picker = getShipmentCapabilities(viewer([P.TRANSFERS_PICK]), waiting)
    expect(picker).toMatchObject({ canConfirmDeparture: false, canOpenPick: false })
    expect(
      getShipmentCapabilities(viewer([P.TRANSFERS_DISPATCH]), buildShipment()).canConfirmDeparture
    ).toBe(false)
  })

  it('keeps pick and receive actions inside the right warehouse', () => {
    const warehouses = {
      sourceWarehouseId: 'source',
      destinationWarehouseId: 'destination',
    }
    const everything = [P.TRANSFERS_PICK, P.TRANSFERS_RECEIVE, P.TRANSFERS_DISPATCH]
    const sourceManager = viewer(everything, { warehouseIds: ['source'] })
    const destinationManager = viewer(everything, { warehouseIds: ['destination'] })
    const picking = buildShipment()
    const inTransit = buildShipment({ status: 'InTransit' })

    expect(getShipmentCapabilities(sourceManager, picking, warehouses)).toMatchObject({
      canOpenPick: true,
      canCancel: true,
    })
    expect(getShipmentCapabilities(sourceManager, inTransit, warehouses).canOpenReceive).toBe(false)
    expect(getShipmentCapabilities(destinationManager, inTransit, warehouses).canOpenReceive).toBe(
      true
    )
    expect(getShipmentCapabilities(destinationManager, picking, warehouses)).toMatchObject({
      canOpenPick: false,
      canCancel: false,
    })
  })
})

describe('canAdjustAllocation', () => {
  const SOURCE = '70000000-0000-4000-8000-000000000001'
  const DESTINATION = '70000000-0000-4000-8000-000000000002'
  const allocation = {
    inventoryStockId: 's1',
    location: 'Khu K01 / Kệ A / A-01',
    lotNumber: null,
    expiryDate: null,
    quantity: 5,
  }
  const allocated = buildTransfer({
    sourceWarehouseId: SOURCE,
    destinationWarehouseId: DESTINATION,
    items: [buildTransferItem({ allocations: [allocation] })],
  })

  it('is for the owner and the source warehouse manager only', () => {
    const sourceManager = viewer([P.TRANSFERS_DISPATCH], { warehouseIds: [SOURCE] })
    const destinationManager = viewer([P.TRANSFERS_DISPATCH], { warehouseIds: [DESTINATION] })
    const owner = viewer([P.TRANSFERS_DISPATCH], { isTenantOwner: true })
    expect(getTransferCapabilities(sourceManager, allocated).canAdjustAllocation).toBe(true)
    expect(getTransferCapabilities(owner, allocated).canAdjustAllocation).toBe(true)
    expect(getTransferCapabilities(destinationManager, allocated).canAdjustAllocation).toBe(false)
    expect(getTransferCapabilities(viewer([P.TRANSFERS_PICK]), allocated).canAdjustAllocation).toBe(
      false
    )
  })

  it('needs an in-progress transfer that still shows its allocation', () => {
    const sourceManager = viewer([P.TRANSFERS_DISPATCH], { warehouseIds: [SOURCE] })
    expect(
      getTransferCapabilities(sourceManager, { ...allocated, status: 'Completed' })
        .canAdjustAllocation
    ).toBe(false)
    expect(
      getTransferCapabilities(
        sourceManager,
        buildTransfer({ sourceWarehouseId: SOURCE, items: [buildTransferItem()] })
      ).canAdjustAllocation
    ).toBe(false)
  })
})
