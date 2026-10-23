import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'
import { useStockIssueWorkflow } from './use-stock-issue-workflow'

const fixture = vi.hoisted(() => ({ release: vi.fn(), error: false }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: ['stock-issue-requests:assign-picker'] } }),
}))
vi.mock('@/features/staff/hooks/use-staff', () => ({
  useStaffListQuery: () => ({
    data: {
      items: [
        {
          id: 'staff-a',
          fullName: 'Nhân viên A',
          email: 'a@example.invalid',
          status: 'Active',
          assignedWarehouseIds: ['wh-a'],
        },
        {
          id: 'staff-b',
          fullName: 'Nhân viên B',
          email: 'b@example.invalid',
          status: 'Active',
          assignedWarehouseIds: ['wh-b'],
        },
        {
          id: 'staff-disabled',
          fullName: 'Ngừng hoạt động',
          status: 'Inactive',
          assignedWarehouseIds: ['wh-a'],
        },
      ],
    },
    isError: fixture.error,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('./use-stock-issue-requests', () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useRecordStockPickingMutation: mutation,
    useConfirmStockDispatchMutation: mutation,
    useAuthorizeStockDispatchMutation: mutation,
    useRemovePickDetailMutation: mutation,
    useCancelStockIssueRequestMutation: mutation,
    useAssignStockIssuePickerMutation: mutation,
    useReportStockIssuePickIssueMutation: mutation,
    useReleaseStockIssueRequestMutation: () => ({ mutateAsync: fixture.release, isPending: false }),
  }
})
const order: StockIssueRequestSummary = {
  id: 'order',
  stockIssueRequestCode: 'XK000001',
  warehouseId: 'wh-a',
  warehouseName: 'Kho A',
  stockRecipientId: 'recipient',
  stockRecipientName: 'Đơn vị nhận',
  recipientCode: 'REC',
  purpose: null,
  referenceCode: null,
  issueDate: null,
  note: null,
  recipientName: '',
  recipientPhone: '',
  recipientEmail: null,
  recipientAddress: '',
  status: 'Pending',
  createdAt: '',
  dispatchAuthorizedByUserId: null,
  dispatchAuthorizedAt: null,
  dispatchedAt: null,
  assignedStaffId: null,
  assignedStaffName: null,
  version: 'AQ==',
  items: [],
  attachments: [],
}
beforeEach(() => {
  vi.clearAllMocks()
  fixture.error = false
  fixture.release.mockResolvedValue({})
})

describe('outbound shared assignment workflow', () => {
  it('filters warehouse staff and preserves the release API contract', async () => {
    const { result } = renderHook(() => useStockIssueWorkflow())
    act(() => result.current.handlers.onReleaseForPicking(order))
    expect(result.current.pickerOptions.map((option) => option.id)).toEqual(['staff-a'])
    act(() => result.current.release.form.setValue('staffId', 'staff-a'))
    await act(async () => result.current.release.onConfirm())
    await waitFor(() => expect(fixture.release).toHaveBeenCalledTimes(1))
    expect(fixture.release.mock.lastCall?.[0]).toEqual({
      stockIssueRequestId: 'order',
      expectedVersion: 'AQ==',
      assignedStaffId: 'staff-a',
      commandId: expect.any(String),
    })
    expect(result.current.release.order).toBeNull()
  })

  it.each(['', 'staff-b'])(
    'does not send an unselected or cross-warehouse worker (%s)',
    async (staffId) => {
      const { result } = renderHook(() => useStockIssueWorkflow())
      act(() => result.current.handlers.onReleaseForPicking(order))
      act(() => result.current.release.form.setValue('staffId', staffId))
      await act(async () => result.current.release.onConfirm())
      expect(fixture.release).not.toHaveBeenCalled()
    }
  )

  it('retains the dialog and chosen worker after an API rejection', async () => {
    fixture.release.mockRejectedValue(new Error('conflict'))
    const { result } = renderHook(() => useStockIssueWorkflow())
    act(() => result.current.handlers.onReleaseForPicking(order))
    act(() => result.current.release.form.setValue('staffId', 'staff-a'))
    await act(async () => result.current.release.onConfirm())
    await waitFor(() => expect(fixture.release).toHaveBeenCalled())
    expect(result.current.release.order?.id).toBe('order')
    expect(result.current.release.form.getValues('staffId')).toBe('staff-a')
  })
})
