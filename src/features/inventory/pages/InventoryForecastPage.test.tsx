import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import InventoryForecastPage from './InventoryForecastPage'

const mocks = vi.hoisted(() => ({ me: vi.fn(), warehouses: vi.fn(), workspace: vi.fn() }))
vi.mock('@/features/auth/hooks/use-auth', () => ({ useMeQuery: mocks.me }))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: mocks.warehouses,
}))
vi.mock('../hooks/use-forecast-workspace', () => ({ useForecastWorkspace: mocks.workspace }))
vi.mock('../components/InventoryForecastPage', () => ({
  ForecastRunPanel: () => <div>Dự báo</div>,
}))

describe('forecast access', () => {
  it('does not load forecast data for inventory-only users', () => {
    mocks.me.mockReturnValue({ data: { permissions: [P.INVENTORY_VIEW] } })
    render(<InventoryForecastPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('không có quyền xem dự báo')
    expect(mocks.workspace).not.toHaveBeenCalled()
    expect(mocks.warehouses).not.toHaveBeenCalled()
  })

  it('shows forecasts to users with the dedicated permission', () => {
    mocks.me.mockReturnValue({ data: { permissions: [P.INVENTORY_FORECAST_VIEW] } })
    mocks.warehouses.mockReturnValue({ data: { items: [] } })
    mocks.workspace.mockReturnValue({})
    render(<InventoryForecastPage />)
    expect(screen.getByText('Dự báo')).toBeInTheDocument()
  })
})
