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
  invalidate: vi.fn(),
  putEligible: true,
}))
vi.mock('@/features/warehouse-task/services/warehouse-task.service', () => ({
  warehouseTaskService: { assign: mock.assign },
}))
vi.mock('../services/transfer.service', () => ({ transferService: { getTransfer: mock.read } }))
vi.mock('./use-transfers', () => ({
  TRANSFER_MUTATION_KEY: ['transfers', 'write'],
  invalidateTransferQueries: mock.invalidate,
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
  mock.assign.mockResolvedValue({})
  mock.invalidate.mockResolvedValue(undefined)
})
async function openBoth() {
  const hook = renderHook(() => useTransferTaskAssignment(transfer), { wrapper })
  act(() => {
    hook.result.current.open(shipment, 'receive')
    hook.result.current.setAlsoPutAway(true)
    hook.result.current.form.setValue('staffId', RECEIPT_LINE)
  })
  return hook
}
describe('Giao hai việc độc lập', () => {
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
    mock.read.mockResolvedValue({
      data: buildTransfer({
        shipments: [{ ...shipment, receiveTaskVersion: 'Ag==', receiveAssigneeId: RECEIPT_SLOT }],
      }),
    })
    const { result } = await openBoth()
    await act(async () => {
      result.current.onSubmit()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.needsVerify).toBe(true))
    expect(mock.assign).not.toHaveBeenCalled()
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
