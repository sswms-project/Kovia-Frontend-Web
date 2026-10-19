import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WarehouseOverview } from '../../schemas/warehouse-overview.schema'
import { WarehouseOperationsView } from './WarehouseOperationsView'
import { WarehouseActivityChart } from './WarehouseActivityChart'

vi.mock('recharts', () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Container,
    BarChart: Container,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Bar: () => null,
  }
})

const data: WarehouseOverview = {
  generatedAt: '2026-10-18T10:00:00Z',
  activityDateFrom: '2026-09-19',
  activityDateTo: '2026-10-18',
  activityGranularity: 'day',
  activity: [{ date: '2026-10-04', completedReceipts: 6, dispatchedIssues: 1 }],
  warehouses: [],
  stockedSkuCount: 13,
  reservedSkuCount: 4,
  heldSkuCount: 2,
  lowStockCount: 7,
  pendingInboundRequests: 16,
  pendingGoodsReceipts: 7,
  pendingStockIssues: 5,
  pendingTransfers: 0,
  pendingCounts: 0,
  overdueTasks: 4,
  unassignedTasks: 3,
  activeSlots: 61,
  occupiedActiveSlots: 20,
  inactiveSlotsWithStock: 0,
  lowStockSignals: [],
}

const props = {
  data,
  isLoading: false,
  onRefresh: vi.fn(),
  compact: false,
  selectedView: 'indices',
  onSelectedViewChange: vi.fn(),
  links: {
    inventory: { pathname: '/inventory', query: { warehouseId: 'warehouse-1' } },
    forecast: { pathname: '/reports/forecast' },
    reports: { pathname: '/reports' },
  },
  activityChart: (
    <WarehouseActivityChart
      data={data}
      periodFilter={
        <div role="group" aria-label="Bộ lọc kỳ hoạt động">
          Bộ lọc thời gian QA
        </div>
      }
    />
  ),
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('warehouse activity workspace', () => {
  it.each([false, true])('matches the metrics and detail skeletons to compact=%s', (compact) => {
    const view = render(
      <WarehouseOperationsView {...props} compact={compact} data={undefined} isLoading />
    )
    const metrics = view.container.querySelector('[data-slot="warehouse-metrics-skeleton"]')
    if (compact) expect(metrics).not.toBeInTheDocument()
    else expect(metrics?.querySelectorAll('[data-slot="card"]')).toHaveLength(4)
    const details = screen.getByRole('status', { name: 'Đang tải chỉ số vận hành' })
    expect(details).toHaveAttribute('data-slot', 'operational-list-panel')
    expect(details).toHaveAttribute('aria-busy', 'true')
    expect(within(details).getAllByRole('row', { hidden: true })).toHaveLength(compact ? 21 : 16)
    expect(within(details).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it.each([true, false])(
    'keeps the independent chart and filters visible when overview loading is %s and no overview exists',
    (isLoading) => {
      render(
        <WarehouseOperationsView
          {...props}
          data={undefined}
          isLoading={isLoading}
          errorMessage={isLoading ? undefined : 'Lỗi kết nối tổng quan'}
        />
      )
      const chart = screen.getByRole('region', { name: 'Nhập – xuất kho trong kỳ' })
      expect(within(chart).getByText('6')).toBeInTheDocument()
      expect(within(chart).getByRole('group', { name: 'Bộ lọc kỳ hoạt động' })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Chỉ số hiện tại' })).not.toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      if (isLoading) expect(screen.getByRole('status')).toHaveTextContent('Đang tải chỉ số')
      else {
        expect(screen.getByRole('alert')).toHaveTextContent('Lỗi kết nối tổng quan')
        fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
        expect(props.onRefresh).toHaveBeenCalledOnce()
      }
    }
  )

  it('allows switching to the independent chart on compact screens before overview arrives', () => {
    const view = render(<WarehouseOperationsView {...props} compact data={undefined} isLoading />)
    expect(
      screen.queryByRole('region', { name: 'Nhập – xuất kho trong kỳ' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Biểu đồ' }))
    expect(props.onSelectedViewChange).toHaveBeenCalledWith('chart')
    view.rerender(
      <WarehouseOperationsView {...props} compact selectedView="chart" data={undefined} isLoading />
    )
    expect(screen.getByRole('region', { name: 'Nhập – xuất kho trong kỳ' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps four current metrics compact and avoids repeating their values in the detail table', () => {
    render(<WarehouseOperationsView {...props} />)
    const metrics = screen.getByRole('region', { name: 'Chỉ số hiện tại' })
    expect(within(metrics).getByText('28')).toBeInTheDocument()
    expect(
      within(metrics).getByRole('link', { name: 'Xem chi tiết SKU đang có tồn' })
    ).toHaveAttribute('href', '/inventory?warehouseId=warehouse-1')
    const table = screen.getByRole('table')
    expect(within(table).queryByText('SKU đang có tồn')).not.toBeInTheDocument()
    expect(within(table).queryByText('Công việc quá hạn')).not.toBeInTheDocument()
    expect(within(table).getByText('Tồn kho & công việc')).toBeInTheDocument()
    expect(within(table).getByText('Bố trí kho')).toBeInTheDocument()
    expect(within(table).getByText('33%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dự báo & bổ sung' })).toHaveAttribute(
      'href',
      '/reports/forecast'
    )
  })

  it('shows completed-document totals and applied dates without a confusing grouping label', () => {
    render(<WarehouseOperationsView {...props} />)
    const chart = screen.getByRole('region', { name: 'Nhập – xuất kho trong kỳ' })
    expect(within(chart).getByRole('group', { name: 'Bộ lọc kỳ hoạt động' })).toBeInTheDocument()
    expect(within(chart).getByText('Phiếu nhập hoàn tất')).toBeInTheDocument()
    expect(within(chart).getByText('Phiếu xuất hoàn tất')).toBeInTheDocument()
    expect(within(chart).getByText('6')).toBeInTheDocument()
    expect(within(chart).getByText('1')).toBeInTheDocument()
    expect(within(chart).getByText(/19\/09\/2026.*18\/10\/2026/)).toBeInTheDocument()
    expect(within(chart).queryByText(/^Theo (ngày|tuần|tháng)$/)).not.toBeInTheDocument()
  })

  it('preserves all current metric values in the compact index view', () => {
    render(<WarehouseOperationsView {...props} compact />)
    expect(screen.queryByRole('region', { name: 'Chỉ số hiện tại' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Nhập – xuất kho trong kỳ' })
    ).not.toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('SKU đang có tồn')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('28')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Biểu đồ' }))
    expect(props.onSelectedViewChange).toHaveBeenCalledWith('chart')
  })

  it('shows only the chart in compact chart mode', () => {
    render(<WarehouseOperationsView {...props} compact selectedView="chart" />)
    expect(screen.getByRole('region', { name: 'Nhập – xuất kho trong kỳ' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Bộ lọc kỳ hoạt động' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('does not invent links without capabilities or a capacity percentage without active slots', () => {
    render(
      <WarehouseOperationsView
        {...props}
        data={{ ...data, activeSlots: 0, occupiedActiveSlots: 0 }}
        links={{}}
      />
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Chưa có vị trí')).toBeInTheDocument()
    expect(screen.getByText(/không phải sức chứa khối lượng\/thể tích/)).toBeInTheDocument()
  })

  it('keeps a retry action when data is missing and stale-data warning when available', () => {
    const view = render(
      <WarehouseOperationsView {...props} data={undefined} errorMessage="Lỗi kết nối" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(props.onRefresh).toHaveBeenCalledOnce()
    view.rerender(<WarehouseOperationsView {...props} errorMessage="Lỗi kết nối" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Đang hiển thị dữ liệu cũ.')
  })

  it('loads only the chart while preserving current metrics, detail rows and period controls', () => {
    render(
      <WarehouseOperationsView
        {...props}
        activityChart={<WarehouseActivityChart isLoading periodFilter={<button>Áp dụng</button>} />}
      />
    )
    const chart = screen.getByRole('region', { name: 'Nhập – xuất kho trong kỳ' })
    expect(chart).toHaveAttribute('aria-busy', 'true')
    expect(within(chart).getByRole('button', { name: 'Áp dụng' })).toBeInTheDocument()
    expect(within(chart).getByRole('status')).toHaveTextContent('Đang tải biểu đồ')
    expect(within(chart).queryByRole('img')).not.toBeInTheDocument()
    expect(chart.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(10)
    expect(
      chart.querySelectorAll('[data-slot="skeleton"]:not(.motion-reduce\\:animate-none)')
    ).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Chỉ số hiện tại' })).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('33%')).toBeInTheDocument()
  })

  it('keeps chart failure and retry local to the chart', () => {
    const retry = vi.fn()
    render(
      <WarehouseOperationsView
        {...props}
        activityChart={<WarehouseActivityChart errorMessage="Lỗi kỳ hoạt động" onRefresh={retry} />}
      />
    )
    const chart = screen.getByRole('region', { name: 'Nhập – xuất kho trong kỳ' })
    expect(within(chart).getByRole('alert')).toHaveTextContent('Lỗi kỳ hoạt động')
    fireEvent.click(within(chart).getByRole('button', { name: 'Thử lại biểu đồ' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Chỉ số hiện tại' })).toBeInTheDocument()
  })
})
