import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useTransferTaskAssignment } from './use-transfer-task-assignment'
import { buildShipment, buildTransfer } from '../utils/transfer-test-fixtures'
import type { TransferAssignmentTask } from '../types/transfer-receipt.types'

const mocks = vi.hoisted(() => ({
  combined: vi.fn(),
  single: vi.fn(),
  snapshot: vi.fn(),
  fresh: vi.fn(),
}))
const staffId = '10000000-0000-4000-8000-000000000003'
const shipment = buildShipment({
  status: 'InTransit',
  receiveTaskId: 'receive',
  receiveTaskVersion: 'r1',
  receiveTaskStatus: 'Queued',
  putAwayTaskId: 'putaway',
  putAwayTaskVersion: 'p1',
  putAwayTaskStatus: 'Queued',
})
const transfer = buildTransfer({ shipments: [shipment] })
const rows: TransferAssignmentTask[] = [
  {
    id: 'receive',
    taskType: 'TransferReceive',
    version: 'r1',
    assignee: null,
    priority: 'Normal',
    due: null,
  },
  {
    id: 'putaway',
    taskType: 'TransferPutAway',
    version: 'p1',
    assignee: null,
    priority: 'Normal',
    due: null,
  },
]
vi.mock('../services/transfer.service', () => ({
  transferService: {
    assignDestinationWorkflow: mocks.combined,
    getAssignmentSnapshot: mocks.snapshot,
    getTransfer: mocks.fresh,
  },
}))
vi.mock('@/features/warehouse-task/services/warehouse-task.service', () => ({
  warehouseTaskService: { assign: mocks.single },
}))
vi.mock('./use-transfer-receipt', () => ({
  useTransferAssignableStaffQuery: () => ({ data: [{ id: staffId }], isError: false }),
}))
vi.mock('./use-transfers', () => ({
  TRANSFER_MUTATION_KEY: ['transfer-write'],
  invalidateTransferQueries: vi.fn().mockResolvedValue(undefined),
  refreshTransferAfterWrite: vi.fn().mockResolvedValue(undefined),
}))
const clients: QueryClient[] = []
beforeEach(() => {
  vi.clearAllMocks()
  mocks.snapshot.mockResolvedValue({ data: rows })
  mocks.combined.mockResolvedValue({})
  mocks.single.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
})
function setup(both = true) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  clients.push(client)
  const result = renderHook(() => useTransferTaskAssignment(transfer), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }).result
  act(() => {
    result.current.open(shipment, 'receive', both)
  })
  act(() => {
    result.current.form.setValue('staffId', staffId)
  })
  return result
}
it('assigns both phases in one atomic request with both concurrency versions', async () => {
  const result = setup()
  act(() => result.current.onSubmit())
  await waitFor(() => expect(mocks.combined).toHaveBeenCalledTimes(1))
  expect(mocks.combined).toHaveBeenCalledWith(
    transfer.id,
    shipment.id,
    expect.objectContaining({
      staffId,
      receiveVersion: 'r1',
      putAwayVersion: 'p1',
      expectedReceiveStaffId: null,
      expectedPutAwayStaffId: null,
    })
  )
  expect(mocks.single).not.toHaveBeenCalled()
  await waitFor(() => expect(result.current.target).toBeNull())
})
it('keeps receiving-only assignments on the existing endpoint', async () => {
  const result = setup(false)
  act(() => result.current.onSubmit())
  await waitFor(() => expect(mocks.single).toHaveBeenCalledTimes(1))
  expect(mocks.combined).not.toHaveBeenCalled()
})
it('does not assign either phase if the companion changed since opening the dialog', async () => {
  mocks.snapshot.mockResolvedValue({ data: [rows[0], { ...rows[1], version: 'p2' }] })
  const result = setup()
  act(() => result.current.onSubmit())
  await waitFor(() => expect(result.current.needsVerify).toBe(true))
  expect(mocks.single).not.toHaveBeenCalled()
  expect(mocks.combined).not.toHaveBeenCalled()
})
it('verifies both phases after a lost response and avoids sending the assignment again', async () => {
  mocks.combined.mockRejectedValueOnce(new Error('Network Error'))
  mocks.fresh.mockResolvedValue({
    data: buildTransfer({
      shipments: [
        buildShipment({
          ...shipment,
          receiveAssigneeId: staffId,
          putAwayAssigneeId: staffId,
          receiveTaskPriority: 'Normal',
          putAwayTaskPriority: 'Normal',
          receiveTaskDueAt: null,
          putAwayTaskDueAt: null,
        }),
      ],
    }),
  })
  const result = setup()
  act(() => result.current.onSubmit())
  await waitFor(() => expect(result.current.needsVerify).toBe(true))
  await act(() => result.current.verify())
  act(() => result.current.onSubmit())
  await waitFor(() => expect(result.current.target).toBeNull())
  expect(mocks.combined).toHaveBeenCalledTimes(1)
  expect(mocks.single).not.toHaveBeenCalled()
})
