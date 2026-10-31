import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { useApproveGoodsReturnRequestMutation } from '@/features/stock-issue/hooks/use-stock-issue-requests'
import { useReturnWork } from './use-return-work'
import type { ReturnWork } from '../types/return-work.types'

const mocks = vi.hoisted(() => ({ approve: vi.fn(), get: vi.fn() }))
vi.mock('@/features/stock-issue/services/stock-issue.service', () => ({
  stockIssueService: { approveGoodsReturnRequest: mocks.approve },
}))
vi.mock('../services/return-work.service', () => ({ returnWorkService: { get: mocks.get } }))

it('makes assignment available immediately after approval without remounting the document', async () => {
  let server: ReturnWork = {
    assignmentRequired: true,
    sourceDocumentId: 'source',
    documentVersion: 'AQ==',
    warehouseId: 'warehouse',
    warehouseName: 'Kho A',
    referenceCode: 'KTH000001',
    approved: false,
    taskId: null,
    taskVersion: null,
    executionStatus: null,
    assignedTo: null,
    assignedToName: null,
    priority: null,
    dueAt: null,
    startedAt: null,
    canAssign: false,
    canManage: false,
    canComplete: false,
  }
  mocks.get.mockImplementation(async () => server)
  mocks.approve.mockImplementation(async () => {
    server = { ...server, approved: true, canAssign: true }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    () => ({
      work: useReturnWork(false, 'source'),
      approval: useApproveGoodsReturnRequestMutation(),
    }),
    { wrapper }
  )
  await waitFor(() => expect(hook.result.current.work.query.isSuccess).toBe(true))
  expect(hook.result.current.work.query.data?.canAssign).toBe(false)
  await act(() => hook.result.current.approval.mutateAsync({ goodsReturnRequestId: 'source' }))
  await waitFor(() => expect(hook.result.current.work.query.data?.canAssign).toBe(true))
  hook.unmount()
})
