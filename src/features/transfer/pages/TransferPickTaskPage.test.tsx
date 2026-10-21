import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { buildShipment, buildTransfer } from '../utils/transfer-test-fixtures'
import type { TransferViewer } from '../utils/transfer-capabilities'
import type { TransferPickSheet } from '../types/transfer.types'
import TransferPickTaskPage from './TransferPickTaskPage'

const mock = vi.hoisted(() => ({
  viewer: undefined as TransferViewer | undefined,
  assignee: 'worker',
  failedDetail: false,
}))
const shipment = buildShipment({ pickAssigneeId: 'worker' })
const transfer = buildTransfer({ shipments: [shipment] })
const sheet: TransferPickSheet = {
  transferId: transfer.id,
  shipmentId: shipment.id,
  shipmentNumber: 1,
  transferCode: transfer.transferCode,
  sourceWarehouseId: transfer.sourceWarehouseId,
  sourceWarehouseName: 'Nguồn',
  destinationWarehouseId: transfer.destinationWarehouseId,
  destinationWarehouseName: 'Đích',
  shipmentStatus: 'Picking',
  version: 'AQ==',
  lines: [
    {
      lineId: 'line',
      itemId: 'item',
      productId: 'product',
      sku: 'SKU',
      productName: 'Hàng',
      productBarcode: null,
      baseUnitName: 'Cái',
      plannedQuantity: 1,
      pickedQuantity: 0,
      remainingQuantity: 1,
      pendingReturnQuantity: 0,
      status: 'Pending',
      suggestions: [],
      picks: [],
      exceptions: [],
    },
  ],
}
vi.mock('../hooks/use-transfer-viewer', () => ({
  useTransferViewer: () => ({ viewer: mock.viewer, isReady: true }),
}))
vi.mock('../hooks/use-transfers', () => ({
  useTransferQuery: () => ({
    data: { ...transfer, shipments: [{ ...shipment, pickAssigneeId: mock.assignee }] },
    isError: mock.failedDetail,
  }),
}))
vi.mock('../hooks/use-transfer-fulfillment', () => ({
  useTransferPickSheetQuery: () => ({ data: sheet }),
}))
vi.mock('../hooks/use-transfer-realtime', () => ({ useTransferRealtime: () => ({}) }))
vi.mock('../hooks/use-transfer-pick-actions', () => ({
  useTransferPickActions: () => ({
    entry: {},
    switch: {},
    escalate: {},
    returnPick: {},
    complete: {},
  }),
}))
vi.mock('../components/TransferWork', () => ({
  TransferWorkHeader: () => null,
  PickEntryWorkspace: () => <div data-testid="scan-workspace" />,
  TransferPickLinesTable: ({ canAct }: { canAct: boolean }) => (
    <div data-testid="can-act">{String(canAct)}</div>
  ),
  PickEscalateDialog: () => null,
  PickSwitchDialog: () => null,
  ReturnPickDialog: () => null,
}))
vi.mock('../components/TransferShared', () => ({
  MissingPermissionNotice: () => null,
  TransferChangedBanner: () => null,
  TransferConfirmDialog: () => null,
  TransferUnsavedChanges: () => null,
}))
beforeEach(() => {
  mock.viewer = {
    currentUserId: 'worker',
    isTenantOwner: false,
    permissions: [P.TRANSFERS_VIEW, P.TRANSFERS_PICK],
    warehouseIds: [transfer.sourceWarehouseId],
  }
  mock.assignee = 'worker'
  mock.failedDetail = false
})
afterEach(cleanup)

describe('Pick workspace authorization', () => {
  it('stacks scanner and goods at natural mobile height, keeping completion outside the scroller', () => {
    const { container } = render(
      <TransferPickTaskPage transferId={transfer.id} shipmentId={shipment.id} />
    )
    const scannerPane = screen.getByTestId('scan-workspace').parentElement!
    expect(scannerPane).toHaveClass('order-first', 'min-w-0', 'shrink-0')
    expect(scannerPane).toHaveClass('lg:order-last', 'lg:min-h-0', 'lg:overflow-y-auto')
    expect(scannerPane).not.toHaveClass('min-h-0', 'overflow-y-auto')
    const panes = scannerPane.parentElement!
    expect(panes).toHaveClass('flex', 'flex-col', 'lg:grid', 'lg:flex-1', 'lg:min-h-0')
    expect(panes).not.toHaveClass('grid', 'flex-1', 'min-h-0')
    const content = panes.parentElement!
    expect(content).toHaveClass('lg:h-full', 'lg:min-h-0')
    expect(content).not.toHaveClass('h-full', 'min-h-0')
    const scroller = container.querySelector('[data-slot="transfer-scroll"]')!
    expect(scroller).toHaveClass('overflow-y-auto')
    expect(scroller).toContainElement(scannerPane)
    expect(scroller).toContainElement(screen.getByTestId('can-act'))
    const complete = screen.getByRole('button', { name: 'Hoàn tất lấy hàng' })
    expect(scroller).not.toContainElement(complete)
    expect(complete.closest('footer')).toHaveClass('shrink-0')
    expect(complete).toBeDisabled()
  })
  it('enables only the assigned source worker and becomes read-only after reassignment', () => {
    const view = render(<TransferPickTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(screen.getByTestId('scan-workspace')).toBeInTheDocument()
    mock.assignee = 'another-worker'
    view.rerender(<TransferPickTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(screen.queryByTestId('scan-workspace')).not.toBeInTheDocument()
    expect(screen.getByTestId('can-act')).toHaveTextContent('false')
    expect(screen.queryByRole('button', { name: 'Hoàn tất lấy hàng' })).not.toBeInTheDocument()
  })
  it('allows a source coordinator with pick and dispatch permissions to act', () => {
    mock.assignee = 'another-worker'
    mock.viewer = { ...mock.viewer!, permissions: [P.TRANSFERS_PICK, P.TRANSFERS_DISPATCH] }
    render(<TransferPickTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(screen.getByTestId('can-act')).toHaveTextContent('true')
  })
  it('does not enable writes for a destination-only worker or a failed assignment read', () => {
    mock.viewer = { ...mock.viewer!, warehouseIds: [transfer.destinationWarehouseId] }
    const view = render(<TransferPickTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(screen.queryByTestId('scan-workspace')).not.toBeInTheDocument()
    mock.failedDetail = true
    view.rerender(<TransferPickTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(screen.queryByTestId('scan-workspace')).not.toBeInTheDocument()
    expect(screen.getByText('Không thể tải phiếu lấy hàng')).toBeInTheDocument()
  })
})
