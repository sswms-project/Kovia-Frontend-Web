import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WarehouseLocationMapButton } from './WarehouseLocationMapButton'
import { warehouseLayoutSceneService } from '../../services/warehouse-layout-scene.service'
import { locationScene } from '../../utils/warehouse-stock-location.test-fixtures'

vi.mock('next/dynamic', () => ({
  default: () => (props: { selection: { id: string } }) => (
    <div data-testid="map-canvas">{props.selection.id}</div>
  ),
}))
vi.mock('../../services/warehouse-layout-scene.service', () => ({
  warehouseLayoutSceneService: { getScene: vi.fn() },
}))

const props = {
  warehouseId: 'warehouse-a',
  warehouseName: 'Kho A',
  slotId: 'slot-a',
  locationLabel: 'Z1 / R1 / S1',
  productLabel: 'SKU1 · Hàng A',
  accessScope: 'tenant-a:user-a:permission-v1',
  sourceVersion: 'stock-a:v1',
  canView: true,
  ready: true,
}
function mount(overrides = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (next = {}) => (
    <QueryClientProvider client={client}>
      <WarehouseLocationMapButton {...props} {...overrides} {...next} />
    </QueryClientProvider>
  )
  return { ...render(wrap()), wrap, client }
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const response = (data = locationScene()) => ({
  isSuccess: true,
  statusCode: 200,
  message: '',
  data,
})

describe('warehouse map location session', () => {
  it('loads only when opened, marks the resolved rack, and returns focus on close', async () => {
    vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue(response())
    mount()
    expect(warehouseLayoutSceneService.getScene).not.toHaveBeenCalled()
    const trigger = screen.getByRole('button', { name: /Xem sơ đồ vị trí/ })
    trigger.focus()
    fireEvent.click(trigger)
    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('rack-a')
    expect(screen.getByText('Z1 → R1 → S1')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })
  it('does not expose map access or request data without capability', () => {
    mount({ canView: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(warehouseLayoutSceneService.getScene).not.toHaveBeenCalled()
  })
  it('pauses the caller scanner on open and removes the map on capability revocation', async () => {
    vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue(response())
    const onOpen = vi.fn()
    const view = mount({ onOpen })
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    await screen.findByTestId('map-canvas')
    expect(onOpen).toHaveBeenCalledOnce()
    view.rerender(view.wrap({ canView: false }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
  it.each(['accessScope', 'sourceVersion', 'slotId'])(
    'closes an old session on %s changes',
    async (field) => {
      vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue(response())
      const view = mount()
      fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
      await screen.findByTestId('map-canvas')
      view.rerender(view.wrap({ [field]: 'new-context' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  )
  it('closes on source invalidation and disables opening until refreshed', async () => {
    vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue(response())
    const view = mount()
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    await screen.findByTestId('map-canvas')
    view.rerender(view.wrap({ ready: false }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('does not render cached geometry while refreshing or after a denied response', async () => {
    vi.mocked(warehouseLayoutSceneService.getScene)
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce({ statusCode: 403, message: 'Forbidden' })
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    await screen.findByTestId('map-canvas')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền')
    expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument()
  })
  it('uses textual fallback for unplaced racks, without displaying generated coordinates', async () => {
    const scene = locationScene()
    scene.racks[0]!.x = null
    vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue(response(scene))
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    expect(await screen.findByText(/Kệ hoặc khu vực chưa được đặt/)).toBeVisible()
    expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument()
  })
  it('rejects a scene for another warehouse', async () => {
    vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue(
      response({ ...locationScene(), warehouseId: 'warehouse-b' })
    )
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    expect(await screen.findByText(/Không tìm thấy vị trí đang hoạt động/)).toBeVisible()
    expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument()
  })
})
