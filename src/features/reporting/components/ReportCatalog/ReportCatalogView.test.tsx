import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_ROUTES } from '@/routes/app-routes'
import { ReportCatalogView } from './ReportCatalogView'

afterEach(cleanup)
const props = {
  reports: [],
  search: '',
  isPending: false,
  group: 'all',
  favorites: [],
  onSearchChange: vi.fn(),
  onGroupChange: vi.fn(),
  onToggleFavorite: vi.fn(),
}
const reports = [
  ['inventory-balance', 'Tổng hợp nhập–xuất–tồn'],
  ['inventory-snapshot', 'Tồn kho theo vị trí'],
  ['stock-card', 'Thẻ kho'],
  ['inbound-progress', 'Tiến độ nhập kho'],
  ['outbound-progress', 'Tiến độ xuất kho'],
  ['task-progress', 'Công việc kho'],
  ['transfer-reconciliation', 'Điều chuyển và đối soát'],
  ['count-adjustment', 'Kiểm kê và điều chỉnh'],
  ['replenishment', 'Nhu cầu bổ sung'],
  ['slow-moving', 'Hàng chậm luân chuyển'],
].map(([type, name]) => ({
  type: type ?? '',
  name: name ?? '',
  group: 'Nhóm API cũ',
  description: `Mô tả ${name}`,
  usesPeriod: true,
  requiresProduct: type === 'stock-card',
  formats: ['xlsx'],
  columns: [],
}))

describe('business report clusters', () => {
  it('places all reports in their business clusters with direct links', () => {
    render(<ReportCatalogView {...props} reports={reports} canForecast />)
    expect(
      within(screen.getByRole('region', { name: 'Tồn kho' })).getAllByRole('link')
    ).toHaveLength(3)
    expect(
      within(screen.getByRole('region', { name: 'Tiến độ vận hành' })).getAllByRole('link')
    ).toHaveLength(3)
    expect(
      within(screen.getByRole('region', { name: 'Đối soát & kiểm soát' })).getAllByRole('link')
    ).toHaveLength(2)
    expect(
      within(screen.getByRole('region', { name: 'Phân tích & bổ sung' })).getAllByRole('link')
    ).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Tiến độ nhập kho' })).toHaveAttribute(
      'href',
      '/reports/inbound-progress?autoRun=1'
    )
    expect(screen.getByRole('link', { name: 'Thẻ kho' })).toHaveAttribute(
      'href',
      '/reports/stock-card'
    )
  })
  it('filters by selected cluster and keeps navigation working', async () => {
    const onGroupChange = vi.fn()
    render(
      <ReportCatalogView
        {...props}
        reports={reports}
        canForecast
        group="control"
        onGroupChange={onGroupChange}
      />
    )
    expect(screen.getByRole('link', { name: 'Điều chuyển và đối soát' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Thẻ kho' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Tiến độ vận hành/ }))
    expect(onGroupChange).toHaveBeenCalledWith('operations')
  })
  it('preserves favorites and searches by business group', async () => {
    const onToggleFavorite = vi.fn()
    const { rerender } = render(
      <ReportCatalogView
        {...props}
        reports={reports}
        canForecast
        favorites={['stock-card']}
        group="favorites"
        onToggleFavorite={onToggleFavorite}
      />
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Bỏ yêu thích: Thẻ kho' }))
    expect(onToggleFavorite).toHaveBeenCalledWith('stock-card')
    rerender(
      <ReportCatalogView {...props} reports={reports} canForecast search="đối soát & kiểm soát" />
    )
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
  it('does not hide a new server report that has no predefined category', () => {
    const report = {
      ...reports[0],
      type: 'new-report',
      name: 'Báo cáo mới',
      group: 'Nhóm mới',
      description: '',
      usesPeriod: false,
      requiresProduct: false,
      columns: [],
      formats: ['xlsx'],
    }
    render(<ReportCatalogView {...props} reports={[report]} canForecast={false} />)
    expect(
      within(screen.getByRole('region', { name: 'Nhóm mới' })).getByRole('link', {
        name: 'Báo cáo mới',
      })
    ).toBeInTheDocument()
  })
})

describe('forecast access in the report catalog', () => {
  it('opens forecasting directly even when the report list is empty', () => {
    render(<ReportCatalogView {...props} canForecast search="Dự báo & bổ sung hàng" />)
    expect(screen.getByRole('link', { name: 'Dự báo & bổ sung hàng' })).toHaveAttribute(
      'href',
      APP_ROUTES.reportForecast
    )
    expect(screen.queryByText('Không tìm thấy báo cáo')).not.toBeInTheDocument()
  })

  it('hides the planning action without the existing inventory view permission', () => {
    render(<ReportCatalogView {...props} canForecast={false} />)
    expect(screen.queryByRole('link', { name: 'Dự báo & bổ sung hàng' })).not.toBeInTheDocument()
  })
})
