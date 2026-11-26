import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LowStockAlertsPage from './LowStockAlertsPage'
const mocks = vi.hoisted(() => ({ status: 500, retry: vi.fn() }))
vi.mock('../hooks/use-low-stock-alerts', async () => {
  const { P } = await import('@/config/permissionCodes')
  return {
    useLowStockAlerts: () => ({
      searchInput: '',
      setSearchInput: vi.fn(),
      filters: { statusFilter: 'Active', pageNumber: 1, pageSize: 20 },
      list: {
        isSuccess: false,
        isPending: false,
        isError: true,
        error: { statusCode: mocks.status, message: 'Lỗi kiểm thử' },
        refetch: mocks.retry,
      },
      me: { isPending: false, isError: false },
      permissions: [P.INVENTORY_VIEW],
      canView: true,
      enabled: true,
      scope: 'qa',
      alertId: '',
      validationError: null,
      update: vi.fn(),
      reset: vi.fn(),
      detail: {},
      acknowledge: { mutate: vi.fn(), isPending: false },
    }),
  }
})
vi.mock('../components/InventoryWorkspaceNavigation', () => ({
  InventoryWorkspaceNavigation: () => <nav>Tabs</nav>,
}))
vi.mock('../components/LowStockAlertsPage/LowStockWarehouseSelect', () => ({
  LowStockWarehouseSelect: () => <input aria-label="Kho" />,
}))
afterEach(cleanup)
describe('alert page unavailable data', () => {
  it.each([401, 403, 500])(
    'does not invent a zero total or pagination after error %s',
    (status) => {
      mocks.status = status
      render(<LowStockAlertsPage />)
      expect(screen.queryByText(/Tổng số/)).not.toBeInTheDocument()
      expect(screen.queryByRole('combobox', { name: 'Số dòng mỗi trang' })).not.toBeInTheDocument()
      expect(
        screen.getByText('Chưa có số liệu tổng vì dữ liệu chưa tải thành công.')
      ).toBeInTheDocument()
      if (status === 401) {
        expect(screen.getByRole('link', { name: 'Đăng nhập lại' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
      }
    }
  )
})
