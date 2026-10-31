import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useReturnWork } from './use-return-work'
import type { ReturnWork } from '../types/return-work.types'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../services/return-work.service', () => ({ returnWorkService: { get: mocks.get } }))

const data: ReturnWork = {
  assignmentRequired: true,
  sourceDocumentId: 'source',
  documentVersion: 'AQ==',
  warehouseId: 'warehouse',
  referenceCode: 'THNCC000001',
  approved: true,
  taskId: 'task',
  taskVersion: 'Ag==',
  executionStatus: 'InProgress',
  assignedTo: 'staff',
  priority: 'Normal',
  dueAt: null,
  startedAt: '2026-10-31T00:00:00Z',
  assignedToName: 'Nhân viên',
  warehouseName: 'Kho A',
  canAssign: false,
  canManage: true,
  canComplete: true,
}

afterEach(() => vi.clearAllMocks())

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => useReturnWork(true, 'source'), { wrapper }) }
}

it('keeps the same command identity for retry, but changes it when physical intent changes', async () => {
  mocks.get.mockResolvedValue(data)
  const hook = setup()
  await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  const first = hook.result.current.proof({ quantity: 2 })
  expect(hook.result.current.proof({ quantity: 2 })).toEqual(first)
  expect(hook.result.current.proof({ quantity: 3 })?.commandId).not.toBe(first?.commandId)
  expect(first).toMatchObject({ taskId: 'task', taskVersion: 'Ag==', expectedVersion: 'AQ==' })
  hook.unmount()
})

it('fails closed before start and allows the explicit legacy capability without task proof', async () => {
  mocks.get.mockResolvedValue({ ...data, canComplete: false })
  const hook = setup()
  await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  expect(() => hook.result.current.proof({})).toThrow('Cần bắt đầu')
  act(() =>
    hook.client.setQueryData(['return-work', 'document', true, 'source'], {
      ...data,
      assignmentRequired: false,
    })
  )
  await waitFor(() => expect(hook.result.current.query.data?.assignmentRequired).toBe(false))
  expect(hook.result.current.proof({})).toBeUndefined()
  hook.unmount()
})

it('does not reuse a command identity after server versions change', async () => {
  mocks.get.mockResolvedValue(data)
  const hook = setup()
  await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  const first = hook.result.current.proof({ quantity: 2 })
  act(() =>
    hook.client.setQueryData(['return-work', 'document', true, 'source'], {
      ...data,
      taskVersion: 'Aw==',
    })
  )
  await waitFor(() => expect(hook.result.current.query.data?.taskVersion).toBe('Aw=='))
  expect(hook.result.current.proof({ quantity: 2 })?.commandId).not.toBe(first?.commandId)
  hook.unmount()
})
