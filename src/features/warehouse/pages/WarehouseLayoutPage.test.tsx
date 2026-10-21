import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { WarehouseDetailResponse, ZoneResponse } from '@/types/warehouse'
import { WarehouseOverview } from '../components/WarehouseDetailPage'
import { WarehouseLayoutPage } from './WarehouseLayoutPage'

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  zones: [] as ZoneResponse[],
  mutate: vi.fn(),
  fetching: false,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => 'WarehouseStaff' }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: mocks.permissions }, isFetching: false }),
}))
vi.mock('@/features/product/hooks/use-products', () => ({
  useUnitsQuery: () => ({ data: [], isPending: false }),
}))
vi.mock('@/hooks/use-excel-download', () => ({
  useExcelDownload: () => ({ mutate: mocks.mutate, isPending: false }),
}))
vi.mock('../hooks/use-warehouse', () => ({
  useWarehouseQuery: () => ({ data: { status: 'Active' }, isFetching: false }),
  useWarehouseLayoutQuery: () => ({ data: mocks.zones, isFetching: mocks.fetching }),
  ...Object.fromEntries(
    [
      'useCreateZoneMutation',
      'useUpdateZoneMutation',
      'useDeactivateZoneMutation',
      'useCreateRackMutation',
      'useUpdateRackMutation',
      'useDeactivateRackMutation',
      'useCreateSlotMutation',
      'useUpdateSlotMutation',
      'useDeactivateSlotMutation',
      'useReactivateZoneMutation',
      'useReactivateRackMutation',
      'useReactivateSlotMutation',
    ].map((name) => [name, () => ({ isPending: false, mutate: vi.fn() })])
  ),
}))

function renderPage() {
  return render(
    <TooltipProvider>
      <WarehouseLayoutPage warehouseId="warehouse-1" />
    </TooltipProvider>
  )
}

describe('warehouse location export', () => {
  beforeEach(() => {
    mocks.permissions = [P.WAREHOUSES_VIEW, P.LISTS_EXPORT]
    mocks.fetching = false
    mocks.mutate.mockReset()
    mocks.zones = [
      {
        id: 'zone-1',
        zoneCode: 'Z1',
        zoneName: 'Khu 1',
        status: 'Active',
        description: null,
        racks: [
          {
            id: 'rack-1',
            rackCode: 'A05',
            rackName: 'Kệ 05',
            status: 'Active',
            description: null,
            slots: [],
          },
        ],
      },
    ]
  })

  it('exports this warehouse including collapsed descendants without requiring edit permission', () => {
    renderPage()
    expect(screen.getByText('1 vị trí đang hiển thị')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm khu vực' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith({
      dataset: 'locations',
      filters: { warehouseId: 'warehouse-1' },
    })
  })

  it('uses the current search and lifecycle status without pagination or expanded node IDs', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Tìm vị trí vật tư, hàng hóa'), {
      target: { value: ' A05 ' },
    })
    fireEvent.change(screen.getByLabelText('Lọc trạng thái vị trí'), {
      target: { value: 'Active' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith({
      dataset: 'locations',
      filters: { warehouseId: 'warehouse-1', searchText: 'A05', lifecycleStatus: 'Active' },
    })
  })

  it.each([[P.WAREHOUSES_VIEW], [P.LISTS_EXPORT], []])(
    'requires both view and export permissions: %j',
    (...permissions) => {
      mocks.permissions = permissions
      renderPage()
      expect(screen.queryByRole('button', { name: 'Xuất Excel' })).not.toBeInTheDocument()
    }
  )

  it('disables export while refreshing and when no locations match', () => {
    mocks.fetching = true
    const view = renderPage()
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled()
    mocks.fetching = false
    view.rerender(
      <TooltipProvider>
        <WarehouseLayoutPage warehouseId="warehouse-1" />
      </TooltipProvider>
    )
    fireEvent.change(screen.getByLabelText('Tìm vị trí vật tư, hàng hóa'), {
      target: { value: 'not-found' },
    })
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('gives the warehouse overview its own theme-aware card surface', () => {
    const warehouse: WarehouseDetailResponse = {
      id: 'warehouse-1',
      warehouseCode: 'DN-01',
      warehouseName: 'Đà Nẵng',
      address: null,
      status: 'Active',
      createdAt: '2026-10-01T00:00:00Z',
      modifiedAt: null,
      zoneCount: 1,
    }
    const view = render(<WarehouseOverview warehouse={warehouse} />)
    expect(view.container.firstChild).toHaveClass('bg-card', 'text-card-foreground', 'border')
  })
})
