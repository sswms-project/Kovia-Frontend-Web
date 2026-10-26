import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'
import { useReceiptDamageIsolation } from '../hooks/use-receipt-damage-isolation'
import type { GoodsReceiptDetail } from '../types/inbound.types'
import type { ReceivingLocation } from '../types/receipt-commands.types'
import { ReceiptDamageIsolationDialog } from './ReceiptDamageIsolationDialog'

const fixtures = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  mutate: vi.fn(),
  location: { selected: null as ReceivingLocation | null },
}))
vi.mock('@/lib/camera-scan', async (original) => ({
  ...(await original<typeof import('@/lib/camera-scan')>()),
  startCameraScan: fixtures.start,
  isCameraScanSupported: () => true,
}))
vi.mock('../hooks/use-inbound', () => ({
  useIsolateReceiptDamageMutation: () => ({
    isPending: false,
    mutateAsync: fixtures.mutate,
    reset: vi.fn(),
  }),
}))
vi.mock('../hooks/use-receiving-location-selection', () => ({
  useReceivingLocationSelection: () => ({
    selected: fixtures.location.selected,
    forDamageIsolation: true,
    search: '',
    page: 1,
    query: {
      isSuccess: true,
      isFetching: false,
      isError: false,
      data: { items: [], totalCount: 0 },
    },
    isSearching: false,
    searchFor: vi.fn(),
    changePage: vi.fn(),
    choose: vi.fn(),
  }),
}))

const receipt: GoodsReceiptDetail = {
  id: 'fixture-receipt',
  receiptCode: 'PN-DEMO',
  inboundRequestId: 'fixture-request',
  inboundRequestCode: 'NK-DEMO',
  warehouseId: 'fixture-warehouse',
  warehouseName: 'Kho minh họa',
  warehouseCode: 'DN',
  status: 'Approved',
  createdBy: 'fixture-user',
  createdByName: 'Nhân viên',
  createdAt: '',
  approvedBy: null,
  approvedByName: null,
  modifiedAt: null,
  submittedAt: null,
  approvedAt: null,
  rejectionReason: null,
  receivingSlotId: 'source-slot',
  arrivalStockPostedAt: null,
  sourceRequestVersion: null,
  arrivalConfirmedBy: null,
  arrivalConfirmedAt: null,
  receivingAssignedTo: null,
  receivingAssignedToName: null,
  putAwayAssignedTo: 'fixture-user',
  putAwayAssignedToName: 'Nhân viên',
  putAwayAssignedAt: null,
  putAwayTaskPriority: 'Normal',
  putAwayTaskDueAt: null,
  putAwayTaskExecutionStatus: 'InProgress',
  putAwayTaskCancelledAt: null,
  putAwayTaskCancellationReason: null,
  putAwayTaskRequiresReconciliation: false,
  putAwayTaskReconciledAt: null,
  putAwayTaskReconciliationNote: null,
  putAwayPlanUpdatedAt: null,
  version: 'fixture-v1',
  history: [],
  items: [],
}
function Harness() {
  const state = useReceiptDamageIsolation(receipt, true)
  return (
    <>
      <Button onClick={state.open}>Mở cách biệt</Button>
      <ReceiptDamageIsolationDialog state={state} />
    </>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  fixtures.start.mockResolvedValue({ stop: fixtures.stop })
  fixtures.location.selected = {
    id: 'destination',
    slotCode: 'IS01',
    zoneCode: 'Z',
    rackCode: 'R',
    displayPath: 'Điểm riêng IS01',
  }
})
afterEach(cleanup)

describe('damage isolation camera input', () => {
  it('fills only the code; never confirms physical separation or submits stock movement', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Mở cách biệt' }))
    expect(fixtures.start).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Bật camera: Mã vị trí cách biệt' }))
    await waitFor(() => expect(fixtures.start).toHaveBeenCalledTimes(1))
    await act(async () => fixtures.start.mock.calls[0]![1]('  IS01  '))
    expect(screen.getByLabelText('Mã vị trí thực tế')).toHaveValue('IS01')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(fixtures.mutate).not.toHaveBeenCalled()
    expect(fixtures.stop).toHaveBeenCalled()
  })

  it('requires a destination before starting and stops when the selected destination changes', async () => {
    fixtures.location.selected = null
    const view = render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Mở cách biệt' }))
    expect(screen.getByRole('button', { name: 'Bật camera: Mã vị trí cách biệt' })).toBeDisabled()
    fixtures.location.selected = {
      id: 'first',
      slotCode: 'IS01',
      zoneCode: 'Z',
      rackCode: 'R',
      displayPath: 'Điểm riêng',
    }
    view.rerender(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Bật camera: Mã vị trí cách biệt' }))
    await waitFor(() => expect(fixtures.start).toHaveBeenCalledTimes(1))
    const decode = fixtures.start.mock.calls[0]![1]
    fixtures.location.selected = { ...fixtures.location.selected, id: 'second', slotCode: 'IS02' }
    view.rerender(<Harness />)
    act(() => decode('IS01'))
    expect(screen.getByLabelText('Mã vị trí thực tế')).toHaveValue('')
    expect(fixtures.stop).toHaveBeenCalled()
    expect(fixtures.mutate).not.toHaveBeenCalled()
  })
})
