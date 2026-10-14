import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import ReportWorkspacePage from './ReportWorkspacePage'
import type { WarehouseReportQuery } from '../types/warehouse-report.types'

const mocks = vi.hoisted(() => ({
  canView: true,
  catalogReady: true,
  type: 'inventory-balance',
  export: vi.fn(),
  refetch: vi.fn(),
  queries: [] as (WarehouseReportQuery | null)[],
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    data: { permissions: mocks.canView ? [P.REPORTS_VIEW] : [] },
    isPending: false,
  }),
}))
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }))
vi.mock('../hooks/use-warehouse-report', () => ({
  useWarehouseReportCatalog: () => ({
    data: mocks.catalogReady
      ? [
          {
            type: mocks.type,
            name: 'Báo cáo thử',
            description: 'Theo dõi kho',
            usesPeriod: true,
            requiresProduct: mocks.type === 'stock-card',
            formats: ['xlsx'],
          },
        ]
      : undefined,
    isPending: !mocks.catalogReady,
  }),
  useWarehouseReportOptions: () => ({
    data: {
      warehouses: [
        { id: 'w1', name: 'Kho A' },
        { id: 'w2', name: 'Kho B' },
      ],
      categories: [
        { id: 'c1', name: 'Ngũ kim', parentId: null },
        { id: 'c2', name: 'Nước ngọt', parentId: null },
      ],
      products: [{ id: 'p1', sku: 'SKU1', name: 'Bu lông', unit: 'cái' }],
      assignees: [],
      productsTruncated: false,
    },
  }),
  useExportWarehouseReport: () => ({ mutate: mocks.export, isPending: false }),
  useWarehouseReport: (_type: string, query: WarehouseReportQuery | null) => {
    mocks.queries.push(query)
    return {
      isFetching: false,
      refetch: mocks.refetch,
      data: query
        ? {
            reportType: mocks.type,
            generatedAt: '2026-10-12T10:00:00Z',
            timeBasis: 'Ngày ghi sổ',
            warnings: [],
            appliedFilters: {
              warehouseIds: query.warehouseIds ?? ['w1', 'w2'],
              dateFrom: query.dateFrom ?? null,
              dateTo: query.dateTo ?? null,
              productId: query.productId ?? null,
              categoryId: query.categoryId ?? null,
            },
            items: [],
            columns: [],
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            totalCount: 0,
          }
        : undefined,
    }
  },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(cleanup)
beforeEach(() => {
  mocks.canView = true
  mocks.catalogReady = true
  mocks.type = 'inventory-balance'
  mocks.export.mockClear()
  mocks.refetch.mockClear()
  mocks.queries.length = 0
})

describe('report viewing and applied scope (mock API)', () => {
  it('exports the applied category while a new category is still a draft', async () => {
    const user = userEvent.setup()
    render(<ReportWorkspacePage reportType="inventory-balance" />)
    expect(screen.queryByRole('combobox', { name: 'Kho' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nhóm vật tư / hàng hóa' }), 'c1')
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    expect(screen.getByRole('region', { name: 'Phạm vi báo cáo đã áp dụng' })).toHaveTextContent(
      'Ngũ kim'
    )
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nhóm vật tư / hàng hóa' }), 'c2')
    await user.click(screen.getByRole('button', { name: /^Đóng$/ }))
    await user.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(mocks.export).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ categoryId: 'c1' }) })
    )
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    expect(mocks.queries.at(-1)).toEqual(
      expect.objectContaining({ categoryId: 'c2', pageNumber: 1 })
    )
  })
  it('does not claim pending changes when the catalog arrives after an auto-run route', () => {
    mocks.catalogReady = false
    const props = { reportType: 'inventory-balance', initialFilters: { autoRun: '1' } }
    const { rerender } = render(<ReportWorkspacePage {...props} />)
    mocks.catalogReady = true
    rerender(<ReportWorkspacePage {...props} />)
    expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('exports the applied warehouse while a different warehouse is still a draft', async () => {
    const user = userEvent.setup()
    render(<ReportWorkspacePage reportType="inventory-balance" />)
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kho' }), 'w1')
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeEnabled())
    expect(screen.getByRole('region', { name: 'Phạm vi báo cáo đã áp dụng' })).toHaveTextContent(
      'Kho A'
    )
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kho' }), 'w2')
    await user.click(screen.getByRole('button', { name: /^Đóng$/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Tham số đã thay đổi')
    await user.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(mocks.export).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ warehouseIds: ['w1'] }) })
    )
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    await waitFor(() =>
      expect(mocks.queries.at(-1)).toEqual(
        expect.objectContaining({ warehouseIds: ['w2'], pageNumber: 1 })
      )
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('refreshes the same report when Xem báo cáo is clicked again', async () => {
    const user = userEvent.setup()
    render(<ReportWorkspacePage reportType="inventory-balance" />)
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })
  it('requires a product for stock card, then applies parameters from the sheet', async () => {
    mocks.type = 'stock-card'
    const user = userEvent.setup()
    render(<ReportWorkspacePage reportType="stock-card" />)
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng chọn mặt hàng')
    expect(mocks.queries.at(-1)).toBeNull()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mặt hàng' }), 'p1')
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.queries.at(-1)).toEqual(expect.objectContaining({ productId: 'p1' }))
  })
  it('offers the new transfer put-away task type from dev in report parameters', async () => {
    mocks.type = 'task-progress'
    const user = userEvent.setup()
    render(<ReportWorkspacePage reportType="task-progress" />)
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    expect(screen.getByRole('option', { name: 'Cất hàng điều chuyển' })).toHaveValue(
      'TransferPutAway'
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Loại công việc' }),
      'TransferPutAway'
    )
    await user.click(screen.getByRole('button', { name: 'Xem báo cáo' }))
    expect(mocks.queries.at(-1)).toEqual(expect.objectContaining({ taskType: 'TransferPutAway' }))
  })
  it('does not offer report or export controls without permission', () => {
    mocks.canView = false
    render(<ReportWorkspacePage reportType="inventory-balance" />)
    expect(screen.getByRole('alert')).toHaveTextContent('không có quyền')
    expect(screen.queryByRole('button', { name: 'Xem báo cáo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xuất Excel' })).not.toBeInTheDocument()
  })
})
