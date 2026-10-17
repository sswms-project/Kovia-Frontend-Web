import { render, screen, fireEvent } from '@testing-library/react'
import type { ComponentProps } from 'react'
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

function renderDirectory(
  item: InventoryStock,
  otherItem?: InventoryStock,
  overrides: Partial<ComponentProps<typeof InventoryDirectory>> = {}
) {
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
        {...overrides}
      />
    </TooltipProvider>
  )
}

describe('InventoryDirectory', () => {
  it('shows inline filters without a sheet and only locks locations while they load', () => {
    const onWarehouseChange = vi.fn()
    const onProductChange = vi.fn()
    const onResetFilters = vi.fn()
    const onRetry = vi.fn()
    renderDirectory(stock, undefined, {
      warehouseId: 'warehouse-1',
      areSlotsLoading: true,
      activeFilterCount: 1,
      warehouseOptions: [{ value: 'warehouse-1', label: 'Kho trung tâm' }],
      productOptions: [{ value: 'product-1', label: 'Hàng QA' }],
      onWarehouseChange,
      onProductChange,
      onResetFilters,
      onRetry,
    })
    expect(screen.queryByRole('button', { name: /^Bộ lọc/ })).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'Có thể xem tồn kho toàn đơn vị. Thao tác chỉ áp dụng tại kho được phân công.'
      )
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Kho')).toBeEnabled()
    expect(screen.getByLabelText('Sản phẩm')).toBeEnabled()
    expect(screen.getByLabelText('Vị trí')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Kho'), { target: { value: 'warehouse-1' } })
    fireEvent.change(screen.getByLabelText('Sản phẩm'), { target: { value: 'product-1' } })
    expect(onWarehouseChange).toHaveBeenCalledWith('warehouse-1')
    expect(onProductChange).toHaveBeenCalledWith('product-1')
    expect(
      screen
        .getByRole('search', { name: 'Bộ lọc tồn kho' })
        .contains(screen.getByRole('button', { name: 'Làm mới tồn kho' }))
    ).toBe(false)
    expect(screen.queryByRole('button', { name: 'Đặt lại' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(onResetFilters).toHaveBeenCalledOnce()
    expect(onRetry).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới tồn kho' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onResetFilters).toHaveBeenCalledOnce()
  })
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
    expect(screen.queryByRole('heading', { name: 'Danh sách tồn kho' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tồn kho khả dụng' })).toBeInTheDocument()
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
