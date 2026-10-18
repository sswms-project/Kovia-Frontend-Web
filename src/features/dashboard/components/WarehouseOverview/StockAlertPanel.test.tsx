import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StockAlertPanel, type StockAlertPanelProps } from './StockAlertPanel'
import {
  stockExpiryAlertsSchema,
  stockThresholdAlertsSchema,
} from '../../schemas/stock-alert.schema'

afterEach(cleanup)
const productId = '00000000-0000-0000-0000-000000000001'
const warehouseId = '00000000-0000-0000-0000-000000000002'
const data = stockThresholdAlertsSchema.parse({
  generatedAt: '2026-10-17T12:00:00Z',
  appliedWarehouseIds: [warehouseId],
  kind: 'below-minimum',
  configuredPolicyCount: 1,
  totalCount: 1,
  pageNumber: 1,
  pageSize: 10,
  items: [
    {
      warehouseId,
      warehouseName: 'Đà Nẵng',
      productId,
      sku: 'SKU-QA',
      productName: 'Hàng QA',
      unit: 'Cái',
      availableQuantity: 2,
      thresholdQuantity: 10,
      difference: 8,
    },
  ],
})
const props: StockAlertPanelProps = {
  kind: 'below-minimum',
  expiringDays: 5,
  data,
  canViewInventory: true,
  isLoading: false,
  isFetching: false,
  onRefresh: vi.fn(),
  onPageChange: vi.fn(),
}

describe('shared stock alert panel', () => {
  it.each([false, true])(
    'places update and UTC evaluation metadata in the centered pagination slot (expanded=%s)',
    (expanded) => {
      const expiry = stockExpiryAlertsSchema.parse({
        ...data,
        kind: 'expired',
        evaluationDate: '2026-10-18',
        timeBasis: 'UTC',
        expiringDays: null,
        items: [],
        totalCount: 0,
      })
      const { container } = render(
        <StockAlertPanel {...props} kind="expired" data={expiry} expanded={expanded} />
      )
      const panel = container.querySelector('[data-slot="operational-list-panel"]')
      const header = panel?.firstElementChild
      const footer = panel?.querySelector(':scope > footer')
      expect(header).not.toHaveTextContent('Cập nhật:')
      expect(footer).toContainElement(screen.getByText(/^Cập nhật:/))
      expect(footer).toContainElement(screen.getByText(/Đánh giá 18\/10\/2026 \(UTC\)/))
      expect(screen.getByText(/^Cập nhật:/).parentElement?.parentElement).toHaveClass('text-center')
      expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
    }
  )
  it('uses the shared list panel and direct pagination footer with a real scoped inventory link', () => {
    const { container } = render(<StockAlertPanel {...props} />)
    const panel = container.querySelector('[data-slot="operational-list-panel"]')
    expect(panel?.querySelector(':scope > [data-slot="table-container"]')).not.toBeNull()
    expect(panel?.querySelector(':scope > footer')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Hàng QA' })).toHaveAttribute(
      'href',
      `/inventory?warehouseId=${warehouseId}&productId=${productId}`
    )
  })
  it('hides inventory navigation when the user lacks that capability', () => {
    render(<StockAlertPanel {...props} canViewInventory={false} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Hàng QA')).toBeInTheDocument()
  })
  it('never shows an invented zero count while loading', () => {
    render(<StockAlertPanel {...props} data={undefined} isLoading />)
    expect(screen.queryByText(/Tổng số:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Không có cảnh báo phù hợp')).not.toBeInTheDocument()
  })
  it('distinguishes an unconfigured threshold from no matching alerts', () => {
    render(
      <StockAlertPanel
        {...props}
        data={{ ...data, configuredPolicyCount: 0, totalCount: 0, items: [] }}
      />
    )
    expect(screen.getByText('Chưa cấu hình ngưỡng')).toBeInTheDocument()
  })
  it('keeps old data visible during a failed refetch and retries only through its callback', async () => {
    const refresh = vi.fn()
    render(<StockAlertPanel {...props} errorMessage="Mất kết nối" onRefresh={refresh} />)
    expect(screen.getByText('Hàng QA')).toBeInTheDocument()
    expect(screen.getByText(/đang hiển thị dữ liệu cũ/)).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Tải lại Khả dụng dưới mức tối thiểu' })
    )
    expect(refresh).toHaveBeenCalledOnce()
  })
})
