import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STOCK_MOVEMENT_TYPES } from '@/features/inventory/types/inventory.types'
import { reportResponseSchema } from '../../schemas/warehouse-report.schema'
import { reportStatusLabel } from '../../utils/report-status'
import { ReportTable } from './ReportTable'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(cleanup)

function show(locationPath?: string | null, slotCode = '__SYSTEM_DEFAULT__') {
  const report = reportResponseSchema.parse({
    reportType: 'stock-card',
    schemaVersion: '1',
    generatedAt: '2026-11-06T11:00:00Z',
    timeBasis: 'Ngày ghi sổ',
    dataQuality: 'Complete',
    warnings: [],
    appliedFilters: {
      warehouseIds: ['warehouse-1'],
      dateFrom: null,
      dateTo: null,
      productId: 'product-1',
      search: null,
      status: null,
      assigneeId: null,
      taskType: null,
      deadline: null,
    },
    columns: [
      { key: 'productName', label: 'Mặt hàng', dataType: 'text' },
      { key: 'slotCode', label: 'Vị trí', dataType: 'text' },
      { key: 'movementType', label: 'Biến động', dataType: 'status' },
      { key: 'increase', label: 'Tăng', dataType: 'number' },
    ],
    items: [
      {
        rowType: 'stock-card',
        id: 'movement-1',
        warehouseId: 'warehouse-1',
        warehouseName: 'Đà Nẵng',
        productId: 'product-1',
        sku: 'SKU00001',
        productName: 'Kèm A3',
        unit: 'Cái',
        slotCode,
        ...(locationPath === undefined ? {} : { locationPath }),
        occurredAt: '2026-11-06T11:00:00Z',
        movementType: 'Inbound',
        increase: 7,
        decrease: 0,
        stockKeyBalanceAfter: 7,
        performedBy: 'Nhân viên',
        referenceType: 'GoodsReceipt',
        referenceId: 'receipt-1',
        correctsMovementId: null,
        sourceType: null,
        sourceId: null,
      },
    ],
    totalCount: 1,
    pageNumber: 1,
    pageSize: 25,
  })
  render(
    <ReportTable
      report={report}
      isFetching={false}
      sourceLinks={new Map()}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
    />
  )
}

describe('stock card table', () => {
  it.each([
    ['__SYSTEM_DEFAULT__', 'Khu K01 - Khu vực 1 / Kệ A04 - Kệ Kèm A3'],
    ['A04-01', 'Khu K01 - Khu vực 1 / Kệ A04 - Kệ Kèm A3 / A04-01'],
  ])('renders the full location for %s without changing the posted quantity', (code, path) => {
    show(path, code)
    expect(screen.getByRole('cell', { name: path })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Nhập kho' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '7' })).toBeInTheDocument()
    expect(screen.queryByText('__SYSTEM_DEFAULT__')).not.toBeInTheDocument()
    expect(screen.queryByText('Theo kệ')).not.toBeInTheDocument()
  })

  it.each([undefined, null])('accepts older responses with locationPath %s', (path) => {
    show(path)
    expect(screen.getByRole('cell', { name: 'Theo kệ' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Nhập kho' })).toBeInTheDocument()
  })

  it('translates every supported inventory movement type', () => {
    for (const type of Object.values(STOCK_MOVEMENT_TYPES)) {
      expect(reportStatusLabel(type)).not.toBe(type)
    }
    expect(reportStatusLabel('Inbound')).toBe('Nhập kho')
  })
})
