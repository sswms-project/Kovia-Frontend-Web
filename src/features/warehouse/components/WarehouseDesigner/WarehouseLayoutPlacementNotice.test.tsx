import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { WarehouseLayoutEditorScene } from '../../types/warehouse-layout-scene.types'
import { WarehouseLayoutPlacementNotice } from './WarehouseLayoutPlacementNotice'

it('lets users locate colliding shelves and keeps suggestions locked when editing is blocked', () => {
  const rack = {
    id: 'a',
    zoneId: 'z',
    zoneCode: 'K01',
    rackCode: 'A01',
    rackName: 'Kệ 1',
    description: null,
    status: 'Active',
    x: 20,
    y: 60,
    width: 120,
    height: 40,
    rotation: 0,
    zIndex: 1,
  }
  const scene: WarehouseLayoutEditorScene = {
    canvas: { width: 800, height: 600, gridSize: 20 },
    zones: [
      {
        id: 'z',
        zoneCode: 'K01',
        zoneName: 'Hàng khô',
        status: 'Active',
        x: 0,
        y: 0,
        width: 500,
        height: 400,
        rotation: 0,
        zIndex: 0,
      },
    ],
    racks: [
      rack,
      { ...rack, id: 'b', rackCode: 'A02' },
      { ...rack, id: 'queued', placementPending: true },
    ],
    slots: [],
    decorations: [],
  }
  const onSelect = vi.fn(),
    onSuggest = vi.fn()
  render(
    <WarehouseLayoutPlacementNotice
      scene={scene}
      canSuggest={false}
      onSuggest={onSuggest}
      onSelect={onSelect}
    />
  )
  expect(screen.getByText(/1 khu\/kệ chưa bố trí/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sắp xếp gợi ý' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Xem 2 vị trí cần kiểm tra bố cục' }))
  fireEvent.click(screen.getByRole('button', { name: /Khu K01 · Hàng khô → Kệ A01/ }))
  expect(onSelect).toHaveBeenCalledExactlyOnceWith({ kind: 'rack', id: 'a' })
  expect(onSuggest).not.toHaveBeenCalled()
})
