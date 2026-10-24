import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { receiptFixture } from '../utils/transfer-receipt-test-fixtures'
import { buildShipment, buildTransfer } from '../utils/transfer-test-fixtures'
import type { TransferDetail } from '../types/transfer.types'
import type { TransferReceiptSheet } from '../types/transfer-receipt.types'
import type { TransferCountFormValues } from '../schemas/transfer-receipt.schema'
import TransferReceiveTaskPage from './TransferReceiveTaskPage'

const mock = vi.hoisted(() => ({
  push: vi.fn(),
  confirm: vi.fn(),
  accept: vi.fn(),
  freshDetail: undefined as TransferDetail | undefined,
  freshReceipt: undefined as TransferReceiptSheet | undefined,
  failedRefresh: false,
  compact: false,
  receiptError: false,
  detailReads: vi.fn(),
  detailRefetch: vi.fn(),
  slotReads: vi.fn(),
  receiptFlowVersion: 1,
  staging: false,
  start: vi.fn(),
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
const execution = {
  sourceWarehouseId: transfer.sourceWarehouseId,
  destinationWarehouseId: transfer.destinationWarehouseId,
  destinationWarehouseName: transfer.destinationWarehouseName,
  receiveAssigneeId: 'worker',
  putAwayAssigneeId: 'worker',
  putAwayAssigneeName: 'Nhân viên',
}
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
  useTransferQuery: (id: string | null) => {
    mock.detailReads(id)
    return {
      data: id ? transfer : undefined,
      refetch: mock.detailRefetch,
    }
  },
  useTransferPutAwaySlotsQuery: (params: unknown, enabled: boolean) => {
    mock.slotReads(params, enabled)
    return { data: [], isLoading: false }
  },
}))
vi.mock('../hooks/use-transfer-receipt', () => ({
  useStartTransferReceivingMutation: () => ({ isPending: false, mutateAsync: mock.start }),
  useTransferReceiptSheetQuery: () => ({
    data: {
      ...receipt,
      receiptFlowVersion: mock.receiptFlowVersion,
      execution: mock.compact ? execution : undefined,
      ...(mock.staging
        ? {
            status: 'InTransit',
            outboundStagingFlowVersion: 1,
            stagingPoints: {
              items: [
                { slotId: '10000000-0000-4000-8000-000000000001', label: 'Khu A / Điểm chờ nhận' },
              ],
              suggestedSlotId: '10000000-0000-4000-8000-000000000001',
              configuredDefaultSlotId: '10000000-0000-4000-8000-000000000001',
              invalidDefault: false,
            },
          }
        : {}),
    },
    refetch: async () => ({ data: mock.freshReceipt, isError: mock.receiptError }),
  }),
}))
vi.mock('../hooks/use-transfer-realtime', () => ({
  useTransferRealtime: () => ({ dismiss: vi.fn() }),
}))
vi.mock('../hooks/use-transfer-count-form', () => ({
  useTransferCountForm: function useTransferCountForm() {
    const form = useForm<TransferCountFormValues>({
      defaultValues: {
        entries: [],
        keepAtReceiving: false,
        damagedSlotId: '',
        scannedDamagedSlotCode: '',
      },
    })
    return {
      form,
      confirmOpen: true,
      confirm: mock.confirm,
      acceptFresh: mock.accept,
      isPending: false,
    }
  },
}))
vi.mock('../components/TransferWork', () => ({
  TransferWorkHeader: () => null,
  TransferReceiptCountCards: () => null,
  TransferReceivingDisposition: () => null,
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
  mock.compact = false
  mock.receiptError = false
  mock.receiptFlowVersion = 1
  mock.staging = false
  mock.start.mockResolvedValue({})
  mock.detailRefetch.mockImplementation(async () => ({
    data: mock.freshDetail,
    isError: mock.failedRefresh,
  }))
})
afterEach(cleanup)

describe('Receiving hands off to putaway', () => {
  it('autofills the configured receiving point and starts without requiring its scan', async () => {
    mock.compact = true
    mock.staging = true
    render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    await waitFor(() => expect(screen.getByText('Khu A / Điểm chờ nhận')).toBeInTheDocument())
    expect(screen.queryByLabelText('Quét/nhập mã vị trí nhận')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu nhận hàng' }))
    await waitFor(() =>
      expect(mock.start).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            receivingSlotId: '10000000-0000-4000-8000-000000000001',
            scannedSlotCode: undefined,
          }),
        })
      )
    )
  })
  it('loads receiving locations from compact warehouse context for flow 2', () => {
    mock.compact = true
    mock.receiptFlowVersion = 2
    render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    expect(mock.slotReads).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: execution.destinationWarehouseId }),
      true
    )
    expect(mock.detailReads.mock.calls.every(([id]) => id === null)).toBe(true)
  })
  it('does not open putaway when fresh flow 2 receipt keeps stock at receiving', async () => {
    mock.compact = true
    mock.receiptFlowVersion = 2
    mock.freshReceipt = {
      ...receiptFixture({ status: 'Received', receiptFlowVersion: 2 }),
      execution,
      keptAtReceiving: true,
    }
    render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    fireEvent.click(screen.getByText('Xác nhận kiểm hàng'))
    await waitFor(() => expect(mock.accept).toHaveBeenCalled())
    expect(mock.push).not.toHaveBeenCalled()
  })
  it('uses fresh compact receipt context without fetching full detail before navigation', async () => {
    mock.compact = true
    mock.freshReceipt = { ...receiptFixture({ status: 'AwaitingPutAway' }), execution }
    render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
    fireEvent.click(screen.getByText('Xác nhận kiểm hàng'))
    await waitFor(() => expect(mock.push).toHaveBeenCalled())
    expect(mock.detailRefetch).not.toHaveBeenCalled()
    expect(mock.detailReads.mock.calls.every(([id]) => id === null)).toBe(true)
  })
  it.each(['reassigned', 'wrong-warehouse', 'read-error', 'missing-context'])(
    'does not hand off using old compact context: %s',
    async (scenario) => {
      mock.compact = true
      mock.freshReceipt = {
        ...receiptFixture({ status: 'AwaitingPutAway' }),
        execution: { ...execution },
      }
      if (scenario === 'reassigned') mock.freshReceipt.execution!.putAwayAssigneeId = 'other'
      if (scenario === 'wrong-warehouse')
        mock.freshReceipt.execution!.destinationWarehouseId = 'other'
      if (scenario === 'read-error') mock.receiptError = true
      if (scenario === 'missing-context') mock.freshReceipt.execution = undefined
      render(<TransferReceiveTaskPage transferId={transfer.id} shipmentId={shipment.id} />)
      fireEvent.click(screen.getByText('Xác nhận kiểm hàng'))
      await waitFor(() => expect(mock.confirm).toHaveBeenCalled())
      if (mock.receiptError) await screen.findByText(/Phiếu đã được ghi nhận/)
      else await waitFor(() => expect(mock.accept).toHaveBeenCalled())
      expect(mock.push).not.toHaveBeenCalled()
    }
  )
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
