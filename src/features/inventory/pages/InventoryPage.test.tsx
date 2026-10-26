import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import type { InventoryListQuery } from '../types/inventory.types'
import InventoryPage from './InventoryPage'

const session = vi.hoisted(() => ({
  permissions: new Array<string>(),
  export: vi.fn(),
  read: vi.fn((params: InventoryListQuery) => ({
    data: { items: [], totalCount: 1, pageNumber: params.pageNumber, pageSize: params.pageSize },
    isLoading: false,
    isFetching: false,
    isError: false,
  })),
}))
beforeEach(() => vi.clearAllMocks())
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: session.permissions } }),
}))
vi.mock('@/features/inbound-request/hooks/use-inbound-requests', () => ({
  useProductOptionsQuery: () => ({ data: { items: [] }, isLoading: false, isError: false }),
}))
vi.mock('../hooks/use-inventory', () => ({
  useInventoryQuery: session.read,
  useInventorySlotOptionsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useInventoryWarehouseOptionsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useMyWarehouseTasksQuery: () => ({ data: { items: [] } }),
  useReportDamagedStockMutation: () => ({ isPending: false }),
  useUploadInventoryEvidenceMutation: () => ({ isPending: false }),
}))
vi.mock('../hooks/use-inventory-export', () => ({
  useInventoryExport: () => ({ isPending: false, mutate: session.export }),
}))
vi.mock('../components/InventoryPage', () => ({
  InventoryDirectory: ({
    exportAction,
    showDepleted,
    onShowDepletedChange,
    onPageChange,
    onResetFilters,
  }: Pick<
    ComponentProps<typeof import('../components/InventoryPage').InventoryDirectory>,
    'exportAction' | 'showDepleted' | 'onShowDepletedChange' | 'onPageChange' | 'onResetFilters'
  >) => (
    <section>
      {exportAction}
      <input
        type="checkbox"
        aria-label="Hiện hàng đã hết tồn"
        checked={showDepleted}
        onChange={(event) => onShowDepletedChange(event.target.checked)}
      />
      <button onClick={() => onPageChange(2)}>Trang 2</button>
      <button onClick={onResetFilters}>Xóa bộ lọc</button>
    </section>
  ),
  InventoryExportButton: ({ onExport }: { onExport: () => void }) => (
    <button aria-label="Xuất Excel" onClick={onExport} />
  ),
  ReportDamagedStockDialog: () => null,
}))

describe('InventoryPage export capability', () => {
  it('defaults to physical stock, resets pagination on toggle, and exports the same filter', () => {
    session.permissions = [P.INVENTORY_VIEW, P.LISTS_EXPORT]
    render(<InventoryPage />)
    expect(session.read).toHaveBeenLastCalledWith(
      expect.objectContaining({ inStockOnly: true, pageNumber: 1 })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(session.export).toHaveBeenLastCalledWith({ inStockOnly: true })
    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }))
    expect(session.read).toHaveBeenLastCalledWith(expect.objectContaining({ pageNumber: 2 }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hiện hàng đã hết tồn' }))
    expect(session.read).toHaveBeenLastCalledWith(
      expect.objectContaining({ inStockOnly: false, pageNumber: 1 })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    expect(session.export).toHaveBeenLastCalledWith({ inStockOnly: false })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByRole('checkbox', { name: 'Hiện hàng đã hết tồn' })).not.toBeChecked()
    expect(session.read).toHaveBeenLastCalledWith(
      expect.objectContaining({ inStockOnly: true, pageNumber: 1 })
    )
  })
  it.each([
    { permissions: [P.INVENTORY_VIEW], visible: false },
    { permissions: [P.LISTS_EXPORT], visible: false },
    { permissions: [P.INVENTORY_VIEW, P.LISTS_EXPORT], visible: true },
    { permissions: [P.INVENTORY_VIEW, 'inventory:export'], visible: false },
    { permissions: [P.PRODUCTS_VIEW, P.LISTS_EXPORT], visible: false },
  ])('requires inventory view AND common export: $permissions', ({ permissions, visible }) => {
    session.permissions = permissions
    render(<InventoryPage />)
    const button = screen.queryByRole('button', { name: 'Xuất Excel' })
    if (visible) expect(button).toBeInTheDocument()
    else expect(button).not.toBeInTheDocument()
  })
})
