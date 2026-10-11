import { render, screen, cleanup } from '@testing-library/react'
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
