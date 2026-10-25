import type { ComponentProps, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockIssueRequestDirectory } from '../components/StockIssueRequestsPage'
import StockIssueRequestPage from './StockIssueRequestPage'

const fixture = vi.hoisted(() => ({ query: vi.fn(), export: vi.fn() }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [] } }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({ useWarehousesQuery: () => ({}) }))
vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: (options: unknown) => {
    fixture.export(options)
    return { canExport: false }
  },
}))
vi.mock('../hooks/use-stock-issue-requests', () => ({
  useStockIssueRequestsQuery: (query: unknown) => {
    fixture.query(query)
    return { data: { items: [], totalCount: 0 }, isFetching: false, isError: false }
  },
  useStockIssueRequestQuery: () => ({}),
  useStockRecipientOptionsQuery: () => ({}),
}))
vi.mock('../hooks/use-stock-issue-workflow', () => ({
  useStockIssueWorkflow: () => ({ capabilities: { canCreate: false }, handlers: {} }),
}))
vi.mock('../components/StockIssueWorkflow', () => ({ StockIssueWorkflowDialogs: () => null }))
vi.mock('../components/StockIssueRequestsPage', () => ({
  StockIssueGoodsWorkspace: ({ children }: { children: ReactNode }) => children,
  StockIssueGoodsPreview: () => null,
  StockIssueRequestDirectory: (props: ComponentProps<typeof StockIssueRequestDirectory>) => (
    <>
      <button onClick={() => props.onPageChange(2)}>Trang tiếp</button>
      <button
        onClick={() => {
          props.onDateFromChange('2026-10-25T00:00')
          props.onDateToChange('2026-10-25T10:01')
        }}
      >
        Lọc giờ
      </button>
      <button
        onClick={() => {
          props.onDateFromChange('2026-10-25')
          props.onDateToChange('2026-10-25')
        }}
      >
        Lọc cả ngày
      </button>
      <button
        onClick={() => {
          props.onDateFromChange('')
          props.onDateToChange('')
        }}
      >
        Xóa lọc
      </button>
    </>
  ),
}))

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('outbound creation date-time filters', () => {
  it('sends Vietnam bounds to both list and export and resets pagination', () => {
    render(<StockIssueRequestPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Trang tiếp' }))
    expect(fixture.query).toHaveBeenLastCalledWith(expect.objectContaining({ pageNumber: 2 }))
    fireEvent.click(screen.getByRole('button', { name: 'Lọc giờ' }))
    const expected = {
      pageNumber: 1,
      dateFrom: '2026-10-25T00:00:00+07:00',
      dateTo: '2026-10-25T10:01:59.999+07:00',
    }
    expect(fixture.query).toHaveBeenLastCalledWith(expect.objectContaining(expected))
    expect(fixture.export).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: expect.objectContaining(expected) })
    )
  })

  it('preserves whole-day filtering and removes cleared bounds', () => {
    render(<StockIssueRequestPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Lọc cả ngày' }))
    expect(fixture.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dateFrom: '2026-10-25T00:00:00+07:00',
        dateTo: '2026-10-25T23:59:59.999+07:00',
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xóa lọc' }))
    expect(fixture.query.mock.lastCall?.[0]).not.toHaveProperty('dateFrom')
    expect(fixture.query.mock.lastCall?.[0]).not.toHaveProperty('dateTo')
  })
})
