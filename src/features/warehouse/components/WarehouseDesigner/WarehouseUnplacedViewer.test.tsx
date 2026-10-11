import { useImperativeHandle } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import type { WarehouseCanvasHandle } from './WarehouseCanvas'
import { WarehouseLayoutViewerWorkspace } from './WarehouseLayoutViewerWorkspace'
import { WarehouseDesignerWorkspace } from './WarehouseDesignerWorkspace'

const mocks = vi.hoisted(() => ({ compact: false, reveal: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast: { info: mocks.info } }))
vi.mock('next/dynamic', () => ({
  default: () =>
    function Canvas({
      ref,
      onSelect,
    }: {
      ref?: React.Ref<WarehouseCanvasHandle>
      onSelect: (selection: WarehouseLayoutSelection) => void
    }) {
      useImperativeHandle(ref, () => ({
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        zoomTo: vi.fn(),
        fit: vi.fn(),
        revealSelection: mocks.reveal,
      }))
      return <button onClick={() => onSelect({ kind: 'rack', id: 'rack' })}>Chọn trực tiếp</button>
    },
}))
vi.mock('../../hooks/use-layout-designer-compact', () => ({
  useLayoutDesignerCompact: () => mocks.compact,
}))
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useInventoryQuery: () => ({
    data: { items: [], totalCount: 0 },
    isPending: false,
    isFetching: false,
  }),
}))
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => null,
}))
vi.mock('../WarehouseDetailPage', () => ({ WarehouseLocationDeactivateDialog: () => null }))
const pointerMethods = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const
const originalPointerMethods = pointerMethods.map((method) =>
  Object.getOwnPropertyDescriptor(HTMLElement.prototype, method)
)
afterEach(() => {
  mocks.reveal.mockClear()
  mocks.info.mockClear()
  mocks.compact = false
  pointerMethods.forEach((method, index) => {
    const original = originalPointerMethods[index]
    if (original) Object.defineProperty(HTMLElement.prototype, method, original)
    else Reflect.deleteProperty(HTMLElement.prototype, method)
  })
})
beforeEach(() => {
  for (const method of pointerMethods) {
    Object.defineProperty(HTMLElement.prototype, method, {
      configurable: true,
      value: vi.fn(() => false),
    })
  }
})
const scene: WarehouseLayoutEditorScene = {
  canvas: { width: 1200, height: 800, gridSize: 20 },
  slots: [],
  decorations: [],
  zones: [
    {
      id: 'zone',
      zoneCode: 'Z',
      zoneName: 'Khu',
      status: 'Active',
      x: 0,
      y: 0,
      width: 600,
      height: 400,
      rotation: 0,
      zIndex: 0,
    },
  ],
  racks: [
    {
      id: 'rack',
      zoneId: 'zone',
      zoneCode: 'Z',
      rackCode: 'R',
      rackName: 'Kệ',
      description: null,
      status: 'Active',
      placementPending: true,
      x: 20,
      y: 20,
      width: 160,
      height: 60,
      rotation: 0,
      zIndex: 1,
    },
  ],
}
it.each([false, true])(
  'reveals selection after closing unplaced panels (compact=%s), not on ordinary clicks',
  async (compact) => {
    mocks.compact = compact
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <WarehouseLayoutViewerWorkspace
          warehouseId="w"
          warehouseName="Kho"
          scene={scene}
          canConfigure={false}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Chọn trực tiếp' }))
    expect(mocks.reveal).not.toHaveBeenCalled()
    if (compact) await user.click(screen.getByRole('button', { name: 'Vị trí & hàng hóa' }))
    await user.click(screen.getByRole('button', { name: 'Chưa sắp xếp (1)' }))
    await user.click(screen.getByRole('button', { name: 'Chọn Z / R' }))
    await waitFor(() =>
      expect(mocks.reveal).toHaveBeenCalledExactlyOnceWith({ kind: 'rack', id: 'rack' })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }
)

it.each([false, true])(
  'designer reveals imported items without saving or opening an inspector (compact=%s)',
  async (compact) => {
    mocks.compact = compact
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <TooltipProvider>
        <WarehouseDesignerWorkspace
          warehouseId="w"
          warehouseName="Kho"
          sceneVersion={1}
          resetRevision={0}
          initialScene={scene}
          hasGeneratedGeometry={false}
          canConfigure
          isSaving={false}
          isUpdatingRack={false}
          isDeactivatingZone={false}
          isDeactivatingRack={false}
          saveError={null}
          hasConflict={false}
          placementToApply={null}
          onPlacementApplied={vi.fn()}
          onCreateZone={vi.fn()}
          onCreateRack={vi.fn()}
          onOpenLocationDetails={vi.fn()}
          onUpdateRackName={vi.fn()}
          onDeactivateZone={vi.fn()}
          onDeactivateRack={vi.fn()}
          onSave={onSave}
          onReload={vi.fn()}
          isClosing={false}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Chọn trực tiếp' }))
    expect(mocks.reveal).not.toHaveBeenCalled()
    if (compact) await user.click(screen.getByRole('button', { name: 'Đối tượng' }))
    await user.click(screen.getByRole('button', { name: 'Chưa sắp xếp (1)' }))
    screen.getByRole('button', { name: 'Chọn Z / R' }).focus()
    await user.keyboard('{Enter}')
    if (compact) {
      const drawer = document.querySelector('[data-slot="drawer-content"]')!
      await waitFor(() => expect(drawer).toHaveAttribute('data-state', 'closed'))
      const animationEnd = new Event('animationend', { bubbles: true })
      // JSDOM does not finish Vaul's exit animation; dispatch the browser event explicitly.
      Object.defineProperty(animationEnd, 'animationName', {
        value: getComputedStyle(drawer).animationName,
      })
      fireEvent(drawer, animationEnd)
    }
    await waitFor(() =>
      expect(mocks.reveal).toHaveBeenCalledExactlyOnceWith({ kind: 'rack', id: 'rack' })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Đổ màu' }))
    await user.click(screen.getAllByRole('button', { name: /^Chọn màu #/ })[0]!)
    expect(mocks.info).toHaveBeenCalledExactlyOnceWith(
      'Hãy đặt vị trí trên sơ đồ trước khi đổi màu.'
    )
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Xoay hình' }))
    await user.click(screen.getByRole('button', { name: 'Đổ màu' }))
    await user.click(screen.getAllByRole('button', { name: /^Chọn màu #/ })[0]!)
    expect(mocks.info).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled()
  }
)
