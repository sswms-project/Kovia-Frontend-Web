import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import InventoryPage from './InventoryPage'

const session = vi.hoisted(() => ({ permissions: new Array<string>() }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: session.permissions } }),
}))
vi.mock('@/features/inbound-request/hooks/use-inbound-requests', () => ({
  useProductOptionsQuery: () => ({ data: { items: [] }, isLoading: false, isError: false }),
}))
vi.mock('../hooks/use-inventory', () => ({
  useInventoryQuery: () => ({
    data: { items: [], totalCount: 1 },
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  useInventorySlotOptionsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useInventoryWarehouseOptionsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useMyWarehouseTasksQuery: () => ({ data: { items: [] } }),
  useReportDamagedStockMutation: () => ({ isPending: false }),
  useUploadInventoryEvidenceMutation: () => ({ isPending: false }),
}))
vi.mock('../hooks/use-inventory-export', () => ({
  useInventoryExport: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('../components/InventoryPage', () => ({
  InventoryDirectory: ({ exportAction }: { exportAction?: ReactNode }) => (
    <section>{exportAction}</section>
  ),
  InventoryExportButton: () => <button aria-label="Xuất Excel" />,
  ReportDamagedStockDialog: () => null,
}))

describe('InventoryPage export capability', () => {
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
