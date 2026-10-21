import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransferTaskAssignment } from './use-transfer-task-assignment'
import { buildShipment, buildTransfer } from '../utils/transfer-test-fixtures'
import { RECEIPT_LINE, RECEIPT_SLOT } from '../utils/transfer-receipt-test-fixtures'

const mock = vi.hoisted(() => ({
  assign: vi.fn(),
  read: vi.fn(),
  snapshot: vi.fn(),
  invalidate: vi.fn(),
  putEligible: true,
}))
vi.mock('@/features/warehouse-task/services/warehouse-task.service', () => ({
  warehouseTaskService: { assign: mock.assign },
}))
vi.mock('../services/transfer.service', () => ({
  transferService: { getTransfer: mock.read, getAssignmentSnapshot: mock.snapshot },
}))
vi.mock('./use-transfers', () => ({
  TRANSFER_MUTATION_KEY: ['transfers', 'write'],
  invalidateTransferQueries: mock.invalidate,
  refreshTransferAfterWrite: mock.invalidate,
}))
vi.mock('./use-transfer-receipt', () => ({
  useTransferAssignableStaffQuery: (_warehouse: string, type: string) => ({
    data:
      type === 'TransferPutAway' && !mock.putEligible
        ? []
        : [
            {
              id: RECEIPT_LINE,
              fullName: 'Nhân viên',
              email: 'qa@local',
              openReceivingTasks: 1,
              openPutAwayTasks: 2,
              openPickingTasks: 3,
              hasTaskInProgress: false,
            },
          ],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const shipment = buildShipment({
  status: 'Receiving',
  receiveTaskId: 'receive-task',
  receiveTaskVersion: 'AQ==',
  receiveAssigneeId: null,
  putAwayTaskId: 'putaway-task',
  putAwayTaskVersion: 'AQ==',
  putAwayAssigneeId: null,
  putAwayTaskStatus: 'Queued',
})
const transfer = buildTransfer({ shipments: [shipment] })
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.putEligible = true
  mock.read.mockResolvedValue({ data: transfer })
  mock.snapshot.mockResolvedValue({
    data: [
      {
        id: 'receive-task',
        taskType: 'TransferReceive',
        version: 'AQ==',
        assignee: null,
        priority: 'Normal',
        due: null,
      },
      {
        id: 'putaway-task',
        taskType: 'TransferPutAway',
        version: 'AQ==',
        assignee: null,
        priority: 'Normal',
        due: null,
      },
    ],
  })
  mock.assign.mockResolvedValue({})
  mock.invalidate.mockResolvedValue(undefined)
})
async function openBoth() {
  const hook = renderHook(() => useTransferTaskAssignment(transfer), { wrapper })
  act(() => {
    hook.result.current.open(shipment, 'receive')
    hook.result.current.form.setValue('staffId', RECEIPT_LINE)
  })
  return hook
}
describe('Giao hai việc độc lập', () => {
  it('defaults the shared destination assignment to both tasks', async () => {
    const { result } = await openBoth()
    expect(result.current.alsoPutAway).toBe(true)
    expect(result.current.destinationAssignmentScope).toBe('both')
    await act(async () => {
      result.current.onSubmit()
    })
    await waitFor(() => expect(result.current.target).toBeNull())
    expect(mock.assign.mock.calls.map((call) => call[0])).toEqual(['receive-task', 'putaway-task'])
    expect(mock.snapshot).toHaveBeenCalledExactlyOnceWith(
      transfer.id,
      shipment.id,
      transfer.destinationWarehouseId
    )
    expect(mock.read).not.toHaveBeenCalled()
  })

  it('can assign only put-away through the same dialog without changing the receiving worker', async () => {
    const { result } = await openBoth()
    act(() => {
      result.current.selectDestinationScope('putaway')
      result.current.form.setValue('staffId', RECEIPT_LINE)
    })
    expect(result.current.destinationAssignmentScope).toBe('putaway')
    expect(result.current.canChooseDestinationScope).toBe(true)
    await act(async () => {
      result.current.onSubmit()
    })
    await waitFor(() => expect(result.current.target).toBeNull())
    expect(mock.assign.mock.calls.map((call) => call[0])).toEqual(['putaway-task'])
  })

  it('does not include a put-away task that has not been created or is already completed', () => {
    const { result } = renderHook(() => useTransferTaskAssignment(transfer), { wrapper })
    act(() => result.current.open({ ...shipment, putAwayTaskId: null }, 'receive'))
    expect(result.current.alsoPutAway).toBe(false)
    act(() => result.current.open({ ...shipment, putAwayTaskStatus: 'Completed' }, 'receive'))
    expect(result.current.alsoPutAway).toBe(false)
  })

  it('reports each task and retries only the failed one', async () => {
    mock.assign
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ statusCode: 400, message: 'Chưa giao cất.' })
      .mockResolvedValueOnce({})
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.results.putaway).toBe('Chưa giao cất.'))
    expect(result.current.results.receive).toBe('Đã giao thành công.')
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.target).toBeNull())
    expect(mock.assign.mock.calls.map((call) => call[0])).toEqual([
      'receive-task',
      'putaway-task',
      'putaway-task',
    ])
  })
  it('intersects effective eligibility when assigning both tasks', async () => {
    mock.putEligible = false
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.form.getFieldState('staffId').error).toBeDefined())
    expect(mock.assign).not.toHaveBeenCalled()
  })
  it('blocks double click during read-before-write', async () => {
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.target).toBeNull())
    expect(mock.assign).toHaveBeenCalledTimes(2)
  })
  it('does not silently overwrite a changed assignment', async () => {
    mock.snapshot.mockResolvedValue({
      data: [
        {
          id: 'receive-task',
          taskType: 'TransferReceive',
          version: 'Ag==',
          assignee: RECEIPT_SLOT,
          priority: 'Normal',
          due: null,
        },
      ],
    })
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.needsVerify).toBe(true))
    expect(mock.assign).not.toHaveBeenCalled()
  })
  it('does not assign or replay a write when the scoped snapshot cannot be loaded', async () => {
    mock.snapshot.mockRejectedValue({
      statusCode: 403,
      message: 'Không được giao việc tại kho này.',
    })
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
    })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(mock.snapshot).toHaveBeenCalledTimes(1)
    expect(mock.assign).not.toHaveBeenCalled()
    expect(mock.read).not.toHaveBeenCalled()
  })
  it('requires explicit verification after an unknown response and never retries the successful first task', async () => {
    mock.assign
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({})
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.needsVerify).toBe(true))
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    expect(mock.assign).toHaveBeenCalledTimes(2)
    await act(async () => {
      await result.current.verify()
    })
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.target).toBeNull())
    expect(mock.assign.mock.calls.map((call) => call[0])).toEqual([
      'receive-task',
      'putaway-task',
      'putaway-task',
    ])
  })
})
