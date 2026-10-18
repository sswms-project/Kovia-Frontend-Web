import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WarehouseOverview } from '../../schemas/warehouse-overview.schema'
import { WarehouseOperationsView } from './WarehouseOperationsView'

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
  activityDays: 30,
  onActivityDaysChange: vi.fn(),
  compact: false,
  selectedView: 'indices',
  onSelectedViewChange: vi.fn(),
  links: {
    inventory: { pathname: '/inventory', query: { warehouseId: 'warehouse-1' } },
    forecast: { pathname: '/reports/forecast' },
    reports: { pathname: '/reports' },
  },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('warehouse activity workspace', () => {
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

  it('keeps the period selector inside the chart and shows completed-document totals and dates', () => {
    render(<WarehouseOperationsView {...props} />)
    const chart = screen.getByRole('region', { name: 'Phiếu hoàn tất trong kỳ' })
    expect(within(chart).getByText('6')).toBeInTheDocument()
    expect(within(chart).getByText('1')).toBeInTheDocument()
    expect(within(chart).getByText(/19\/09\/2026.*18\/10\/2026/)).toBeInTheDocument()
    fireEvent.change(within(chart).getByLabelText('Kỳ hoạt động'), { target: { value: '90' } })
    expect(props.onActivityDaysChange).toHaveBeenCalledWith(90)
  })

  it('preserves all current metric values in the compact index view', () => {
    render(<WarehouseOperationsView {...props} compact />)
    expect(screen.queryByRole('region', { name: 'Chỉ số hiện tại' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Phiếu hoàn tất trong kỳ' })
    ).not.toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('SKU đang có tồn')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('28')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Biểu đồ' }))
    expect(props.onSelectedViewChange).toHaveBeenCalledWith('chart')
  })

  it('shows only the chart in compact chart mode', () => {
    render(<WarehouseOperationsView {...props} compact selectedView="chart" />)
    expect(screen.getByRole('region', { name: 'Phiếu hoàn tất trong kỳ' })).toBeInTheDocument()
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
})
