import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { buildShipment, buildTransfer } from '../../utils/transfer-test-fixtures'
import { getShipmentCapabilities } from '../../utils/transfer-capabilities'
import { TransferShipmentActions } from './TransferShipmentActions'

afterEach(cleanup)
const transfer = buildTransfer()
it.each(
  ([1, 2] as const).flatMap((receiptFlowVersion) =>
    (['source', 'destination', 'owner'] as const).map((scope) => ({ receiptFlowVersion, scope }))
  )
)(
  'scopes receiving links for $scope with receipt flow $receiptFlowVersion',
  async ({ receiptFlowVersion, scope }) => {
    const shipment = buildShipment({
      status: 'Receiving',
      dispatchedAt: '2026-10-20T00:00:00Z',
      receiptFlowVersion,
      putAwayTaskId: 'put',
    })
    const allowed = getShipmentCapabilities(
      {
        permissions: [P.TRANSFERS_VIEW],
        currentUserId: 'viewer',
        isTenantOwner: scope === 'owner',
        warehouseIds: [
          scope === 'source' ? transfer.sourceWarehouseId : transfer.destinationWarehouseId,
        ],
      },
      shipment,
      transfer
    )
    render(
      <TransferShipmentActions
        transferId={transfer.id}
        shipment={shipment}
        allowed={allowed}
        steps={[]}
        onAction={vi.fn()}
        onAssign={vi.fn()}
        onCancel={vi.fn()}
        onReopen={vi.fn()}
      />
    )
    const trigger = screen.queryByRole('button', { name: 'Thao tác khác đợt 1' })
    if (scope === 'source') expect(trigger).not.toBeInTheDocument()
    else await userEvent.setup().click(trigger!)
    expect(Boolean(screen.queryByRole('menuitem', { name: 'Xem kiểm nhận' }))).toBe(
      scope !== 'source'
    )
    expect(Boolean(screen.queryByRole('menuitem', { name: 'Xem cất hàng' }))).toBe(
      scope !== 'source'
    )
  }
)
describe('Picking links', () => {
  it.each([true, false])('shows picking only with source view access: %s', async (sourceAccess) => {
    const shipment = buildShipment()
    const allowed = getShipmentCapabilities(
      {
        permissions: [P.TRANSFERS_VIEW],
        currentUserId: 'viewer',
        isTenantOwner: false,
        warehouseIds: [sourceAccess ? transfer.sourceWarehouseId : transfer.destinationWarehouseId],
      },
      shipment,
      transfer
    )
    render(
      <TransferShipmentActions
        transferId={transfer.id}
        shipment={shipment}
        allowed={allowed}
        steps={[]}
        onAction={vi.fn()}
        onAssign={vi.fn()}
        onCancel={vi.fn()}
        onReopen={vi.fn()}
      />
    )
    const trigger = screen.queryByRole('button', { name: 'Thao tác khác đợt 1' })
    if (sourceAccess) await userEvent.setup().click(trigger!)
    else expect(trigger).not.toBeInTheDocument()
    expect(Boolean(screen.queryByRole('menuitem', { name: 'Xem lấy hàng' }))).toBe(sourceAccess)
  })
})
