import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import {
  InventoryFiltersProvider,
  useInventoryFilter,
} from '@/features/inventory/hooks/use-inventory-filter'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import {
  useInventoryAnomaliesQuery,
  useInventoryAnomalySummaryQuery,
} from '../hooks/use-inventory-anomalies'
import InventoryAnomaliesPage from './InventoryAnomaliesPage'

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [P.INVENTORY_ANOMALIES_VIEW] } }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({ useWarehousesQuery: vi.fn() }))
vi.mock('../hooks/use-inventory-anomalies', () => ({
  useInventoryAnomaliesQuery: vi.fn(() => ({})),
  useInventoryAnomalySummaryQuery: vi.fn(() => ({})),
  useStartAnomalyScanMutation: () => ({}),
  useReviewInventoryAnomalyMutation: () => ({}),
}))
vi.mock('../components/InventoryAnomaliesPage', () => ({
  InventoryAnomalyWorkspace: ({ warehouseId }: { warehouseId: string }) => (
    <div>{warehouseId || 'Chọn kho'}</div>
  ),
}))

function InventoryWorkspace() {
  const [warehouseId, setWarehouseId] = useInventoryFilter<string>('warehouse', 'read-only')
  return (
    <>
      <output aria-label="Kho dùng chung">{warehouseId}</output>
      <button type="button" onClick={() => setWarehouseId('read-only')}>
        Chọn kho chỉ xem
      </button>
      <button type="button" onClick={() => setWarehouseId('assigned')}>
        Chọn kho được phân công
      </button>
      <InventoryAnomaliesPage />
    </>
  )
}

it('only loads anomaly data for a warehouse in the allowed list', () => {
  vi.mocked(useWarehousesQuery).mockReturnValue({
    data: { items: [{ id: 'assigned', warehouseCode: 'DN', warehouseName: 'Đà Nẵng' }] },
  } as ReturnType<typeof useWarehousesQuery>)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InventoryFiltersProvider>
        <InventoryWorkspace />
      </InventoryFiltersProvider>
    </QueryClientProvider>
  )

  fireEvent.click(screen.getByRole('button', { name: 'Chọn kho chỉ xem' }))
  expect(useInventoryAnomalySummaryQuery).toHaveBeenLastCalledWith('', false)
  expect(useInventoryAnomaliesQuery).toHaveBeenLastCalledWith(
    expect.objectContaining({ warehouseId: '' }),
    false
  )
  expect(screen.getByText('Chọn kho')).toBeInTheDocument()
  expect(screen.getByLabelText('Kho dùng chung')).toHaveTextContent('read-only')
  fireEvent.click(screen.getByRole('button', { name: 'Chọn kho được phân công' }))
  expect(useInventoryAnomalySummaryQuery).toHaveBeenLastCalledWith('assigned', true)
  expect(useInventoryAnomaliesQuery).toHaveBeenLastCalledWith(
    expect.objectContaining({ warehouseId: 'assigned' }),
    true
  )
})
