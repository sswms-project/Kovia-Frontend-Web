import { describe, expect, it } from 'vitest'
import { P } from '@/config/permissionCodes'
import {
  getShipmentCapabilities,
  getTransferCapabilities,
  type TransferViewer,
} from './transfer-capabilities'
import { getTransferNextSteps } from './transfer-next-steps'
import {
  MANAGER_ID,
  buildShipment,
  buildTransfer,
  buildTransferItem,
} from './transfer-test-fixtures'

const SOURCE = '70000000-0000-4000-8000-000000000001'
const DESTINATION = '70000000-0000-4000-8000-000000000002'
const STAFF_ID = '10000000-0000-4000-8000-000000000003'

function allStepsFor(viewer: TransferViewer, transfer = buildTransfer()) {
  const capabilities = getTransferCapabilities(viewer, transfer)
  const shipmentCapabilities = Object.fromEntries(
    (transfer.shipments ?? []).map((shipment) => [
      shipment.id,
      getShipmentCapabilities(viewer, shipment, transfer),
    ])
  )
  return getTransferNextSteps(viewer, transfer, capabilities, shipmentCapabilities).map(
    (step) => step.id
  )
}

/** Các bước của luồng đợt xuất; bước chọn vị trí cất có test riêng nên bỏ ra khỏi các so sánh còn lại. */
function stepsFor(viewer: TransferViewer, transfer = buildTransfer()) {
  return allStepsFor(viewer, transfer).filter((id) => id !== 'set-put-away')
}

const sourceManager: TransferViewer = {
  permissions: [P.TRANSFERS_DISPATCH, P.WAREHOUSE_TASKS_ASSIGN],
  currentUserId: MANAGER_ID,
  isTenantOwner: false,
  warehouseIds: [SOURCE],
}
const destinationManager: TransferViewer = {
  ...sourceManager,
  permissions: [P.TRANSFERS_RECEIVE, P.WAREHOUSE_TASKS_ASSIGN],
  warehouseIds: [DESTINATION],
}

describe('getTransferNextSteps', () => {
  it('tells the source manager to create a shipment, then to assign the pick task', () => {
    const open = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 0, unbatchedQuantity: 10 })],
    })
    expect(stepsFor(sourceManager, open)).toEqual(['create-shipment'])

    const shipment = buildShipment({ id: 's1', pickTaskId: 't1', pickAssigneeId: null })
    const withShipment = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [shipment],
    })
    expect(stepsFor(sourceManager, withShipment)).toEqual(['assign-pick-s1'])
  })

  it('does not ask the destination manager to assign picking, only receiving after dispatch', () => {
    const picking = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [buildShipment({ id: 's1', pickTaskId: 't1', pickAssigneeId: null })],
    })
    expect(stepsFor(destinationManager, picking)).toEqual([])

    const inTransit = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [
        buildShipment({
          id: 's1',
          status: 'InTransit',
          receiveTaskId: 'r1',
          receiveAssigneeId: null,
        }),
      ],
    })
    expect(stepsFor(destinationManager, inTransit)).toEqual([
      'assign-receive-s1',
      'open-receive-s1',
    ])
    expect(stepsFor(sourceManager, inTransit)).toEqual([])
  })

  it('keeps a reassign step for the manager after the pick task has an assignee', () => {
    const assigned = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [
        buildShipment({
          id: 's1',
          pickTaskId: 't1',
          pickAssigneeId: STAFF_ID,
          pickAssigneeName: 'Nguyễn Lấy',
        }),
      ],
    })
    expect(stepsFor(sourceManager, assigned)).toEqual(['reassign-pick-s1'])

    const received = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [
        buildShipment({
          id: 's1',
          status: 'InTransit',
          receiveTaskId: 'r1',
          receiveAssigneeId: STAFF_ID,
        }),
      ],
    })
    expect(stepsFor(destinationManager, received)).toEqual([
      'reassign-receive-s1',
      'open-receive-s1',
    ])
  })

  it('puts a pending pick report in front of the source manager first', () => {
    const transfer = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [
        buildShipment({
          id: 's1',
          pickTaskId: 't1',
          pickAssigneeId: STAFF_ID,
          lines: [
            {
              id: 'l1',
              itemId: 'i1',
              productId: 'p1',
              sku: 'SKU-1',
              productName: 'Hàng',
              plannedQuantity: 10,
              pickedQuantity: 0,
              dispatchedQuantity: 0,
              status: 'PendingManager',
              pendingReturnQuantity: 0,
              openExceptionCount: 1,
            },
          ],
        }),
      ],
    })
    expect(stepsFor(sourceManager, transfer)).toContain('resolve-escalation-s1')
    expect(stepsFor(destinationManager, transfer)).not.toContain('resolve-escalation-s1')
  })

  it('asks the destination manager to choose put-away slots while some lines have none', () => {
    const transfer = buildTransfer({
      items: [
        buildTransferItem({ id: 'i1', quantity: 10, destinationSlotId: null }),
        buildTransferItem({ id: 'i2', quantity: 5, destinationSlotId: 'slot-1' }),
      ],
    })
    expect(allStepsFor(destinationManager, transfer)).toContain('set-put-away')
    expect(allStepsFor(sourceManager, transfer)).not.toContain('set-put-away')

    const allChosen = buildTransfer({
      items: [
        buildTransferItem({
          id: 'i1',
          quantity: 10,
          putAwayPlan: [
            {
              slotId: 'slot-1',
              slotCode: 'A1',
              rackCode: null,
              zoneName: null,
              path: 'A1',
              plannedTotal: 10,
              receivedQuantity: 0,
              remainingBudget: 10,
              isSystemDefaultSlot: false,
              plannedByUserId: MANAGER_ID,
              createdAt: '2026-10-12T00:00:00Z',
              modifiedAt: null,
            },
          ],
        }),
      ],
    })
    expect(allStepsFor(destinationManager, allChosen)).not.toContain('set-put-away')
  })

  it('points an assigned picker to the pick screen', () => {
    const picker: TransferViewer = {
      permissions: [P.TRANSFERS_PICK],
      currentUserId: STAFF_ID,
      isTenantOwner: false,
      warehouseIds: [SOURCE],
    }
    const transfer = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [buildShipment({ id: 's1', pickAssigneeId: STAFF_ID })],
    })
    expect(stepsFor(picker, transfer)).toEqual(['open-pick-s1'])
    expect(stepsFor({ ...picker, currentUserId: MANAGER_ID }, transfer)).toEqual([])
  })

  it('asks the source manager, not the picker, to confirm departure once picking is done', () => {
    const transfer = buildTransfer({
      items: [buildTransferItem({ quantity: 10, batchedQuantity: 10, unbatchedQuantity: 0 })],
      shipments: [buildShipment({ id: 's1', status: 'ReadyToDispatch', pickAssigneeId: STAFF_ID })],
    })
    expect(stepsFor(sourceManager, transfer)).toEqual(['confirm-departure-s1'])
    const picker: TransferViewer = {
      permissions: [P.TRANSFERS_PICK],
      currentUserId: STAFF_ID,
      isTenantOwner: false,
      warehouseIds: [SOURCE],
    }
    expect(stepsFor(picker, transfer)).toEqual([])
    expect(stepsFor(destinationManager, transfer)).toEqual([])
  })
})

describe('allocation hint', () => {
  const allocated = buildTransfer({
    sourceWarehouseId: SOURCE,
    destinationWarehouseId: DESTINATION,
    items: [
      buildTransferItem({
        quantity: 10,
        batchedQuantity: 0,
        unbatchedQuantity: 10,
        allocations: [
          {
            inventoryStockId: 's1',
            location: 'Khu K01',
            lotNumber: null,
            expiryDate: null,
            quantity: 10,
          },
        ],
      }),
    ],
  })

  it('suggests checking the allocation before the first shipment is created', () => {
    expect(stepsFor(sourceManager, allocated)).toEqual(['check-allocation', 'create-shipment'])
  })

  it('stops suggesting it once a shipment exists', () => {
    const withShipment = { ...allocated, shipments: [buildShipment({ status: 'Picking' })] }
    expect(stepsFor(sourceManager, withShipment)).not.toContain('check-allocation')
  })
})
