import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import type { WarehouseLayoutEditorScene } from '../../types/warehouse-layout-scene.types'
import { WarehouseUnplacedLocations } from './WarehouseUnplacedLocations'

it('finds an imported rack among 500 locations and selects its real ID without saving', async () => {
  const scene: WarehouseLayoutEditorScene = {
    canvas: { width: 1000, height: 600, gridSize: 20 },
    zones: [
      {
        id: 'zone',
        zoneCode: 'Z',
        zoneName: 'Khu',
        status: 'Active',
        x: 10,
        y: 10,
        width: 500,
        height: 300,
        rotation: 0,
        zIndex: 0,
      },
    ],
    racks: Array.from({ length: 500 }, (_, index) => ({
      id: `rack-${index}`,
      zoneId: 'zone',
      zoneCode: 'Z',
      rackCode: `R${index}`,
      rackName: `Kệ ${index}`,
      description: null,
      status: 'Active',
      placementPending: true,
      x: 20,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      zIndex: index,
    })),
    slots: [],
    decorations: [],
  }
  const onSelect = vi.fn()
  render(<WarehouseUnplacedLocations scene={scene} onSelect={onSelect} />)
  await userEvent.click(screen.getByRole('button', { name: 'Chưa sắp xếp (500)' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Tìm vị trí chưa sắp xếp' }), 'R499')
  await userEvent.click(screen.getByRole('button', { name: 'Chọn Z / R499' }))
  await waitFor(() =>
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ kind: 'rack', id: 'rack-499' })
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
