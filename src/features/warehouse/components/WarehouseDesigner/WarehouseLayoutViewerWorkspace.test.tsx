import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import { WarehouseLayoutViewerWorkspace } from './WarehouseLayoutViewerWorkspace'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'

const { inventoryQueryMock } = vi.hoisted(() => ({
  inventoryQueryMock: vi.fn(() => ({
    data: { items: Array<InventoryStock>(), totalCount: 0 },
    isPending: false,
    isFetching: false,
    isPlaceholderData: false,
    isError: false,
  })),
}))

vi.mock('next/dynamic', () => ({
  default: () =>
    function Canvas({ onSelect }: { onSelect: (value: WarehouseLayoutSelection) => void }) {
      return (
        <>
          <button onClick={() => onSelect({ kind: 'rack', id: 'rack' })}>Chọn kệ canvas</button>
          <button onClick={() => onSelect({ kind: 'zone', id: 'zone' })}>Chọn khu canvas</button>
          <button onClick={() => onSelect({ kind: 'slot', id: 'slot' })}>Chọn ô canvas</button>
        </>
      )
    },
}))
vi.mock('../../hooks/use-layout-designer-compact', () => ({
  useLayoutDesignerCompact: () => false,
}))
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useInventoryQuery: inventoryQueryMock,
}))
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({
    children,
    defaultSize,
    minSize,
    maxSize,
  }: {
    children: React.ReactNode
    defaultSize?: string
    minSize?: string
    maxSize?: string
  }) => (
    <div data-default-size={defaultSize} data-min-size={minSize} data-max-size={maxSize}>
      {children}
    </div>
  ),
  ResizableHandle: () => null,
}))

afterEach(() => {
  vi.useRealTimers()
  inventoryQueryMock.mockClear()
})

const scene: WarehouseLayoutEditorScene = {
  canvas: { width: 800, height: 600, gridSize: 10 },
  zones: [],
  slots: [],
  decorations: [],
  racks: [
    {
      id: 'rack',
      zoneId: 'zone',
      zoneCode: 'ZA',
      rackCode: 'R01',
      rackName: 'Kệ 1',
      description: null,
      status: 'Active',
      storageMode: 'RackLevel',
      x: 30,
      y: 30,
      width: 160,
      height: 60,
      rotation: 0,
      zIndex: 1,
      capacityType: 'Quantity',
      capacity: 20,
      capacityUnitName: 'Thùng',
      capacityUsed: 8,
      currentOccupancy: 192,
      remainingCapacity: 12,
      utilizationPercent: 40,
    },
  ],
}

describe('viewer capacity summary', () => {
  it.each([
    ['Chọn kệ canvas', 'rackId', 'rack'],
    ['Chọn khu canvas', 'zoneId', 'zone'],
    ['Chọn ô canvas', 'slotId', 'slot'],
  ])('filters physical stock server-side when using %s', (button, filter, id) => {
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(inventoryQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        warehouseId: 'warehouse',
        [filter]: id,
        inStockOnly: true,
        pageNumber: 1,
        pageSize: 20,
      }),
      true
    )
  })

  it('keeps physical stock visible when all units are held and availability is zero', () => {
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )
    const item: InventoryStock = {
      id: 'held-stock',
      productId: 'product',
      sku: 'SKU-HELD',
      productName: 'Hàng đang giữ',
      warehouseId: 'warehouse',
      warehouseName: 'Kho',
      slotId: 'slot',
      slotCode: 'A05',
      lotId: null,
      lotNumber: null,
      manufacturedDate: null,
      expiryDate: null,
      lotStatus: null,
      qualityStatus: 'Damaged',
      eligibilityStatus: 'DamageHold',
      quantityOnHand: 12,
      reservedQuantity: 0,
      holdQuantity: 12,
      availableQuantity: 0,
      version: null,
      updatedAt: null,
      canManageWarehouse: false,
    }
    inventoryQueryMock.mockReturnValueOnce({
      data: { items: [item], totalCount: 1 },
      isPending: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ canvas' }))
    expect(screen.getByText('SKU-HELD')).toBeInTheDocument()
    expect(screen.getByText('Hàng đang giữ')).toBeInTheDocument()
  })

  it('keeps both searches beside their headings and lets the left panel grow to forty percent', () => {
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )

    const locationSearch = screen.getByRole('searchbox', { name: 'Tìm vị trí trên sơ đồ' })
    const inventorySearch = screen.getByRole('searchbox', { name: 'Tìm hàng hóa tại vị trí' })

    expect(
      screen.getByRole('heading', { name: 'Danh sách vị trí' }).parentElement
    ).toContainElement(locationSearch)
    expect(
      screen.getByRole('heading', { name: 'Hàng hóa tại vị trí' }).parentElement
    ).toContainElement(inventorySearch)
    expect(inventorySearch).toBeDisabled()
    expect(document.querySelector('[data-max-size="40%"]')).toHaveAttribute(
      'data-default-size',
      '30%'
    )
  })

  it('debounces inventory search and resets it when the selected location changes', () => {
    vi.useFakeTimers()
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ canvas' }))
    const inventorySearch = screen.getByRole('searchbox', { name: 'Tìm hàng hóa tại vị trí' })
    fireEvent.change(inventorySearch, { target: { value: 'Bàn phím' } })
    act(() => vi.advanceTimersByTime(300))

    expect(inventoryQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerm: 'Bàn phím' }),
      true
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ canvas' }))
    expect(inventorySearch).toHaveValue('')
  })

  it('in picker mode confirms the selected location and offers quick picks', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          title="Chọn vị trí đến"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={onClose}
          picker={{
            description: 'Chọn ô cất hàng',
            quickPicksTitle: 'Vị trí có tồn',
            quickPicks: [{ slotId: 'slot-1', label: 'Khu K01 / Kệ A07 / A-01' }],
            evaluate: (selection) => ({
              summary: selection ? 'Đã chọn một vị trí' : 'Chưa chọn',
              canConfirm: selection?.kind === 'rack',
            }),
            onConfirm,
          }}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole('heading', { name: 'Chọn vị trí đến' })).toBeInTheDocument()
    expect(screen.getByText('Chọn ô cất hàng')).toBeInTheDocument()
    expect(screen.getByText('Khu K01 / Kệ A07 / A-01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ canvas' }))
    expect(screen.getByText('Đã chọn một vị trí')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }))
    expect(onConfirm).toHaveBeenCalledWith({ kind: 'rack', id: 'rack' })

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opens viewer guidance instead of the location sheet from the help button', () => {
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trợ giúp' }))

    expect(screen.getByText('Xem sơ đồ kho')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Vị trí và hàng hóa' })).not.toBeInTheDocument()
  })

  it('shows normalized usage and capacity unit for the selected rack', () => {
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ canvas' }))
    expect(screen.getByText('8 / 20')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Mức sử dụng sức chứa' })).toHaveAttribute(
      'aria-valuenow',
      '8'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '8 / 20 Thùng · Còn chỗ'
    )
  })
  it('shows a pending warning and edit action only for permitted viewers', () => {
    const onEdit = vi.fn()
    const pending = {
      ...scene,
      racks: scene.racks.map((rack) => ({
        ...rack,
        capacityType: 'None' as const,
        requiresCapacityConfiguration: true,
      })),
    }
    const result = render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={pending}
          canConfigure
          isClosing={false}
          onClose={vi.fn()}
          onEdit={onEdit}
        />
      </TooltipProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ canvas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cấu hình sức chứa' }))
    expect(onEdit).toHaveBeenCalledOnce()
    result.rerender(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="warehouse"
          warehouseName="Kho"
          scene={pending}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
          onEdit={onEdit}
        />
      </TooltipProvider>
    )
    expect(screen.queryByRole('button', { name: 'Cấu hình sức chứa' })).not.toBeInTheDocument()
  })
})
