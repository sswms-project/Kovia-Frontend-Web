import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpeningStockImportSession } from './OpeningStockImportSession'

const mocks = vi.hoisted(() => ({ step: 1, activity: 'idle', uncertain: false }))
vi.mock('../hooks/use-opening-stock-import', () => ({
  useOpeningStockImport: () => ({
    ...mocks,
    file: { name: 'ton-dau.xlsx' },
    options: { warehouseId: 'warehouse', effectiveDate: '2026-10-17', spreadsheet: {} },
    inspection: { isCsv: false },
    preview: { rows: [], effectiveDate: '2026-10-17' },
    selected: [],
  }),
}))
vi.mock('../hooks/use-inventory', () => ({
  useInventoryWarehouseOptionsQuery: () => ({
    data: [
      {
        id: 'warehouse',
        warehouseCode: 'DN-01',
        warehouseName: 'Đà Nẵng',
        canManageWarehouse: true,
      },
    ],
  }),
}))
vi.mock('@/components/operations/use-import-navigation', () => ({
  useImportNavigation: () => ({}),
}))
vi.mock('@/components/operations/BulkImportMapping', () => ({ BulkImportMapping: () => null }))
vi.mock('./OpeningStockImportReview', () => ({ OpeningStockImportReview: () => null }))
vi.mock('./OpeningStockImportConfirmation', () => ({ OpeningStockImportConfirmation: () => null }))
vi.mock('@/components/operations/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: () => null,
}))
vi.mock('./OpeningStockImportContextDialog', () => ({
  OpeningStockImportContextDialog: ({
    open,
    warehouseId,
    effectiveDate,
  }: {
    open: boolean
    warehouseId: string
    effectiveDate: string
  }) =>
    open ? (
      <div role="dialog" aria-label="Đổi kho hoặc ngày ghi nhận">
        {warehouseId} · {effectiveDate}
      </div>
    ) : null,
}))

beforeEach(() => Object.assign(mocks, { step: 1, activity: 'idle', uncertain: false }))

describe('opening-stock import context summary', () => {
  it.each([1, 2])('groups context and working change action in a card at step %s', (step) => {
    mocks.step = step
    render(<OpeningStockImportSession />)
    const card = screen.getByLabelText('Kho và ngày ghi nhận')
    expect(card).toHaveAttribute('data-slot', 'card')
    expect(card).toHaveClass('shrink-0', 'border', 'border-foreground/10', 'ring-0')
    expect(card).not.toHaveClass('ring-1', 'border-l-4', 'border-l-primary')
    expect(
      within(card).getByText('Kho: DN-01 · Đà Nẵng · Ngày ghi nhận: 2026-10-17')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Tệp chỉ tạo phiếu nháp. Tồn kho chỉ tăng sau khi phiếu được duyệt.')
    ).not.toBeInTheDocument()
    if (step === 1) expect(within(card).getByText('ton-dau.xlsx')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Đổi kho/ngày' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('warehouse · 2026-10-17')
  })

  it.each([
    { activity: 'checking', uncertain: false },
    { activity: 'idle', uncertain: true },
  ])('locks context changes during unsafe states: %j', (state) => {
    Object.assign(mocks, state)
    render(<OpeningStockImportSession />)
    expect(screen.getByRole('button', { name: 'Đổi kho/ngày' })).toBeDisabled()
  })
})
