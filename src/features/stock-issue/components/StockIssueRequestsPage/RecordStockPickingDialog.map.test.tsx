import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecordStockPickingDialog } from './RecordStockPickingDialog'
import type { RecordStockPickingFormValues } from '../../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { warehouseLayoutSceneService } from '@/features/warehouse/services/warehouse-layout-scene.service'
import { locationScene } from '@/features/warehouse/utils/warehouse-stock-location.test-fixtures'

vi.mock('next/dynamic', () => ({
  default: () => (props: { selection: { id: string } }) => (
    <div data-testid="map-canvas">{props.selection.id}</div>
  ),
}))
vi.mock('@/features/warehouse/services/warehouse-layout-scene.service', () => ({
  warehouseLayoutSceneService: { getScene: vi.fn() },
}))
vi.mock('./StockIssuePickEntry', () => ({
  StockIssuePickEntry: () => <div>Scan entry preserved</div>,
}))

const order = {
  id: 'order-a',
  version: 'v1',
  warehouseId: 'warehouse-a',
  warehouseName: 'Kho A',
  stockIssueRequestCode: 'OUT-001',
  recipientName: 'Khách A',
  items: [
    {
      id: 'item-a',
      pickLocations: [
        { inventoryStockId: 'stock-a', slotId: 'slot-a', slotCode: 'S1' },
        { inventoryStockId: 'stock-b', slotId: 'slot-b', slotCode: 'S2' },
      ],
    },
  ],
} as unknown as StockIssueRequestSummary
const lines: RecordStockPickingFormValues['lines'] = ['a', 'b'].map((suffix) => ({
  stockIssueRequestItemId: 'item-a',
  inventoryStockId: `stock-${suffix}`,
  productId: 'product-a',
  productName: 'Hàng A',
  sku: 'SKU1',
  remainingQuantity: 10,
  availableQuantity: 5,
  pickedQuantity: 0,
  slotPath: suffix === 'a' ? 'Z1 / R1 / S1' : 'Z1 / R2 / S2',
  unitName: 'Cái',
  unitFactor: 1,
}))
function Harness({ needsRefresh = false, version = 'v1' }) {
  const form = useForm<RecordStockPickingFormValues>({ defaultValues: { lines } })
  return (
    <RecordStockPickingDialog
      order={{ ...order, version }}
      form={form}
      canViewMap
      mapAccessScope="tenant-a:user-a"
      needsRefresh={needsRefresh}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
    />
  )
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (props = {}) => (
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>
  )
  return { ...render(wrap()), wrap }
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
function mockScene() {
  const scene = locationScene()
  scene.racks.push({ ...scene.racks[0]!, id: 'rack-b', rackCode: 'R2' })
  scene.slots.push({ ...scene.slots[0]!, id: 'slot-b', rackId: 'rack-b', slotCode: 'S2' })
  vi.mocked(warehouseLayoutSceneService.getScene).mockResolvedValue({
    isSuccess: true,
    statusCode: 200,
    message: '',
    data: scene,
  })
}

describe('picking source map integration', () => {
  it('locates only the selected allocated source and returns to the picking dialog', async () => {
    mockScene()
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí Z1 \/ R1/ }))
    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('rack-a')
    const map = screen.getByRole('dialog', { name: 'Vị trí hàng trên sơ đồ' })
    fireEvent.click(within(map).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    fireEvent.click(screen.getAllByRole('button', { name: 'Lấy hàng' })[1]!)
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí Z1 \/ R2/ }))
    expect(await screen.findByTestId('map-canvas')).toHaveTextContent('rack-b')
    expect(screen.getByText('Scan entry preserved')).toBeInTheDocument()
  })
  it('closes geometry when the order version advances', async () => {
    mockScene()
    const view = mount()
    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ }))
    await screen.findByTestId('map-canvas')
    view.rerender(view.wrap({ version: 'v2' }))
    expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument()
  })
  it('blocks map opening while a saved picking source needs a refresh', () => {
    const view = mount()
    view.rerender(view.wrap({ needsRefresh: true }))
    expect(screen.getByRole('button', { name: /Xem sơ đồ vị trí/ })).toBeDisabled()
    expect(warehouseLayoutSceneService.getScene).not.toHaveBeenCalled()
  })
})
