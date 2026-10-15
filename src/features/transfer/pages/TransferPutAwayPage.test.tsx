import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { putAwayFixture, putAwaySuggestionsFixture } from '../utils/transfer-receipt-test-fixtures'
import { buildTransfer, buildTransferItem, buildShipment } from '../utils/transfer-test-fixtures'
import TransferPutAwayPage from './TransferPutAwayPage'

const mock = vi.hoisted(() => ({
  rules: vi.fn(),
  rulesLoading: false,
  ai: vi.fn(),
  seed: vi.fn(),
  apply: vi.fn(),
  form: { watch: () => [], formState: { isDirty: false, errors: {} } },
}))
const sheet = putAwayFixture()
const suggestions = putAwaySuggestionsFixture()
const transfer = buildTransfer({
  items: [buildTransferItem({ id: sheet.rows[0]!.itemId })],
  shipments: [buildShipment({ id: sheet.receipt.shipmentId, status: 'AwaitingPutAway' })],
})
const putAway = {
  form: mock.form,
  fields: [],
  blocked: false,
  isPending: false,
  isFindingSlot: false,
  notice: null,
  unknownResult: false,
  changedLines: new Set(),
  confirmOpen: false,
  setConfirmOpen: vi.fn(),
  applySuggestions: mock.apply,
  requestConfirm: vi.fn(),
}
const editor = {
  isOpen: true,
  isDirty: false,
  isPending: false,
  open: vi.fn(),
  seedSuggestions: mock.seed,
}
vi.mock('../hooks/use-transfer-viewer', () => ({
  useTransferViewer: () => ({ viewer: {}, isReady: true }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLayoutQuery: () => ({ data: [], isFetching: false }),
}))
vi.mock('../hooks/use-transfers', () => ({
  useTransferQuery: () => ({ data: transfer, isLoading: false, refetch: vi.fn() }),
  useTransferPutAwaySlotsQuery: () => ({ data: [], isFetching: false }),
}))
vi.mock('../hooks/use-transfer-receipt', () => ({
  useTransferPutAwaySheetQuery: () => ({ data: sheet, isLoading: false }),
}))
vi.mock('../hooks/use-transfer-realtime', () => ({
  useTransferRealtime: () => ({ hasPendingChange: false }),
}))
vi.mock('../hooks/use-transfer-plan-editor', () => ({ useTransferPlanEditor: () => editor }))
vi.mock('../hooks/use-transfer-putaway-form', () => ({ useTransferPutAwayForm: () => putAway }))
vi.mock('../hooks/use-transfer-putaway-plan', () => ({
  useTransferPutAwayRulesQuery: (...args: unknown[]) => {
    mock.rules(...args)
    return {
      data: mock.rulesLoading ? undefined : suggestions,
      isFetching: mock.rulesLoading,
      error: null,
    }
  },
  useTransferPutAwayPlanSuggestionsQuery: () => ({
    data: suggestions,
    isFetching: false,
    refetch: mock.ai,
  }),
}))
vi.mock('../utils/transfer-capabilities', () => ({
  canSeeWarehouse: () => true,
  getTransferCapabilities: () => ({ canSetPutAwaySlots: false }),
  getShipmentCapabilities: () => ({ canOpenPutAway: true }),
}))
vi.mock('../components/TransferDetailPage', () => ({ TransferPutawayPlanWorkspace: () => null }))
vi.mock('../components/TransferFormPage', () => ({ TransferSlotMapDialog: () => null }))
vi.mock('../components/TransferWork', () => ({
  TransferPutAwayForm: () => null,
  TransferWorkHeader: () => null,
}))
vi.mock('../components/TransferShared', () => ({
  TransferChangedBanner: () => null,
  TransferUnsavedChanges: () => null,
  TransferConfirmDialog: ({
    open,
    title,
    onConfirm,
  }: {
    open: boolean
    title: string
    onConfirm: () => void
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onConfirm}>Đồng ý thay phân bổ</button>
      </div>
    ) : null,
}))
vi.mock('@/components/operations/putaway', () => ({
  PutawaySuggestionPanel: ({ state }: { state: { onApplyBest: () => void } }) => (
    <button onClick={state.onApplyBest}>Áp dụng gợi ý</button>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mock.rulesLoading = false
  mock.form.formState.isDirty = false
  mock.ai.mockResolvedValue({ data: suggestions, isError: false })
})
afterEach(cleanup)
describe('Trang cất hàng — tự điền và AI theo yêu cầu', () => {
  it('keeps one stable skeleton while initial rule suggestions are loading', () => {
    mock.rulesLoading = true
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    expect(screen.getByLabelText('Đang tải dữ liệu')).toBeInTheDocument()
    expect(screen.queryByText(/Chỉ cất hàng tốt thực nhận/)).not.toBeInTheDocument()
  })

  it('auto fills without requiring row creation, calling AI or sending a write', async () => {
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    await waitFor(() => expect(mock.apply).toHaveBeenCalledWith(suggestions, sheet, true))
    expect(mock.seed).toHaveBeenCalledWith(suggestions)
    expect(mock.ai).not.toHaveBeenCalled()
    expect(screen.getByText(/Chỉ cất hàng tốt thực nhận/)).toBeInTheDocument()
  })
  it('runs AI only on request and asks before replacing an edited allocation', async () => {
    mock.form.formState.isDirty = true
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý AI' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Áp dụng gợi ý' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng gợi ý' }))
    expect(
      screen.getByRole('dialog', { name: 'Thay phân bổ đang chỉnh bằng gợi ý?' })
    ).toBeInTheDocument()
    expect(mock.apply.mock.calls.filter((call) => call[2] === false)).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý thay phân bổ' }))
    expect(mock.apply).toHaveBeenCalledWith(suggestions, sheet, false, undefined)
    expect(mock.ai).toHaveBeenCalledTimes(1)
  })
})
