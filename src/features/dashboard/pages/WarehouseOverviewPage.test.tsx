import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import type { StockAlertParams } from '../schemas/stock-alert.schema'
import WarehouseOverviewPage from './WarehouseOverviewPage'
import { defaultActivityPeriod } from '../schemas/activity-period.schema'

const warehouseId = '00000000-0000-0000-0000-000000000002'
const { state, alerts, overview, activity, refresh, update, meRefresh, optionsRefresh } =
  vi.hoisted(() => ({
    state: {
      compact: true,
      optionsPending: false,
      tab: 'alerts',
      activityFrom: '2026-10-01',
      activityTo: '2026-10-31',
      kind: 'below-minimum',
      warehouseId: '',
      invalidWarehouse: false,
      days: 5,
      expiredTotal: 7,
      denied: false,
      deniedKind: '',
      meError: false,
      permissions: [] as string[],
    },
    alerts: vi.fn(),
    overview: vi.fn(),
    activity: vi.fn(),
    refresh: vi.fn(),
    update: vi.fn(),
    meRefresh: vi.fn(),
    optionsRefresh: vi.fn(),
  }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    data: { permissions: state.permissions },
    isPending: false,
    isError: state.meError,
    error: state.meError ? { statusCode: 500, message: 'Không xác minh được phiên.' } : null,
    refetch: meRefresh,
  }),
}))
vi.mock('../hooks/use-overview-navigation', () => ({
  useOverviewNavigation: () => ({
    warehouseId: state.warehouseId,
    invalidWarehouse: state.invalidWarehouse,
    expiringDays: state.days,
    kind: state.kind,
    tab: state.tab,
    activityPeriod: defaultActivityPeriod(new Date('2026-10-18T10:00:00Z')),
    activityRange: { dateFrom: state.activityFrom, dateTo: state.activityTo },
    updateLocation: update,
  }),
  useOverviewCompactLayout: () => ({ ref: { current: null }, compact: state.compact }),
}))
vi.mock('../hooks/use-stock-alerts', () => ({ useStockAlertsQuery: alerts }))
vi.mock('../hooks/use-warehouse-overview', () => ({
  useReportingWarehousesQuery: () => ({
    data: [{ id: warehouseId, name: 'Đà Nẵng' }],
    isSuccess: !state.optionsPending,
    isPending: state.optionsPending,
    isFetching: false,
    error: null,
    refetch: optionsRefresh,
  }),
  useWarehouseOverviewQuery: overview,
  useWarehouseActivityQuery: activity,
}))
vi.mock('../components/WarehouseOverview/WarehouseActivityChart', () => ({
  WarehouseActivityChart: ({ periodFilter }: { periodFilter?: ReactNode }) => (
    <div>Biểu đồ QA{periodFilter}</div>
  ),
}))

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  vi.clearAllMocks()
  Object.assign(state, {
    compact: true,
    optionsPending: false,
    tab: 'alerts',
    activityFrom: '2026-10-01',
    activityTo: '2026-10-31',
    kind: 'below-minimum',
    warehouseId: '',
    invalidWarehouse: false,
    days: 5,
    expiredTotal: 7,
    denied: false,
    deniedKind: '',
    meError: false,
    permissions: [P.DASHBOARD_VIEW, P.INVENTORY_VIEW],
  })
  refresh.mockReturnValue({ isSuccess: true })
  meRefresh.mockResolvedValue({ isSuccess: true })
  optionsRefresh.mockResolvedValue({ isSuccess: true })
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
    isError: state.denied && (!state.deniedKind || state.deniedKind === params.kind),
    error:
      state.denied && (!state.deniedKind || state.deniedKind === params.kind)
        ? { statusCode: 403, message: 'Không còn quyền kho.' }
        : null,
    refetch: () => refresh(params.kind),
  }))
  overview.mockReturnValue({
    data: undefined,
    isPending: true,
    isFetching: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({ isSuccess: true }),
  })
  activity.mockReturnValue({
    data: undefined,
    isPending: true,
    isFetching: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({ isSuccess: true }),
  })
})
afterEach(cleanup)

describe('warehouse overview orchestration', () => {
  it('shows only placeholders while resolving warehouses, and hides them on access errors', () => {
    state.tab = 'activity'
    state.optionsPending = true
    const view = render(<WarehouseOverviewPage />)
    expect(screen.getByRole('status', { name: 'Đang tải chỉ số vận hành' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Xem chi tiết/ })).not.toBeInTheDocument()
    state.meError = true
    view.rerender(<WarehouseOverviewPage />)
    expect(
      screen.queryByRole('status', { name: 'Đang tải chỉ số vận hành' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Không xác minh được phiên.')
  })

  it('changes only the activity query range and preserves the current workspace during chart loading', () => {
    state.tab = 'activity'
    state.compact = false
    overview.mockReturnValue({
      data: {
        stockedSkuCount: 13,
        lowStockCount: 7,
        pendingInboundRequests: 16,
        pendingGoodsReceipts: 7,
        pendingStockIssues: 5,
        pendingTransfers: 0,
        pendingCounts: 0,
        overdueTasks: 4,
        unassignedTasks: 3,
        reservedSkuCount: 4,
        heldSkuCount: 2,
        activeSlots: 61,
        occupiedActiveSlots: 20,
        inactiveSlotsWithStock: 0,
      },
      isPending: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    const view = render(<WarehouseOverviewPage />)
    const currentRange = overview.mock.calls.at(-1)?.[3]
    overview.mockClear()
    activity.mockClear()
    state.activityFrom = '2026-01-01'
    state.activityTo = '2026-12-31'
    view.rerender(<WarehouseOverviewPage />)
    expect(overview.mock.calls.at(-1)?.[3]).toEqual(currentRange)
    expect(activity.mock.calls.at(-1)?.[3]).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    })
    expect(screen.getByRole('region', { name: 'Chỉ số hiện tại' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tải lại tổng quan' })).toBeEnabled()
  })
  it('keeps the title screen-reader-only and places tabs beside warehouse controls', () => {
    render(<WarehouseOverviewPage />)
    const heading = screen.getByRole('heading', { name: 'Tổng quan kho', level: 1 })
    expect(heading).toHaveClass('sr-only')
    const toolbar = heading.closest('header')!
    expect(toolbar).toHaveClass('shrink-0', 'flex-wrap')
    expect(within(toolbar).getByRole('tablist')).toBeInTheDocument()
    expect(within(toolbar).getByLabelText('Phạm vi kho')).toBeInTheDocument()
    expect(within(toolbar).getByRole('button', { name: 'Tải lại tổng quan' })).toBeInTheDocument()
    for (const name of ['Cảnh báo tồn kho', 'Hoạt động kho']) {
      expect(screen.getByRole('tab', { name })).toHaveClass(
        'font-sans',
        'text-sm',
        'font-medium',
        'data-[state=active]:font-bold'
      )
    }
  })

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
  it('changes each panel page size independently, resets its page and keeps the shared 10/20/50 choices', async () => {
    state.compact = false
    const user = userEvent.setup()
    render(<WarehouseOverviewPage />)
    const panel = within(screen.getByRole('region', { name: 'Khả dụng dưới mức tối thiểu' }))
    await user.click(panel.getByRole('button', { name: 'Trang sau' }))
    expect(
      alerts.mock.calls.filter((call) => call[0].kind === 'below-minimum' && call[1]).at(-1)?.[0]
        .pageNumber
    ).toBe(2)
    for (const size of [20, 50, 10]) {
      fireEvent.keyDown(panel.getByRole('combobox', { name: 'Số dòng mỗi trang' }), {
        key: 'Enter',
      })
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        '10',
        '20',
        '50',
      ])
      await user.click(screen.getByRole('option', { name: String(size) }))
      expect(
        alerts.mock.calls.filter((call) => call[0].kind === 'below-minimum' && call[1]).at(-1)?.[0]
      ).toMatchObject({ pageNumber: 1, pageSize: size })
      expect(
        alerts.mock.calls.filter((call) => call[0].kind === 'above-maximum').at(-1)?.[0].pageSize
      ).toBe(10)
    }
  })

  it('retains the selected page size across compact group switches without loading hidden rows', async () => {
    const user = userEvent.setup()
    const view = render(<WarehouseOverviewPage />)
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }), { key: 'Enter' })
    await user.click(screen.getByRole('option', { name: '50' }))
    state.kind = 'expired'
    view.rerender(<WarehouseOverviewPage />)
    expect(
      alerts.mock.calls.filter((call) => call[0].kind === 'below-minimum' && call[1]).at(-1)?.[0]
        .pageSize
    ).toBe(1)
    expect(
      alerts.mock.calls.filter((call) => call[0].kind === 'expired').at(-1)?.[0].pageSize
    ).toBe(10)
    state.kind = 'below-minimum'
    view.rerender(<WarehouseOverviewPage />)
    expect(
      alerts.mock.calls.filter((call) => call[0].kind === 'below-minimum' && call[1]).at(-1)?.[0]
        .pageSize
    ).toBe(50)
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

  it('rechecks an inactive denied alert and keeps activity hidden until recovery finishes', async () => {
    state.tab = 'activity'
    state.denied = true
    state.deniedKind = 'expired'
    let finish = () => {}
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    refresh.mockImplementation((kind) => {
      if (kind === 'expired') {
        state.denied = false
        return pending.then(() => ({ isSuccess: true }))
      }
      return { isSuccess: true }
    })
    overview.mockReturnValue({
      data: {
        stockedSkuCount: 1,
        reservedSkuCount: 0,
        heldSkuCount: 0,
        lowStockCount: 0,
        pendingInboundRequests: 0,
        pendingGoodsReceipts: 0,
        pendingStockIssues: 0,
        pendingTransfers: 0,
        pendingCounts: 0,
        overdueTasks: 0,
        unassignedTasks: 0,
        activeSlots: 1,
        occupiedActiveSlots: 1,
        inactiveSlotsWithStock: 0,
        activity: [],
      },
      isPending: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: () => refresh('overview'),
    })
    const view = render(<WarehouseOverviewPage />)
    const reload = screen.getByRole('button', { name: 'Tải lại tổng quan' })
    await userEvent.click(reload)
    view.rerender(<WarehouseOverviewPage />)
    expect(meRefresh).toHaveBeenCalledWith({ cancelRefetch: false })
    expect(optionsRefresh).toHaveBeenCalledWith({ cancelRefetch: false })
    expect(refresh.mock.calls.map((call) => call[0])).toContain('overview')
    expect(refresh.mock.calls.map((call) => call[0])).toContain('expired')
    expect(reload).toBeDisabled()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    finish()
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(screen.queryByText('Không còn quyền kho.')).not.toBeInTheDocument()
  })

  it.each(['overview', 'activity'])(
    'rechecks an inactive denied %s while refreshing the alert tab',
    async (section) => {
      const retryOverview = vi.fn()
      let denied = true
      const query = section === 'overview' ? overview : activity
      query.mockImplementation(() => ({
        isPending: false,
        isFetching: false,
        isError: denied,
        error: denied ? { statusCode: 403, message: 'Hoạt động bị từ chối.' } : null,
        refetch: () => {
          retryOverview()
          denied = false
          return { isSuccess: true }
        },
      }))
      render(<WarehouseOverviewPage />)
      expect(screen.queryByText('Hàng QA')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Tải lại tổng quan' }))
      await waitFor(() => expect(screen.getByText('Hàng QA')).toBeInTheDocument())
      expect(retryOverview).toHaveBeenCalledOnce()
      expect(meRefresh).toHaveBeenCalledOnce()
    }
  )

  it('keeps cached data hidden when the retry is still forbidden', async () => {
    state.denied = true
    render(<WarehouseOverviewPage />)
    const reload = screen.getByRole('button', { name: 'Tải lại tổng quan' })
    await userEvent.click(reload)
    await waitFor(() => expect(reload).toBeEnabled())
    expect(screen.getByText('Không còn quyền kho.')).toBeInTheDocument()
    expect(screen.queryByText('Hàng QA')).not.toBeInTheDocument()
    expect(meRefresh).toHaveBeenCalledOnce()
  })

  it('does not reveal recovered query data when session verification fails', async () => {
    state.denied = true
    refresh.mockImplementation(() => {
      state.denied = false
      return { isSuccess: true }
    })
    meRefresh.mockImplementation(() => {
      state.meError = true
      return { isSuccess: false }
    })
    render(<WarehouseOverviewPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại tổng quan' }))
    await waitFor(() => expect(screen.getByText('Không xác minh được phiên.')).toBeInTheDocument())
    expect(screen.queryByText('Hàng QA')).not.toBeInTheDocument()
  })

  it.each(['server error', 'network rejection'])(
    'keeps old data hidden after recovery hits %s and allows another retry',
    async (failure) => {
      state.denied = true
      refresh.mockImplementation(() => {
        state.denied = false
        return failure === 'network rejection'
          ? Promise.reject(new Error('Network unavailable'))
          : { isSuccess: false }
      })
      render(<WarehouseOverviewPage />)
      const reload = screen.getByRole('button', { name: 'Tải lại tổng quan' })
      await userEvent.click(reload)
      await waitFor(() =>
        expect(screen.getByText(/Chưa xác minh lại được dữ liệu tổng quan/)).toBeInTheDocument()
      )
      expect(screen.queryByText('Hàng QA')).not.toBeInTheDocument()
      refresh.mockReturnValue({ isSuccess: true })
      await userEvent.click(reload)
      await waitFor(() => expect(screen.getByText('Hàng QA')).toBeInTheDocument())
      expect(meRefresh).toHaveBeenCalledTimes(2)
    }
  )

  it.each([
    { compact: true, close: 'Escape' },
    { compact: false, close: 'Close' },
  ])(
    'restores focus to the actual opener after $close (compact=$compact)',
    async ({ compact, close }) => {
      state.compact = compact
      const user = userEvent.setup()
      render(<WarehouseOverviewPage />)
      const region = screen.getByRole('region', {
        name: compact ? 'Khả dụng dưới mức tối thiểu' : 'Khả dụng vượt mức tối đa',
      })
      const opener = within(region).getByRole('button', { name: 'Xem tất cả' })
      opener.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      if (close === 'Escape') await user.keyboard('{Escape}')
      else
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(opener).toHaveFocus())
    }
  )
  it('shows alerts without granting inventory navigation from a role name', () => {
    state.permissions = [P.DASHBOARD_VIEW]
    render(<WarehouseOverviewPage />)
    expect(screen.getByText('Hàng QA')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('restores the clicked opener even when the browser did not focus it on pointer click', async () => {
    render(<WarehouseOverviewPage />)
    const opener = screen.getByRole('button', { name: 'Xem tất cả' })
    expect(opener).not.toHaveFocus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('does not focus a detached opener when losing access closes the dialog', async () => {
    const view = render(<WarehouseOverviewPage />)
    const opener = screen.getByRole('button', { name: 'Xem tất cả' })
    await userEvent.click(opener)
    const focus = vi.spyOn(opener, 'focus')
    state.denied = true
    view.rerender(<WarehouseOverviewPage />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener.isConnected).toBe(false)
    expect(focus).not.toHaveBeenCalled()
    focus.mockRestore()
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
