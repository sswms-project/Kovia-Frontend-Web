import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import type { StockAlertParams } from '../schemas/stock-alert.schema'
import WarehouseOverviewPage from './WarehouseOverviewPage'

const warehouseId = '00000000-0000-0000-0000-000000000002'
const { state, alerts, overview, refresh, update } = vi.hoisted(() => ({
  state: {
    compact: true,
    tab: 'alerts',
    kind: 'below-minimum',
    warehouseId: '',
    invalidWarehouse: false,
    days: 5,
    expiredTotal: 7,
    denied: false,
    permissions: [] as string[],
  },
  alerts: vi.fn(),
  overview: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    data: { permissions: state.permissions },
    isPending: false,
    isError: false,
    error: null,
  }),
}))
vi.mock('../hooks/use-overview-navigation', () => ({
  useOverviewNavigation: () => ({
    warehouseId: state.warehouseId,
    invalidWarehouse: state.invalidWarehouse,
    expiringDays: state.days,
    kind: state.kind,
    tab: state.tab,
    updateLocation: update,
  }),
  useOverviewCompactLayout: () => ({ ref: { current: null }, compact: state.compact }),
}))
vi.mock('../hooks/use-stock-alerts', () => ({ useStockAlertsQuery: alerts }))
vi.mock('../hooks/use-warehouse-overview', () => ({
  useReportingWarehousesQuery: () => ({
    data: [{ id: warehouseId, name: 'Đà Nẵng' }],
    isSuccess: true,
    isPending: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWarehouseOverviewQuery: overview,
}))
vi.mock('../components/WarehouseOverview/WarehouseActivityChart', () => ({
  WarehouseActivityChart: () => <div>Biểu đồ QA</div>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, {
    compact: true,
    tab: 'alerts',
    kind: 'below-minimum',
    warehouseId: '',
    invalidWarehouse: false,
    days: 5,
    expiredTotal: 7,
    denied: false,
    permissions: [P.DASHBOARD_VIEW, P.INVENTORY_VIEW],
  })
  alerts.mockImplementation((params: StockAlertParams) => ({
    data: {
      kind: params.kind,
      generatedAt: '2026-10-17T12:00:00Z',
      appliedWarehouseIds: [warehouseId],
      configuredPolicyCount: 1,
      evaluationDate: '2026-10-17',
      timeBasis: 'UTC',
      expiringDays: state.days,
      totalCount: params.search ? 1 : params.kind === 'expired' ? state.expiredTotal : 25,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      items: [
        {
          warehouseId,
          warehouseName: 'Đà Nẵng',
          productId: '00000000-0000-0000-0000-000000000003',
          productName: 'Hàng QA',
          sku: 'SKU-QA',
          unit: 'Cái',
          availableQuantity: 2,
          thresholdQuantity: 10,
          difference: 8,
        },
      ],
    },
    isPending: false,
    isFetching: false,
    isError: state.denied,
    error: state.denied ? { statusCode: 403, message: 'Không còn quyền kho.' } : null,
    refetch: () => refresh(params.kind),
  }))
  overview.mockReturnValue({
    data: undefined,
    isPending: true,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })
})
afterEach(cleanup)

describe('warehouse overview orchestration', () => {
  it('lets the user select an urgent group directly from its visible count', async () => {
    render(<WarehouseOverviewPage />)
    await userEvent.click(screen.getByLabelText(/quá hạn sử dụng.*7/i))
    expect(update).toHaveBeenCalledWith({ alert: 'expired' })
  })

  it('applies a valid N-day setting through the URL without touching the expired-stock window', async () => {
    state.compact = false
    state.expiredTotal = 25
    state.kind = 'expiring'
    const user = userEvent.setup()
    render(<WarehouseOverviewPage />)
    await user.click(
      within(screen.getByRole('region', { name: 'Hàng hóa quá hạn sử dụng' })).getByRole('button', {
        name: 'Trang sau',
      })
    )
    await user.click(screen.getByRole('button', { name: 'Cài đặt số ngày sắp hết hạn' }))
    fireEvent.change(screen.getByLabelText('Số ngày trước hạn'), { target: { value: '30' } })
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ expiringDays: '30' }))
    expect(
      alerts.mock.calls.filter((call) => call[0].kind === 'expired').at(-1)?.[0].pageNumber
    ).toBe(2)
    expect(
      alerts.mock.calls
        .filter((call) => call[0].kind === 'expired')
        .every((call) => call[0].expiringDays === undefined)
    ).toBe(true)
  })

  it('loads all four totals on narrow screens while requesting one row for hidden groups', () => {
    render(<WarehouseOverviewPage />)
    expect(screen.getByLabelText(/quá hạn sử dụng.*7/i)).toBeInTheDocument()
    const enabled = alerts.mock.calls.slice(-5).filter((call) => call[1] === true)
    expect(enabled).toHaveLength(4)
    expect(enabled.filter((call) => call[0].pageSize === 1)).toHaveLength(3)
    expect(enabled.find((call) => call[0].kind === 'below-minimum')?.[0].pageSize).toBe(10)
    expect(overview.mock.calls.at(-1)?.[1]).toBe(false)
    expect(screen.getAllByRole('table')).toHaveLength(1)
  })
  it('renders four real panels in the wide layout without duplicate mobile tables', () => {
    state.compact = false
    render(<WarehouseOverviewPage />)
    expect(screen.getAllByRole('table')).toHaveLength(4)
    expect(screen.queryByRole('group', { name: 'Nhóm cảnh báo' })).not.toBeInTheDocument()
    expect(
      alerts.mock.calls.filter((call) => call[1] === true).every((call) => call[0].pageSize === 10)
    ).toBe(true)
  })
  it('refreshes only the requested panel, while the header refreshes all four', async () => {
    const user = userEvent.setup()
    render(<WarehouseOverviewPage />)
    await user.click(screen.getByRole('button', { name: 'Tải lại Khả dụng dưới mức tối thiểu' }))
    expect(refresh.mock.calls).toEqual([['below-minimum']])
    refresh.mockClear()
    await user.click(screen.getByRole('button', { name: 'Tải lại tổng quan' }))
    expect(refresh.mock.calls.map((call) => call[0])).toEqual([
      'below-minimum',
      'above-maximum',
      'expiring',
      'expired',
    ])
  })
  it('keeps dialogs scoped and applies search server-side without changing the preview total', async () => {
    const user = userEvent.setup()
    render(<WarehouseOverviewPage />)
    await user.click(screen.getByRole('button', { name: 'Xem tất cả' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Tất cả kho được phép')).toBeInTheDocument()
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Tìm trong toàn bộ cảnh báo' }),
      'SKU'
    )
    await waitFor(() =>
      expect(alerts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'SKU', pageNumber: 1 }),
        true,
        expect.any(String)
      )
    )
    expect(screen.getByLabelText(/dưới mức tối thiểu.*25/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
  it('does not fall back to all warehouses for an invalid or unavailable warehouse ID', () => {
    state.warehouseId = 'not-a-guid'
    state.invalidWarehouse = true
    render(<WarehouseOverviewPage />)
    expect(screen.getByText(/Mã kho trên đường dẫn không hợp lệ/)).toBeInTheDocument()
    expect(alerts.mock.calls.every((call) => call[1] === false)).toBe(true)
    expect(screen.queryByText('Hàng QA')).not.toBeInTheDocument()
  })
  it('hides retained cached data after 403 and does not resurrect it on switching tabs', () => {
    state.denied = true
    const view = render(<WarehouseOverviewPage />)
    expect(screen.getByText('Không còn quyền kho.')).toBeInTheDocument()
    expect(screen.queryByText('Hàng QA')).not.toBeInTheDocument()
    state.tab = 'activity'
    view.rerender(<WarehouseOverviewPage />)
    expect(screen.getByText('Không còn quyền kho.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('shows alerts without granting inventory navigation from a role name', () => {
    state.permissions = [P.DASHBOARD_VIEW]
    render(<WarehouseOverviewPage />)
    expect(screen.getByText('Hàng QA')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('cancels settings without changing N and rejects out-of-range values before applying', async () => {
    state.kind = 'expiring'
    const user = userEvent.setup()
    render(<WarehouseOverviewPage />)
    await user.click(screen.getByRole('button', { name: 'Cài đặt số ngày sắp hết hạn' }))
    fireEvent.change(screen.getByLabelText('Số ngày trước hạn'), { target: { value: '366' } })
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(await screen.findByText('Số ngày phải từ 1 đến 365.')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(update).not.toHaveBeenCalled()
  })
})
