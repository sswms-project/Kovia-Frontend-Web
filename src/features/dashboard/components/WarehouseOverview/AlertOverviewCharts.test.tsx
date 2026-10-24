import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InventoryAnomalySummary } from '@/features/inventory-anomaly/types/inventory-anomaly.types'
import type {
  StockExpiryDistribution,
  StockThresholdAlerts,
} from '../../schemas/stock-alert.schema'
import { AlertOverviewCharts } from './AlertOverviewCharts'

afterEach(cleanup)

const warehouseId = '00000000-0000-0000-0000-000000000002'
const below: StockThresholdAlerts = {
  generatedAt: '2026-10-24T03:00:00Z',
  appliedWarehouseIds: [warehouseId],
  kind: 'below-minimum',
  configuredPolicyCount: 4,
  items: [
    {
      warehouseId,
      warehouseName: 'Đà Nẵng',
      productId: '00000000-0000-0000-0000-000000000003',
      sku: 'BEER',
      productName: 'Bia Larue',
      unit: 'Thùng',
      availableQuantity: 18,
      thresholdQuantity: 100,
      difference: 82,
    },
  ],
  totalCount: 18,
  pageNumber: 1,
  pageSize: 6,
}
const expiry: StockExpiryDistribution = {
  generatedAt: '2026-10-24T03:00:00Z',
  appliedWarehouseIds: [warehouseId],
  evaluationDate: '2026-10-24',
  timeBasis: 'UTC',
  expiringDays: 7,
  days: [
    { daysToExpiry: 0, lotCount: 3 },
    { daysToExpiry: 5, lotCount: 6 },
  ],
  totalCount: 9,
}
const anomalies: InventoryAnomalySummary = {
  openHigh: 2,
  openMedium: 3,
  reviewed30Days: 0,
  confirmed30Days: 0,
  precision30Days: null,
  latestScan: null,
  newLast14Days: Array.from({ length: 14 }, (_, index) => ({
    date: `2026-10-${String(11 + index).padStart(2, '0')}`,
    high: index === 13 ? 2 : 0,
    medium: index === 13 ? 3 : 0,
  })),
}
const ready = <T,>(data: T) => ({ data, isLoading: false, onRetry: vi.fn() })

describe('AlertOverviewCharts', () => {
  it('shows the three alert counts and summarises each chart for screen readers', () => {
    render(
      <AlertOverviewCharts
        belowMinimum={ready(below)}
        expiry={ready(expiry)}
        anomalies={ready(anomalies)}
        expiringDays={7}
        anomaliesHref={{ pathname: '/inventory/anomalies' }}
      />
    )
    expect(screen.getByText('Khả dụng dưới mức tối thiểu').nextSibling).toHaveTextContent(
      '18 sản phẩm'
    )
    expect(screen.getByText('Hàng gần hết hạn (7 ngày)').nextSibling).toHaveTextContent('9 lô')
    expect(screen.getByText('Cảnh báo bất thường chưa xem').nextSibling).toHaveTextContent(
      '5 (2 mức cao)'
    )
    expect(screen.getByRole('img', { name: /Bia Larue 18%/ })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Hôm nay 3 lô, 1–3 ngày 0 lô, 4–7 ngày 6 lô/ })
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /5 cảnh báo bất thường mới/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem' })).toHaveAttribute(
      'href',
      '/inventory/anomalies'
    )
  })

  it('hides the anomaly tile and chart when the user cannot view anomalies', () => {
    render(
      <AlertOverviewCharts belowMinimum={ready(below)} expiry={ready(expiry)} expiringDays={7} />
    )
    expect(screen.queryByText('Cảnh báo bất thường chưa xem')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cảnh báo bất thường' })).not.toBeInTheDocument()
  })

  it('shows empty and error states without inventing zero totals', () => {
    const onRetry = vi.fn()
    render(
      <AlertOverviewCharts
        belowMinimum={ready({ ...below, items: [], totalCount: 0 })}
        expiry={{ isLoading: false, errorMessage: 'Máy chủ bận.', onRetry }}
        expiringDays={7}
      />
    )
    expect(screen.getByText('Không có sản phẩm dưới mức tối thiểu.')).toBeInTheDocument()
    expect(screen.getByText('Hàng gần hết hạn (7 ngày)').nextSibling).toHaveTextContent(
      '— Chưa tải được'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
