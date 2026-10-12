import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ForecastOverviewRow } from '../../utils/forecast-overview'
import { formatInventoryDateOnly } from '../../utils/inventory-format'
import { ForecastOverviewView } from './ForecastOverviewView'

afterEach(cleanup)

const row: ForecastOverviewRow = {
  productId: 'p1',
  sku: 'PEN-01',
  productName: 'Bút bi',
  unitName: 'cái',
  modelLabel: 'Trung bình theo thứ',
  totalDemand: 140,
  averageDailyDemand: 10,
  availableQuantity: 25,
  daysOfCover: 2,
  periodDays: 14,
  stockoutDate: '2026-10-14',
  wape: 12.5,
  risk: 'stockout',
}

const props = {
  rows: [row],
  totalCount: 1,
  riskCounts: { stockout: 1, watch: 0, ok: 0, unknown: 0 },
  search: '',
  risk: 'all' as const,
  page: 1,
  pageSize: 20,
  onSearchChange: vi.fn(),
  onRiskChange: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onSelectProduct: vi.fn(),
  onExport: vi.fn(),
}

describe('forecast overview table', () => {
  it('shows cover and risk for each product', () => {
    render(<ForecastOverviewView {...props} />)

    const line = within(screen.getByRole('row', { name: /PEN-01/ }))
    expect(line.getByText('Sắp hết')).toBeInTheDocument()
    expect(line.getByText('Trung bình theo thứ')).toBeInTheDocument()
    expect(line.getByText('2 ngày')).toBeInTheDocument()
    expect(line.getByText(formatInventoryDateOnly('2026-10-14'))).toBeInTheDocument()
  })

  it('opens the demand chart of the chosen product', () => {
    const onSelectProduct = vi.fn()
    render(<ForecastOverviewView {...props} onSelectProduct={onSelectProduct} />)

    fireEvent.click(screen.getByRole('button', { name: /PEN-01/ }))

    expect(onSelectProduct).toHaveBeenCalledWith('p1')
  })

  it('draws cover against the forecast period for screen readers too', () => {
    render(<ForecastOverviewView {...props} />)

    const meter = screen.getByRole('meter', { name: 'Độ phủ tồn kho' })
    expect(meter).toHaveAttribute('aria-valuenow', '2')
    expect(meter).toHaveAttribute('aria-valuemax', '14')
  })

  it('caps the bar at the period when stock outlasts it', () => {
    render(
      <ForecastOverviewView
        {...props}
        rows={[{ ...row, daysOfCover: 31, risk: 'ok', stockoutDate: null }]}
      />
    )

    expect(screen.getByRole('meter', { name: 'Độ phủ tồn kho' })).toHaveAttribute(
      'aria-valuenow',
      '14'
    )
    expect(screen.getByText('31 ngày')).toBeInTheDocument()
  })

  it('draws no bar when cover cannot be computed', () => {
    render(
      <ForecastOverviewView
        {...props}
        rows={[{ ...row, daysOfCover: null, periodDays: null, risk: 'unknown' }]}
      />
    )

    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  it('filters by risk with counted chips and returns to all on a second press', () => {
    const onRiskChange = vi.fn()
    const { rerender } = render(<ForecastOverviewView {...props} onRiskChange={onRiskChange} />)

    fireEvent.click(screen.getByRole('radio', { name: /Sắp hết.*1/ }))
    expect(onRiskChange).toHaveBeenLastCalledWith('stockout')

    rerender(<ForecastOverviewView {...props} risk="stockout" onRiskChange={onRiskChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /Sắp hết.*1/ }))
    expect(onRiskChange).toHaveBeenLastCalledWith('all')
  })

  it('reports search input and export requests to its owner', () => {
    const onSearchChange = vi.fn()
    const onExport = vi.fn()
    render(<ForecastOverviewView {...props} onSearchChange={onSearchChange} onExport={onExport} />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm mặt hàng' }), {
      target: { value: 'pen' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }))

    expect(onSearchChange).toHaveBeenCalledWith('pen')
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('explains an empty result instead of showing a bare table', () => {
    render(<ForecastOverviewView {...props} rows={[]} totalCount={0} search="xyz" />)

    expect(screen.getByText('Không có mặt hàng phù hợp với bộ lọc.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xuất CSV' })).toBeDisabled()
  })
})
