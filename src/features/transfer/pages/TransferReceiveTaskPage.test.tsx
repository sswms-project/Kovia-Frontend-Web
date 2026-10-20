import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { receiptFixture } from '../utils/transfer-receipt-test-fixtures'
import { buildShipment, buildTransfer } from '../utils/transfer-test-fixtures'
import type { TransferDetail } from '../types/transfer.types'
import type { TransferReceiptSheet } from '../types/transfer-receipt.types'
import TransferReceiveTaskPage from './TransferReceiveTaskPage'

const mock = vi.hoisted(() => ({
  push: vi.fn(),
  confirm: vi.fn(),
  accept: vi.fn(),
  freshDetail: undefined as TransferDetail | undefined,
  freshReceipt: undefined as TransferReceiptSheet | undefined,
  failedRefresh: false,
}))
const receipt = receiptFixture()
const shipment = buildShipment({
  id: receipt.shipmentId,
  status: 'Receiving',
  receiptFlowVersion: 1,
  receiveTaskId: 'receive-task',
  receiveAssigneeId: 'worker',
  putAwayTaskId: 'put-task',
  putAwayAssigneeId: 'worker',
})
const transfer = buildTransfer({ id: receipt.transferId, shipments: [shipment] })
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mock.push }) }))
vi.mock('../hooks/use-transfer-viewer', () => ({
  useTransferViewer: () => ({
    isReady: true,
    viewer: {
      currentUserId: 'worker',
      permissions: [P.TRANSFERS_RECEIVE],
      isTenantOwner: false,
      warehouseIds: [transfer.destinationWarehouseId],
    },
  }),
}))
vi.mock('../hooks/use-transfers', () => ({
  useTransferQuery: () => ({
    data: transfer,
    refetch: async () => ({ data: mock.freshDetail, isError: mock.failedRefresh }),
  }),
}))
vi.mock('../hooks/use-transfer-receipt', () => ({
  useStartTransferReceivingMutation: () => ({ isPending: false }),
  useTransferReceiptSheetQuery: () => ({
    data: receipt,
    refetch: async () => ({ data: mock.freshReceipt, isError: false }),
  }),
}))
vi.mock('../hooks/use-transfer-realtime', () => ({
  useTransferRealtime: () => ({ dismiss: vi.fn() }),
}))
vi.mock('../hooks/use-transfer-count-form', () => ({
  useTransferCountForm: () => ({
    form: { watch: () => [], formState: { isDirty: false } },
    confirmOpen: true,
    confirm: mock.confirm,
    acceptFresh: mock.accept,
    isPending: false,
  }),
}))
vi.mock('../components/TransferWork', () => ({
  TransferWorkHeader: () => null,
  TransferReceiptCountCards: () => null,
}))
vi.mock('../components/TransferShared', () => ({
  TransferChangedBanner: () => null,
  TransferUnsavedChanges: () => null,
  TransferConfirmDialog: ({ onConfirm }: { onConfirm: () => void }) => (
    <button onClick={onConfirm}>Xác nhận kiểm hàng</button>
  ),
}))
beforeEach(() => {
  vi.clearAllMocks()
  mock.confirm.mockResolvedValue(true)
  mock.freshDetail = { ...transfer, shipments: [{ ...shipment, status: 'AwaitingPutAway' }] }
  mock.freshReceipt = receiptFixture({
    status: 'AwaitingPutAway',
    receiptSubmittedAt: '2026-10-20T00:00:00Z',
  })
  mock.failedRefresh = false
})
afterEach(cleanup)

describe('Receiving hands off to putaway', () => {
  it('opens putaway only after confirmed receipt, fresh state, same assigned actor and permission', async () => {
    render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(mock.push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Xác nhận kiểm hàng'))
    await waitFor(() =>
      expect(mock.push).toHaveBeenCalledWith(
        APP_ROUTES.transferPutAwayTask(transfer.id, shipment.id)
      )
    )
    expect(mock.accept.mock.invocationCallOrder[0]!).toBeLessThan(
      mock.push.mock.invocationCallOrder[0]!
    )
  })
  it.each(['other-assignee', 'no-good-stock', 'refresh-error', 'rejected'])(
    'does not navigate for %s',
    async (scenario) => {
      if (scenario === 'other-assignee')
        mock.freshDetail = {
          ...transfer,
          shipments: [{ ...shipment, status: 'AwaitingPutAway', putAwayAssigneeId: 'other' }],
        }
      if (scenario === 'no-good-stock')
        mock.freshReceipt = receiptFixture({ status: 'ReceivedWithDiscrepancy' })
      if (scenario === 'refresh-error') mock.failedRefresh = true
      if (scenario === 'rejected') mock.confirm.mockResolvedValue(false)
      render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
      fireEvent.click(screen.getByText('Xác nhận kiểm hàng'))
      await waitFor(() => expect(mock.confirm).toHaveBeenCalledTimes(1))
      if (scenario !== 'rejected') await waitFor(() => expect(mock.accept).toHaveBeenCalled())
      expect(mock.push).not.toHaveBeenCalled()
    }
  )
})
