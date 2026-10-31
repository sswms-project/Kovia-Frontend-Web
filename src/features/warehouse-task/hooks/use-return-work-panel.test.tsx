import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { useReturnWorkPanel } from './use-return-work-panel'
import type { ReturnWork } from '../types/return-work.types'

const mocks = vi.hoisted(() => ({
  useWork: vi.fn(),
  assign: vi.fn(),
  staff: vi.fn(),
  action: vi.fn(),
}))
vi.mock('./use-return-work', () => ({ useReturnWork: mocks.useWork }))
vi.mock('../services/return-work.service', () => ({
  returnWorkService: { assign: mocks.assign, staff: mocks.staff, action: mocks.action },
}))

it('submits the assignment snapshot even when background data changes while the popup is open', async () => {
  const data: ReturnWork = {
    assignmentRequired: true,
    sourceDocumentId: 'source',
    documentVersion: 'AQ==',
    warehouseId: 'warehouse',
    warehouseName: 'Kho A',
    referenceCode: 'KTH000001',
    approved: true,
    taskId: 'task',
    taskVersion: 'Ag==',
    executionStatus: 'Queued',
    assignedTo: 'original-staff',
    assignedToName: 'Nhân viên',
    priority: 'Normal',
    dueAt: null,
    startedAt: null,
    canAssign: true,
    canManage: false,
    canComplete: false,
  }
  const refresh = vi.fn()
  mocks.useWork.mockReturnValue({ query: { data }, refresh })
  mocks.assign.mockResolvedValue(undefined)
  mocks.staff.mockResolvedValue([])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useReturnWorkPanel(false, 'source'), { wrapper })
  act(() => hook.result.current.openAssignment())
  mocks.useWork.mockReturnValue({
    query: {
      data: { ...data, documentVersion: 'Aw==', taskVersion: 'BA==', assignedTo: 'another-staff' },
    },
    refresh,
  })
  hook.rerender()
  await act(() =>
    hook.result.current.submitAssignment({
      staffId: 'new-staff',
      priority: 'Normal',
      dueAt: '',
      reason: 'Đổi ca',
    })
  )
  await waitFor(() => expect(mocks.assign).toHaveBeenCalledOnce())
  expect(mocks.assign).toHaveBeenCalledWith(
    false,
    'source',
    expect.objectContaining({
      documentVersion: 'AQ==',
      taskVersion: 'Ag==',
      expectedStaffId: 'original-staff',
    })
  )
  hook.unmount()
})

it('retries an uncertain Start with its original versions after live capabilities change', async () => {
  const data = {
    assignmentRequired: true,
    sourceDocumentId: 'source',
    approved: true,
    documentVersion: 'AQ==',
    taskId: 'task',
    taskVersion: 'Ag==',
    canManage: true,
    canAssign: false,
    executionStatus: 'Queued',
  }
  const refresh = vi.fn()
  mocks.useWork.mockReturnValue({ query: { data }, refresh })
  mocks.action.mockRejectedValueOnce({ statusCode: 500 }).mockResolvedValueOnce(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useReturnWorkPanel(false, 'source'), { wrapper })
  await act(() => hook.result.current.manage('Start'))
  expect(hook.result.current.actionCommand.isUncertain).toBe(true)
  const request = mocks.action.mock.calls[0]?.[2]
  mocks.useWork.mockReturnValue({
    query: {
      isError: true,
      data: { ...data, canManage: false, documentVersion: 'Aw==', taskVersion: 'BA==' },
    },
    refresh,
  })
  hook.rerender()
  await act(() => hook.result.current.retryAction())
  expect(mocks.action).toHaveBeenCalledTimes(2)
  expect(mocks.action.mock.calls[1]?.[2]).toEqual(request)
  expect(request).toMatchObject({ action: 'Start', documentVersion: 'AQ==', taskVersion: 'Ag==' })
  expect(hook.result.current.actionCommand.isLocked).toBe(false)
  hook.unmount()
})
