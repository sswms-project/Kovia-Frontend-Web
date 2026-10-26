import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UseFormReturn } from 'react-hook-form'
import type { CreateCycleCountFormValues } from '../schemas/cycle-count.schema'
import CreateCycleCountPage from './CreateCycleCountPage'
import type { CycleCountDetail } from '../types/cycle-count.types'

const state = vi.hoisted(() => ({
  mutate: vi.fn(),
  update: vi.fn(),
  suggestion: 'KK000001',
  push: vi.fn(),
  detail: undefined as CycleCountDetail | undefined,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }))
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useFetchAllInventoryMutation: () => ({}),
  useInventoryQuery: () => ({ data: { items: [] } }),
}))
vi.mock('@/features/product/hooks/use-products', () => ({
  useCategoriesQuery: () => ({ data: [] }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => ({ data: { items: [] } }),
  useWarehouseLayoutQuery: () => ({ data: [] }),
}))
vi.mock('../hooks/use-cycle-count', () => ({
  useCycleCountQuery: () => ({ data: state.detail }),
  useCycleCountAllowedActionsQuery: () => ({ data: { allowedActions: ['Update'] } }),
  useUpdateCycleCountMutation: () => ({ mutateAsync: state.update }),
  useCreateCycleCountMutation: () => ({ mutateAsync: state.mutate }),
  useCycleCountAssignableStaffQuery: () => ({ data: [] }),
  useNextCycleCountCodeQuery: (session: string) => ({
    data: session.endsWith(':0') ? state.suggestion : 'KK000002',
    isFetching: false,
    isError: false,
  }),
}))
vi.mock('../components/CreateCycleCountPage', () => ({
  CreateCycleCountForm: ({
    form,
    onCodeChange,
    onSubmit,
  }: {
    form: UseFormReturn<CreateCycleCountFormValues>
    onCodeChange: () => void
    onSubmit: (values: CreateCycleCountFormValues, mode: 'saveAndAdd') => Promise<void>
  }) => (
    <div>
      <input aria-label="Mã kiểm kê" {...form.register('code', { onChange: onCodeChange })} />
      <input aria-label="Hạn kiểm kê" {...form.register('dueDate')} />
      <button
        onClick={() =>
          void onSubmit({ ...form.getValues(), scheduledDate: '2026-10-25T08:00' }, 'saveAndAdd')
        }
      >
        Lưu và tạo tiếp
      </button>
    </div>
  ),
}))

function countFixture(): CycleCountDetail {
  return {
    id: 'count',
    code: 'KK-ORIGINAL',
    version: 'AQ==',
    warehouseId: 'warehouse',
    warehouseName: 'Kho A',
    zoneId: null,
    zoneName: null,
    status: 'Scheduled',
    scheduledDate: '2026-10-27T08:00:00+07:00',
    priority: 'Normal',
    dueAt: null,
    isBlindCount: true,
    recountRound: 0,
    assignedTo: 'staff',
    assignedToName: 'Staff',
    submittedBy: null,
    submittedAt: null,
    completedAt: null,
    createdAt: '2026-10-25T08:00:00Z',
    items: [],
    purpose: 'Mục đích cũ',
    dueDate: null,
    cancelledAt: null,
    cancelReason: null,
    createdByName: 'Manager',
    submittedByName: null,
    finalizedByName: null,
    finalizedAt: null,
    cancelledByName: null,
  }
}

describe('cycle count code suggestion sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.suggestion = 'KK000001'
    state.detail = undefined
    state.update.mockResolvedValue({})
    state.mutate.mockResolvedValue({ data: 'new-count' })
  })

  it('preserves manual edits and refreshes the suggestion only after creating the next form', async () => {
    const view = render(<CreateCycleCountPage />)
    const code = screen.getByLabelText('Mã kiểm kê')
    await waitFor(() => expect(code).toHaveValue('KK000001'))
    fireEvent.change(code, { target: { value: 'KK-CUSTOM' } })
    state.suggestion = 'KK000099'
    view.rerender(<CreateCycleCountPage />)
    expect(code).toHaveValue('KK-CUSTOM')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }))
    await waitFor(() =>
      expect(state.mutate).toHaveBeenCalledWith(expect.objectContaining({ code: 'KK-CUSTOM' }))
    )
    await waitFor(() => expect(code).toHaveValue('KK000002'))
    expect(state.push).not.toHaveBeenCalled()
  })

  it('keeps an intentionally empty code and lets the server generate it when saved', async () => {
    const view = render(<CreateCycleCountPage />)
    const code = screen.getByLabelText('Mã kiểm kê')
    await waitFor(() => expect(code).toHaveValue('KK000001'))
    fireEvent.change(code, { target: { value: '' } })
    state.suggestion = 'KK000099'
    view.rerender(<CreateCycleCountPage />)
    expect(code).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }))
    await waitFor(() =>
      expect(state.mutate).toHaveBeenCalledWith(expect.objectContaining({ code: undefined }))
    )
  })

  it('hydrates editing once and submits the version originally displayed without overwriting user edits', async () => {
    state.detail = countFixture()
    const view = render(<CreateCycleCountPage cycleCountId="count" />)
    await waitFor(() => expect(screen.getByLabelText('Mã kiểm kê')).toHaveValue('KK-ORIGINAL'))
    fireEvent.change(screen.getByLabelText('Mã kiểm kê'), { target: { value: 'KK-EDITED' } })
    state.detail = { ...state.detail, version: 'Ag==', code: 'KK-SERVER' }
    view.rerender(<CreateCycleCountPage cycleCountId="count" />)
    expect(screen.getByLabelText('Mã kiểm kê')).toHaveValue('KK-EDITED')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }))
    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'count',
          expectedVersion: 'AQ==',
          request: expect.objectContaining({ code: 'KK-EDITED', purpose: 'Mục đích cũ' }),
        })
      )
    )
    expect(state.mutate).not.toHaveBeenCalled()
    expect(state.push).toHaveBeenCalledWith('/inventory/cycle-counts/count')
  })
})

describe('editing count deadlines', () => {
  it.each([
    [null, '2026-10-28T11:00:00.1234567Z'],
    ['2026-10-29T16:59:59.999Z', '2026-10-28T11:00:00+07:00'],
    [null, null],
  ])('preserves dueDate=%s and dueAt=%s on an unrelated edit', async (dueDate, dueAt) => {
    state.update.mockClear()
    state.detail = countFixture()

    state.detail = { ...state.detail, dueDate, dueAt }
    render(<CreateCycleCountPage cycleCountId="count" />)
    await waitFor(() => expect(screen.getByLabelText('Mã kiểm kê')).toHaveValue('KK-ORIGINAL'))
    fireEvent.change(screen.getByLabelText('Mã kiểm kê'), { target: { value: 'KK-EDITED' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }))
    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({ dueDate, dueAt }),
        })
      )
    )
  })

  it('uses Vietnam end-of-day when the deadline is explicitly changed', async () => {
    state.update.mockClear()
    state.detail = countFixture()

    state.detail = { ...state.detail, dueDate: null, dueAt: '2026-10-28T11:00:00Z' }
    render(<CreateCycleCountPage cycleCountId="count" />)
    await waitFor(() => expect(screen.getByLabelText('Hạn kiểm kê')).toHaveValue('2026-10-28'))
    fireEvent.change(screen.getByLabelText('Hạn kiểm kê'), { target: { value: '2026-10-30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tạo tiếp' }))
    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            dueDate: '2026-10-30T23:59:59.999+07:00',
            dueAt: '2026-10-30T23:59:59.999+07:00',
          }),
        })
      )
    )
  })
})
