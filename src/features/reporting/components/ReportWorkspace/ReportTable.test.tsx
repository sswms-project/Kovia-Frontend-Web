import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportResponseSchema } from '../../schemas/warehouse-report.schema'
import { ReportTable } from './ReportTable'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(cleanup)
const report = reportResponseSchema.parse({
  reportType: 'inventory-balance',
  schemaVersion: '1',
  generatedAt: '2026-10-13T06:00:00Z',
  timeBasis: 'Kỳ',
  dataQuality: 'Complete',
  warnings: [],
  appliedFilters: {
    warehouseIds: ['w1'],
    dateFrom: '2026-10-01',
    dateTo: '2026-10-13',
    productId: null,
    search: null,
    status: null,
    assigneeId: null,
    taskType: null,
    deadline: null,
  },
  columns: [
    'warehouseName',
    'sku',
    'productName',
    'categoryName',
    'unit',
    'openingBalance',
    'externalIn',
    'externalOut',
    'transferIn',
    'transferOut',
    'otherChanges',
    'closingBalance',
    'historyStatus',
  ].map((key) => ({
    key,
    label: key,
    dataType: [
      'openingBalance',
      'externalIn',
      'externalOut',
      'transferIn',
      'transferOut',
      'otherChanges',
      'closingBalance',
    ].includes(key)
      ? 'number'
      : 'text',
  })),
  items: [
    {
      rowType: 'inventory-balance',
      id: 'r1',
      warehouseId: 'w1',
      warehouseName: 'Kho A',
      productId: 'p1',
      sku: 'SKU01',
      productName: 'Kìm A3',
      categoryName: 'Ngũ kim',
      unit: 'Cái',
      openingBalance: 0,
      openingPosted: 0,
      externalIn: 200,
      externalOut: 0,
      transferIn: 0,
      transferOut: 90,
      adjustmentNet: -20,
      internalNet: 0,
      otherNet: 0,
      otherChanges: -20,
      closingBalance: 90,
      historyStatus: 'ReconciledJournal',
    },
  ],
  totalCount: 1,
  pageNumber: 1,
  pageSize: 25,
})
const props = {
  report,
  isFetching: false,
  sourceLinks: new Map([['r1', { pathname: '/reports/stock-card' }]]),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
}
describe('readable detail report table', () => {
  it('skips unchanged rows on parent renders and still displays refreshed values', () => {
    const sourceRow = report.items[0]
    if (!sourceRow || sourceRow.rowType !== 'inventory-balance')
      throw new Error('Missing inventory balance fixture')
    const row = { ...sourceRow }
    const readQuantity = vi.fn(() => 1234.5678914)
    Object.defineProperty(row, 'externalIn', { get: readQuantity, enumerable: true })
    const data = { ...report, items: [row] }
    const { rerender } = render(<ReportTable {...props} report={data} />)
    expect(screen.getByRole('cell', { name: '1.234,567891' })).toBeInTheDocument()
    const readsAfterRender = readQuantity.mock.calls.length

    rerender(<ReportTable {...props} report={data} />)
    expect(readQuantity).toHaveBeenCalledTimes(readsAfterRender)

    rerender(
      <ReportTable {...props} report={{ ...data, items: [{ ...row, externalIn: 2500.25 }] }} />
    )
    expect(screen.getByRole('cell', { name: '2.500,25' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: '1.234,567891' })).not.toBeInTheDocument()
  })
  it('opens a readable explanation on click, including on touch screens', async () => {
    render(<ReportTable {...props} />)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Giải thích: Điều chỉnh khác (+/−)' }))
    expect(
      screen.getByRole('dialog', { name: 'Giải thích: Điều chỉnh khác (+/−)' })
    ).toHaveTextContent('khai báo tồn đầu trong kỳ')
  })
  it('groups movements, combines product identity and moves tracing into the product link', () => {
    render(<ReportTable {...props} />)
    expect(screen.getByRole('columnheader', { name: 'Nhập kho' })).toHaveAttribute('colspan', '2')
    expect(screen.getByRole('columnheader', { name: 'Xuất kho' })).toHaveAttribute('colspan', '2')
    expect(screen.getByRole('columnheader', { name: 'Tồn đầu kỳ' })).toHaveAttribute('rowspan', '2')
    for (const label of ['Kho', 'SKU', 'Đối soát lịch sử', 'Nguồn'])
      expect(screen.queryByRole('columnheader', { name: label })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kìm A3' })).toHaveAttribute(
      'href',
      '/reports/stock-card'
    )
    expect(screen.getByText(/SKU01/)).toHaveTextContent('SKU01')
    expect(screen.getByRole('columnheader', { name: 'Nhóm vật tư / hàng hóa' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Ngũ kim' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '-20' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Giải thích: Điều chỉnh khác (+/−)' })
    ).toBeInTheDocument()
  })
  it('keeps the warehouse identity when viewing multiple warehouses', () => {
    render(
      <ReportTable
        {...props}
        report={{
          ...report,
          appliedFilters: { ...report.appliedFilters, warehouseIds: ['w1', 'w2'] },
        }}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Kho' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Kho A' })).toBeInTheDocument()
  })
  it('shows unknown historical balances explicitly rather than zero', () => {
    const unknown = reportResponseSchema.parse({
      ...report,
      items: [
        {
          ...report.items[0],
          openingBalance: null,
          closingBalance: null,
          historyStatus: 'InsufficientHistory',
        },
      ],
    })
    render(<ReportTable {...props} report={unknown} />)
    expect(screen.getAllByText('Chưa xác định')).toHaveLength(2)
    expect(screen.getByText(/Chưa đủ dữ liệu lịch sử/)).toBeInTheDocument()
  })
})
