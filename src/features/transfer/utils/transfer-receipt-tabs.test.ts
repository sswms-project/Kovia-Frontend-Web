import { describe, expect, it } from 'vitest'
import { P } from '@/config/permissionCodes'
import { parseTransferDetailTab } from './transfer-detail-tabs'
import { getShipmentCapabilities, getTransferCapabilities } from './transfer-capabilities'
import { getTransferNextSteps } from './transfer-next-steps'
import { buildShipment, buildTransfer } from './transfer-test-fixtures'

describe('Tab kiểm hàng và cất hàng', () => {
  it('recognizes the new tab and retains old aliases', () => {
    expect(parseTransferDetailTab('putaway')).toBe('execution')
    expect(parseTransferDetailTab('receive')).toBe('execution')
    expect(parseTransferDetailTab('shipments')).toBe('execution')
    expect(parseTransferDetailTab('feedback')).toBe('execution')
  })
  it('chooses the putaway tab when stock has been counted but not stored', () => {
    const shipment = buildShipment({
      status: 'AwaitingPutAway',
      putAwayTaskId: 'task',
      putAwayAssigneeId: 'worker',
    })
    const transfer = buildTransfer({ shipments: [shipment] })
    const viewer = {
      permissions: [P.TRANSFERS_RECEIVE],
      currentUserId: 'worker',
      isTenantOwner: false,
      warehouseIds: [transfer.destinationWarehouseId],
    }
    const caps = getShipmentCapabilities(viewer, shipment, transfer)
    expect(caps.canOpenPutAway).toBe(true)
    expect(caps.canOpenReceive).toBe(false)
    const steps = getTransferNextSteps(
      viewer,
      transfer,
      getTransferCapabilities(viewer, transfer),
      { [shipment.id]: caps }
    )
    expect(steps.some((step) => step.action.type === 'openPutAway')).toBe(true)
  })
  it('does not let a source-only viewer open or assign destination putaway', () => {
    const shipment = buildShipment({ status: 'AwaitingPutAway' })
    const transfer = buildTransfer({ shipments: [shipment] })
    const caps = getShipmentCapabilities(
      {
        permissions: [P.TRANSFERS_RECEIVE, P.WAREHOUSE_TASKS_ASSIGN],
        currentUserId: 'worker',
        isTenantOwner: false,
        warehouseIds: [transfer.sourceWarehouseId],
      },
      shipment,
      transfer
    )
    expect(caps.canOpenPutAway).toBe(false)
    expect(caps.canAssignPutAway).toBe(false)
  })
})
