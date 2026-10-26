import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import InventoryReservationsPage from './InventoryReservationsPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [] } }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => ({
    data: { items: [{ id: 'warehouse', warehouseCode: 'WH', warehouseName: 'Kho QA' }] },
  }),
}))
vi.mock('@/features/inbound-request/hooks/use-inbound-requests', () => ({
  useProductOptionsQuery: () => ({
    data: { items: [{ id: 'product', sku: 'SKU', productName: 'Hàng QA' }] },
  }),
}))
vi.mock('../hooks/use-inventory', () => ({
  useInventoryReservationsQuery: () => ({ data: { items: [], totalCount: 0 } }),
}))

it('resets a status-only filter and also clears warehouse and product filters', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InventoryReservationsPage />
    </QueryClientProvider>
  )
  const reset = screen.getByRole('button', { name: /^Đặt lại$/ })
  expect(reset).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'Released' } })
  expect(reset).toBeEnabled()
  fireEvent.click(reset)
  expect(screen.getByLabelText('Trạng thái')).toHaveValue('Active')
  expect(reset).toBeDisabled()

  fireEvent.change(screen.getByLabelText('Kho'), { target: { value: 'warehouse' } })
  fireEvent.change(screen.getByLabelText('Sản phẩm'), { target: { value: 'product' } })
  fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'Consumed' } })
  fireEvent.click(reset)
  expect(screen.getByLabelText('Kho')).toHaveValue('')
  expect(screen.getByLabelText('Sản phẩm')).toHaveValue('')
  expect(screen.getByLabelText('Trạng thái')).toHaveValue('Active')
  expect(reset).toBeDisabled()
})
