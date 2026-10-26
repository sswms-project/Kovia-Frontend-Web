import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SuppliersPage from '@/features/supplier/pages/SuppliersPage'
import StockRecipientPage from '@/features/stock-recipient/pages/StockRecipientPage'
import type {
  SupplierCreateDialog,
  SupplierDirectory,
} from '@/features/supplier/components/SuppliersPage'
import type {
  StockRecipientFormDialog,
  StockRecipientDirectory,
} from '@/features/stock-recipient/components/StockRecipientsPage'
import { BusinessCodeField } from './BusinessCodeField'

vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false, buttonProps: { isPending: false, onExport: vi.fn() } }),
}))

const fixtures = vi.hoisted(() => ({
  query: { data: { data: 'AUTO001' }, isFetching: false, isError: false },
  next: vi.fn(),
  create: vi.fn(),
}))
let recipientDialog: ComponentProps<typeof StockRecipientFormDialog>
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [] } }),
}))
vi.mock('@/features/supplier/hooks/use-suppliers', () => ({
  useSuppliersQuery: () => ({}),
  useNextSupplierCodeQuery: (enabled: boolean, session: string) => {
    fixtures.next(enabled, session)
    return fixtures.query
  },
  useCreateSupplierMutation: () => ({ mutateAsync: fixtures.create }),
  useUpdateSupplierMutation: () => ({}),
  useDeactivateSupplierMutation: () => ({}),
  useReactivateSupplierMutation: () => ({}),
}))
vi.mock('@/features/stock-recipient/hooks/use-stock-recipients', () => ({
  useStockRecipientsQuery: () => ({}),
  useNextStockRecipientCodeQuery: (enabled: boolean, session: string) => {
    fixtures.next(enabled, session)
    return fixtures.query
  },
  useCreateStockRecipientMutation: () => ({ mutateAsync: fixtures.create }),
  useUpdateStockRecipientMutation: () => ({}),
  useChangeStockRecipientStatusMutation: () => ({}),
}))
vi.mock('@/features/supplier/components/SuppliersPage', () => ({
  SupplierDirectory: ({ onCreate }: ComponentProps<typeof SupplierDirectory>) => (
    <button onClick={onCreate}>Thêm</button>
  ),
  SupplierCreateDialog: ({
    open,
    form,
    onCodeChange,
    onOpenChange,
  }: ComponentProps<typeof SupplierCreateDialog>) =>
    open ? (
      <>
        <BusinessCodeField
          label="Mã"
          inputProps={{
            id: 'supplier-code',
            ...form.register('supplierCode', { onChange: onCodeChange }),
          }}
        />
        <button onClick={() => onOpenChange(false)}>Đóng</button>
      </>
    ) : null,
  SupplierEditDialog: () => null,
  SupplierDeactivateDialog: () => null,
  SupplierReactivateDialog: () => null,
}))
vi.mock('@/features/stock-recipient/components/StockRecipientsPage', () => ({
  StockRecipientDirectory: ({ onCreate }: ComponentProps<typeof StockRecipientDirectory>) => (
    <button onClick={onCreate}>Thêm</button>
  ),
  StockRecipientFormDialog: (props: ComponentProps<typeof StockRecipientFormDialog>) => {
    recipientDialog = props
    return props.open ? (
      <>
        <BusinessCodeField
          label="Mã"
          inputProps={{
            id: 'customer-code',
            ...props.form.register('recipientCode', { onChange: props.onCodeChange }),
          }}
        />
        <button onClick={() => props.onOpenChange(false)}>Đóng</button>
      </>
    ) : null
  },
}))
vi.mock('@/components/operations/StatusChangeDialog', () => ({ StatusChangeDialog: () => null }))

beforeEach(() => {
  vi.clearAllMocks()
  fixtures.query = { data: { data: 'AUTO001' }, isFetching: false, isError: false }
  fixtures.create.mockResolvedValue({})
})
afterEach(cleanup)

describe.each([
  ['supplier', SuppliersPage],
  ['customer', StockRecipientPage],
] as const)('%s create orchestration', (_name, Page) => {
  it('keeps intentional clears and starts a fresh suggestion session on reopen', async () => {
    const user = userEvent.setup()
    const page = render(<Page />)
    expect(fixtures.next).toHaveBeenLastCalledWith(false, expect.any(String))
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    await waitFor(() => expect(screen.getByLabelText('Mã')).toHaveValue('AUTO001'))
    const firstSession = fixtures.next.mock.lastCall?.[1]
    await user.clear(screen.getByLabelText('Mã'))
    fixtures.query = { ...fixtures.query, data: { data: 'REFETCH002' } }
    page.rerender(<Page />)
    expect(screen.getByLabelText('Mã')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    await waitFor(() => expect(screen.getByLabelText('Mã')).toHaveValue('REFETCH002'))
    expect(fixtures.next.mock.lastCall?.[1]).not.toBe(firstSession)
  })
})

it('customer save-and-add resets before the next response and preserves new user input', async () => {
  const user = userEvent.setup()
  const page = render(<StockRecipientPage />)
  await user.click(screen.getByRole('button', { name: 'Thêm' }))
  const firstSession = fixtures.next.mock.lastCall?.[1]
  fixtures.query = { ...fixtures.query, isFetching: true }
  page.rerender(<StockRecipientPage />)
  await act(async () => recipientDialog.onSubmitAndAdd?.(recipientDialog.form.getValues()))
  await waitFor(() => expect(screen.getByLabelText('Mã')).toHaveValue(''))
  expect(fixtures.next.mock.lastCall?.[1]).not.toBe(firstSession)
  await user.type(screen.getByLabelText('Mã'), 'MANUAL003')
  fixtures.query = { data: { data: 'LATE003' }, isFetching: false, isError: false }
  page.rerender(<StockRecipientPage />)
  expect(screen.getByLabelText('Mã')).toHaveValue('MANUAL003')
  expect(fixtures.create).toHaveBeenCalledTimes(1)
})
