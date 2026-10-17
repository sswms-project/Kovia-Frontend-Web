import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { InventoryStock } from '../../types/inventory.types'
import { InventoryDirectory } from './InventoryDirectory'

const stock: InventoryStock = {
  id: 'stock-1',
  productId: 'product-1',
  sku: 'SKU-001',
  productName: 'Sản phẩm thử nghiệm',
  warehouseId: 'warehouse-1',
  warehouseName: 'Kho trung tâm',
  slotId: 'slot-1',
  slotCode: 'A-01',
  lotId: null,
  lotNumber: null,
  manufacturedDate: null,
  expiryDate: null,
  lotStatus: null,
  unitName: 'Cái',
  qualityStatus: 'Good',
  eligibilityStatus: 'Available',
  quantityOnHand: 10,
  reservedQuantity: 0,
  holdQuantity: 0,
  availableQuantity: 10,
  version: 'version-1',
  updatedAt: '2026-09-29T00:00:00Z',
  canManageWarehouse: false,
}

function renderDirectory(item: InventoryStock, otherItem?: InventoryStock) {
  render(
    <TooltipProvider>
      <InventoryDirectory
        permissions={[]}
        items={otherItem ? [item, otherItem] : [item]}
        totalCount={otherItem ? 2 : 1}
        page={1}
        pageSize={20}
        searchText=""
        warehouseId=""
        productId=""
        slotId=""
        warehouseOptions={[]}
        productOptions={[]}
        slotOptions={[]}
        snapshotAt="2026-09-29T00:00:00Z"
        isLoading={false}
        isFetching={false}
        isError={false}
        areFiltersLoading={false}
        areFiltersError={false}
        activeFilterCount={0}
        canReportDamaged
        onSearchChange={vi.fn()}
        onWarehouseChange={vi.fn()}
        onProductChange={vi.fn()}
        onSlotChange={vi.fn()}
        onResetFilters={vi.fn()}
        onRetryFilters={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onRetry={vi.fn()}
        onReportDamaged={vi.fn()}
      />
    </TooltipProvider>
  )
}

describe('InventoryDirectory', () => {
  it('distinguishes the same product in two rack locations without exposing technical slot codes', () => {
    renderDirectory(
      {
        ...stock,
        slotCode: '__SYSTEM_DEFAULT__',
        isSystemDefaultSlot: true,
        zoneCode: 'Z-01',
        rackCode: 'R-01',
      },
      {
        ...stock,
        id: 'stock-2',
        slotId: 'slot-2',
        slotCode: '__SYSTEM_DEFAULT__',
        isSystemDefaultSlot: true,
        zoneCode: 'Z-01',
        rackCode: 'R-02',
      }
    )
    expect(screen.getByRole('columnheader', { name: 'Kho / Vị trí' })).toBeInTheDocument()
    expect(screen.getByTitle('Khu vực Z-01 / Kệ R-01')).toBeInTheDocument()
    expect(screen.getByTitle('Khu vực Z-01 / Kệ R-02')).toBeInTheDocument()
    expect(screen.getAllByText(stock.productName)).toHaveLength(4)
    expect(screen.queryByText('__SYSTEM_DEFAULT__')).not.toBeInTheDocument()
  })
  it('identifies the base unit on desktop and mobile quantities', () => {
    renderDirectory(stock)
    expect(screen.getByRole('columnheader', { name: 'ĐVT chính' })).toBeInTheDocument()
    expect(screen.getByText('10 Cái')).toBeInTheDocument()
    expect(screen.getByText(/Thực tế 10 Cái/)).toBeInTheDocument()
  })
  it('does not show the slot snapshot subtitle', () => {
    renderDirectory(stock)
    expect(screen.getByRole('heading', { name: 'Danh sách tồn kho' })).toBeInTheDocument()
    expect(screen.queryByText(/Dữ liệu theo từng slot|Ảnh chụp/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Tồn kho khả dụng' })).toHaveClass(
      'sr-only'
    )
    expect(screen.queryByText('Kiểm soát tồn kho')).not.toBeInTheDocument()
    expect(screen.queryByText(/vị trí tồn kho/)).not.toBeInTheDocument()
  })

  it('marks stock outside assigned warehouses as read-only', () => {
    renderDirectory(stock)

    expect(screen.getAllByText('Chỉ xem')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Báo hỏng' })).not.toBeInTheDocument()
  })

  it('keeps warehouse actions for assigned stock', () => {
    renderDirectory({ ...stock, canManageWarehouse: true })

    expect(screen.getAllByRole('button', { name: 'Báo hỏng' })).toHaveLength(2)
    expect(screen.queryByText('Chỉ xem')).not.toBeInTheDocument()
  })
})
