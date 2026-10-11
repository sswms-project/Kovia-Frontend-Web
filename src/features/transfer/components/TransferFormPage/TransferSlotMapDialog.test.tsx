import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '@/features/warehouse/types/warehouse-layout-scene.types'
import { TransferSlotMapDialog } from './TransferSlotMapDialog'

const { sceneQueryMock } = vi.hoisted(() => ({
  sceneQueryMock: vi.fn(),
}))

vi.mock('next/dynamic', () => ({
  default: () =>
    function Canvas({ onSelect }: { onSelect: (value: WarehouseLayoutSelection) => void }) {
      return <button onClick={() => onSelect({ kind: 'rack', id: 'rack' })}>Kệ trên sơ đồ</button>
    },
}))
vi.mock('@/features/warehouse/components/WarehouseDesigner', () => ({
  DesignerToolbox: ({
    scene,
    onSelect,
  }: {
    scene: WarehouseLayoutEditorScene
    onSelect: (value: WarehouseLayoutSelection) => void
  }) => (
    <ul>
      {scene.slots.map((slot) => (
        <li key={slot.id}>
          <button
            onClick={() => onSelect({ kind: 'slot', id: slot.id })}
          >{`Ô ${slot.slotCode}`}</button>
        </li>
      ))}
    </ul>
  ),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse-layout-scene', () => ({
  useWarehouseLayoutSceneQuery: sceneQueryMock,
}))
vi.mock('@/features/warehouse/utils/layout-scene-mapper', () => ({
  mapWarehouseLayoutScene: (scene: WarehouseLayoutEditorScene) => ({ editorScene: scene }),
}))

afterEach(() => {
  cleanup()
  sceneQueryMock.mockReset()
})

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
  racks: [{ id: 'r1', rackCode: 'A07' }],
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
    fireEvent.click(screen.getByText('Kệ trên sơ đồ'))
    expect(screen.getByText('Chọn một ô trong kệ ở danh sách bên trái.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn' })).toBeDisabled()
  })

  it('confirms the slot picked in the tree with its Khu / Kệ / Ô label', () => {
    const { onConfirm, onOpenChange } = renderDialog()
    fireEvent.click(screen.getByText('Ô A-01'))
    expect(screen.getByText('Khu K01 / Kệ A07 / A-01')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }))
    expect(onConfirm).toHaveBeenCalledWith({ slotId: 'a-01', label: 'Khu K01 / Kệ A07 / A-01' })
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
