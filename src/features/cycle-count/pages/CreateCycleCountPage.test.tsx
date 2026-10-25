import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UseFormReturn } from 'react-hook-form'
import type { CreateCycleCountFormValues } from '../schemas/cycle-count.schema'
import CreateCycleCountPage from './CreateCycleCountPage'

const state = vi.hoisted(() => ({ mutate: vi.fn(), suggestion: 'KK000001', push: vi.fn() }))
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

describe('cycle count code suggestion sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.suggestion = 'KK000001'
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
})
