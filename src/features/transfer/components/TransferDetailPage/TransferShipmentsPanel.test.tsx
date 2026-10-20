import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { buildShipment } from '../../utils/transfer-test-fixtures'
import { getShipmentCapabilities } from '../../utils/transfer-capabilities'
import { TransferShipmentsPanel } from './TransferShipmentsPanel'

vi.mock('../TransfersPage', () => ({
  ShipmentStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}))

const shipment = buildShipment({
  status: 'Receiving',
  pickTaskId: 'pick',
  pickTaskStatus: 'Completed',
  pickAssigneeId: 'picker',
  pickAssigneeName: 'Người lấy hàng',
  receiveTaskId: 'receive',
  receiveTaskStatus: 'Queued',
  receiveAssigneeId: 'receiver',
  receiveAssigneeName: 'Người kiểm nhận',
  putAwayTaskId: 'putaway',
  putAwayTaskStatus: 'Queued',
  putAwayAssigneeId: 'putter',
  putAwayAssigneeName: 'Người cất',
  lines: [
    {
      id: 'line-1',
      itemId: 'item-1',
      productId: 'product-1',
      sku: 'SKU-001',
      productName: 'Hàng kiểm thử',
      plannedQuantity: 10,
      pickedQuantity: 10,
      dispatchedQuantity: 10,
      receivedPhysicalQuantity: 7,
      status: 'Dispatched',
      pendingReturnQuantity: 0,
      openExceptionCount: 0,
    },
  ],
})
const viewer = {
  currentUserId: 'manager',
  isTenantOwner: false,
  permissions: [P.TRANSFERS_VIEW, P.TRANSFERS_RECEIVE, P.WAREHOUSE_TASKS_ASSIGN],
}

describe('TransferShipmentsPanel destination assignment', () => {
  it('keeps one primary action visible while shipment goods are collapsed in execution', () => {
    render(
      <TransferShipmentsPanel
        transferId="transfer"
        shipments={[shipment]}
        capabilities={{}}
        mode="execution"
        unitsByItem={{}}
        onAssignTask={vi.fn()}
        onCancelShipment={vi.fn()}
        onConfirmDeparture={vi.fn()}
        onReopenPicking={vi.fn()}
        onResolveEscalation={vi.fn()}
        onNextAction={vi.fn()}
        nextSteps={[
          {
            id: 'next',
            title: 'Kiểm nhận',
            description: '',
            actionLabel: 'Tiếp tục kiểm hàng',
            action: { type: 'openReceive', shipmentId: shipment.id },
          },
        ]}
      />
    )
    expect(screen.getAllByRole('link', { name: 'Tiếp tục kiểm hàng' })).toHaveLength(1)
    expect(screen.queryByRole('cell', { name: 'Hàng kiểm thử' })).not.toBeInTheDocument()
    const goods = screen.getByRole('button', { name: 'Hàng hóa đợt 1 · 1 dòng' })
    expect(goods).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(goods)
    expect(screen.getByRole('cell', { name: 'Hàng kiểm thử' })).toBeInTheDocument()
  })
  it.each(['receive', 'putaway'] as const)(
    'shows received quantity for every shipment line in the %s tab',
    (mode) => {
      render(
        <TransferShipmentsPanel
          transferId="transfer"
          shipments={[shipment]}
          capabilities={{ [shipment.id]: getShipmentCapabilities(viewer, shipment) }}
          unitsByItem={{ 'item-1': { unit: 'Cái', conversion: null } }}
          mode={mode}
          onAssignTask={vi.fn()}
          onCancelShipment={vi.fn()}
          onConfirmDeparture={vi.fn()}
          onReopenPicking={vi.fn()}
          onResolveEscalation={vi.fn()}
        />
      )
      expect(screen.getByRole('columnheader', { name: 'SL thực nhận' })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: '7' })).toBeInTheDocument()
    }
  )

  it('shows picking before a collapsed destination group, retaining both workers in details', () => {
    const onAssign = vi.fn()
    render(
      <TransferShipmentsPanel
        transferId="transfer"
        shipments={[shipment]}
        capabilities={{ [shipment.id]: getShipmentCapabilities(viewer, shipment) }}
        unitsByItem={{}}
        mode="receive"
        onAssignTask={onAssign}
        onCancelShipment={vi.fn()}
        onConfirmDeparture={vi.fn()}
        onReopenPicking={vi.fn()}
        onResolveEscalation={vi.fn()}
      />
    )
    const group = screen.getByRole('button', { name: /^Kho nhập · Cất hàng/ })
    const pick = screen.getByText('Kho xuất · Lấy hàng:')
    expect(pick.parentElement).toHaveTextContent('Hoàn tất · Nhân viên phụ trách: Người lấy hàng')
    expect(pick.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('Người kiểm nhận', { exact: false })).not.toBeInTheDocument()
    fireEvent.click(group)
    expect(screen.getByText(/Người được giao: Người kiểm nhận/)).toBeInTheDocument()
    expect(screen.getByText(/Người được giao: Người cất/)).toBeInTheDocument()
    const taskGroup = group.closest('[data-slot="collapsible"]')
    if (!(taskGroup instanceof HTMLElement)) throw new Error('Missing destination task group')
    expect(within(taskGroup).getByText('Kiểm tra hàng đến:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc nhận và cất hàng' }))
    expect(onAssign).toHaveBeenCalledWith(shipment, 'receive')
    expect(screen.queryByRole('button', { name: 'Giao việc cất hàng' })).not.toBeInTheDocument()
  })

  it('assigns only the remaining put-away task after receipt', () => {
    const row = {
      ...shipment,
      status: 'AwaitingPutAway' as const,
      receiveTaskStatus: 'Completed',
      putAwayAssigneeId: null,
      putAwayAssigneeName: null,
    }
    const onAssign = vi.fn()
    render(
      <TransferShipmentsPanel
        transferId="transfer"
        shipments={[row]}
        capabilities={{ [row.id]: getShipmentCapabilities(viewer, row) }}
        unitsByItem={{}}
        mode="putaway"
        onAssignTask={onAssign}
        onCancelShipment={vi.fn()}
        onConfirmDeparture={vi.fn()}
        onReopenPicking={vi.fn()}
        onResolveEscalation={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc cất hàng' }))
    expect(onAssign).toHaveBeenCalledWith(row, 'putaway')
    expect(
      screen.queryByRole('button', { name: 'Giao việc nhận và cất hàng' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Kho nhập · Cất hàng/ }))
    expect(screen.getByText('Cất hàng:').parentElement).toHaveTextContent(
      'Chờ bắt đầu · Chưa phân công'
    )
    expect(screen.queryByText(/Giao cho/)).not.toBeInTheDocument()
  })
})
