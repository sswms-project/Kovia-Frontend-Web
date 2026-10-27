import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { WarehouseDetailPage } from './WarehouseDetailPage'

const state = vi.hoisted(() => ({ permissions: [] as string[] }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: state.permissions } }),
}))
vi.mock('../hooks/use-warehouse', () => ({
  useWarehouseQuery: () => ({
    data: {
      id: 'warehouse',
      warehouseCode: 'DN-01',
      warehouseName: 'Đà Nẵng',
      address: '',
      createdAt: '2026-10-27T00:00:00Z',
      modifiedAt: null,
      zoneCount: 1,
      status: 'Active',
    },
  }),
  useWarehouseLayoutQuery: () => ({
    data: [
      {
        id: 'zone',
        zoneCode: 'CL',
        zoneName: 'Khu vực cách ly',
        status: 'Active',
        rowVersion: 'AQ==',
        isDefaultIsolationPoint: true,
        racks: [
          {
            id: 'rack',
            rackCode: 'CACH-LY-01',
            rackName: 'Điểm cách ly 01',
            status: 'Active',
            storageMode: 'RackLevel',
            defaultSlotId: 'technical-slot',
            isIsolationPoint: true,
            slots: [],
          },
        ],
      },
    ],
    isFetching: false,
    isError: false,
  }),
  useCreateZoneMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateZoneMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
beforeEach(() => {
  state.permissions = [P.WAREHOUSES_CONFIGURE_LAYOUT]
})
afterEach(cleanup)

it('shows the configured rack-level isolation point even though its technical slot is hidden', () => {
  render(<WarehouseDetailPage warehouseId="warehouse" />)
  expect(screen.getByText('Khu vực cách ly')).toBeVisible()
  expect(screen.getByText('Khu CL - Khu vực cách ly / CACH-LY-01 · Mặc định')).toBeVisible()
  expect(screen.queryByText('Chưa cấu hình')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cấu hình', exact: true }))
  expect(screen.getByRole('heading', { name: 'Cấu hình khu vực cách ly' })).toBeVisible()
})

it('keeps isolation information visible without granting configuration access', () => {
  state.permissions = []
  render(<WarehouseDetailPage warehouseId="warehouse" />)
  expect(screen.getByText('Khu CL - Khu vực cách ly / CACH-LY-01 · Mặc định')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Cấu hình', exact: true })).not.toBeInTheDocument()
})
