import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '@/features/warehouse/types/warehouse-layout-scene.types'
import type { WarehouseLayoutPicker } from '@/features/warehouse/components/WarehouseDesigner/WarehouseLayoutViewerWorkspace'
import { TransferSlotMapDialog } from './TransferSlotMapDialog'

const { sceneQueryMock } = vi.hoisted(() => ({
  sceneQueryMock: vi.fn(),
}))

vi.mock('@/features/warehouse/components/WarehouseDesigner', () => ({
  // Thay màn xem sơ đồ kho bằng bản đơn giản: vẫn dùng đúng hợp đồng `picker` mà hộp thoại truyền vào.
  WarehouseLayoutViewerWorkspace: ({
    scene,
    isClosing,
    onClose,
    picker,
  }: {
    scene: WarehouseLayoutEditorScene
    isClosing: boolean
    onClose: () => void
    picker: WarehouseLayoutPicker
  }) => {
    const [selection, setSelection] = useState<WarehouseLayoutSelection | null>(null)
    const state = picker.evaluate(selection)
    return (
      <section className={isClosing ? 'translate-y-full' : 'translate-y-0'} data-testid="viewer">
        <button onClick={onClose}>Đóng sơ đồ kho</button>
        <button onClick={() => setSelection({ kind: 'rack', id: 'r1' })}>Kệ theo ô</button>
        <button onClick={() => setSelection({ kind: 'rack', id: 'r2' })}>Kệ theo kệ</button>
        {scene.slots.map((slot) => (
          <button key={slot.id} onClick={() => setSelection({ kind: 'slot', id: slot.id })}>
            {`Ô ${slot.slotCode}`}
          </button>
        ))}
        {picker.quickPicks?.map((location) => (
          <button
            key={location.slotId}
            onClick={() => setSelection({ kind: 'slot', id: location.slotId })}
          >
            {location.label}
          </button>
        ))}
        <div>{state.summary}</div>
        <button
          disabled={!state.canConfirm}
          onClick={() => selection && picker.onConfirm(selection)}
        >
          Chọn
        </button>
      </section>
    )
  },
}))
vi.mock('@/features/warehouse/hooks/use-warehouse-layout-scene', () => ({
  useWarehouseLayoutSceneQuery: sceneQueryMock,
}))
vi.mock('@/features/warehouse/utils/layout-scene-mapper', () => ({
  mapWarehouseLayoutScene: (scene: WarehouseLayoutEditorScene) => ({ editorScene: scene }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  sceneQueryMock.mockReset()
})

/** Chờ hết hiệu ứng trượt xuống trước khi hộp thoại báo đã đóng. */
function finishClosingAnimation() {
  act(() => {
    vi.advanceTimersByTime(200)
  })
}

function slot(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    zoneId: 'z1',
    rackId: 'r1',
    slotCode: id.toUpperCase(),
    slotName: id,
    description: null,
    occupancyStatus: 'Empty',
    isActive: true,
    isOutboundStaging: false,
    capacity: null,
    currentOccupancy: 0,
    ...overrides,
  }
}

const scene = {
  canvas: { width: 100, height: 100, gridSize: 10 },
  zones: [{ id: 'z1', zoneCode: 'K01' }],
  racks: [
    { id: 'r1', rackCode: 'A07', zoneId: 'z1', storageMode: 'SlotLevel', status: 'Active' },
    {
      id: 'r2',
      rackCode: 'C02',
      zoneId: 'z1',
      storageMode: 'RackLevel',
      defaultSlotId: 'c-default',
      status: 'Active',
    },
  ],
  decorations: [],
  slots: [slot('a-01'), slot('b-01', { isActive: false })],
}

function renderDialog(props: { allowedLocations?: { slotId: string; label: string }[] } = {}) {
  sceneQueryMock.mockReturnValue({ data: scene, isError: false, error: null })
  const onConfirm = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <TransferSlotMapDialog
      open
      title="Chọn vị trí đến trên sơ đồ kho nhập"
      description="Mô tả"
      warehouseId="w1"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...props}
    />
  )
  return { onConfirm, onOpenChange }
}

describe('TransferSlotMapDialog', () => {
  it('cannot confirm until a slot is selected, and a rack asks for a slot inside it', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeDisabled()
    fireEvent.click(screen.getByText('Kệ theo ô'))
    expect(
      screen.getByText('Kệ này quản lý theo từng ô. Hãy chọn một ô trong kệ.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeDisabled()
  })

  it('confirms a whole rack when it is managed at rack level', () => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByText('Kệ theo kệ'))
    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }))
    expect(onConfirm).toHaveBeenCalledWith({ slotId: 'c-default', label: 'Khu K01 / Kệ C02' })
  })

  it('confirms the slot picked in the tree with its Khu / Kệ / Ô label', () => {
    const { onConfirm, onOpenChange } = renderDialog()
    fireEvent.click(screen.getByText('Ô A-01'))
    expect(screen.getByText('Khu K01 / Kệ A07 / A-01')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }))
    expect(onConfirm).toHaveBeenCalledWith({ slotId: 'a-01', label: 'Khu K01 / Kệ A07 / A-01' })
    expect(screen.getByTestId('viewer')).toHaveClass('translate-y-full')
    expect(onOpenChange).not.toHaveBeenCalled()
    finishClosingAnimation()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not let an inactive slot be chosen as a destination', () => {
    const { onConfirm } = renderDialog()
    fireEvent.click(screen.getByText('Ô B-01'))
    expect(screen.getByText('Ô đang ngừng sử dụng.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('for a source only accepts slots that hold the product and lists them for quick picking', () => {
    const { onConfirm } = renderDialog({
      allowedLocations: [{ slotId: 'a-01', label: 'Khu K01 / Kệ A07 / A-01 · còn 12' }],
    })
    fireEvent.click(screen.getByText('Ô B-01'))
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeDisabled()

    fireEvent.click(screen.getByText('Khu K01 / Kệ A07 / A-01 · còn 12'))
    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }))
    expect(onConfirm).toHaveBeenCalledWith({
      slotId: 'a-01',
      label: 'Khu K01 / Kệ A07 / A-01 · còn 12',
    })
  })

  it('opens as a full page and closes with Escape or the close button without confirming', () => {
    const { onConfirm, onOpenChange } = renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng sơ đồ kho' }))
    finishClosingAnimation()
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows the server message when the warehouse map cannot be loaded', () => {
    sceneQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      error: { statusCode: 403, message: 'Bạn không có quyền xem sơ đồ kho.' },
    })
    render(
      <TransferSlotMapDialog
        open
        title="Chọn vị trí"
        description="Mô tả"
        warehouseId="w1"
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Bạn không có quyền xem sơ đồ kho.')
  })
})
