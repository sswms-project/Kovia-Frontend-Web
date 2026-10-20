import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { putAwayFixture, putAwaySuggestionsFixture } from '../utils/transfer-receipt-test-fixtures'
import { buildTransfer, buildTransferItem, buildShipment } from '../utils/transfer-test-fixtures'
import TransferPutAwayPage from './TransferPutAwayPage'

const mock = vi.hoisted(() => ({
  rules: vi.fn(),
  rulesLoading: false,
  detailFetching: false,
  sheetFetching: false,
  missingSheet: false,
  canPlan: false,
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
  useTransferQuery: () => ({
    data: transfer,
    isLoading: false,
    isFetching: mock.detailFetching,
    refetch: vi.fn(),
  }),
  useTransferPutAwaySlotsQuery: () => ({ data: [], isFetching: false }),
}))
vi.mock('../hooks/use-transfer-receipt', () => ({
  useTransferPutAwaySheetQuery: () => ({
    data: mock.missingSheet ? undefined : sheet,
    isLoading: mock.missingSheet,
    isFetching: mock.sheetFetching,
  }),
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
  getTransferCapabilities: () => ({ canSetPutAwaySlots: mock.canPlan }),
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
  mock.detailFetching = false
  mock.sheetFetching = false
  mock.missingSheet = false
  mock.canPlan = false
  mock.form.formState.isDirty = false
  mock.ai.mockResolvedValue({ data: suggestions, isError: false })
})
afterEach(cleanup)
describe('Trang cất hàng — tự điền và AI theo yêu cầu', () => {
  it('waits for the complete sheet and stops rules during either snapshot refresh', () => {
    mock.canPlan = true
    mock.missingSheet = true
    const page = render(
      <TransferPutAwayPage transferId={transfer.id} shipmentId={sheet.receipt.shipmentId} />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(false)
    mock.missingSheet = false
    mock.detailFetching = true
    page.rerender(
      <TransferPutAwayPage transferId={transfer.id} shipmentId={sheet.receipt.shipmentId} />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(false)
    mock.detailFetching = false
    mock.sheetFetching = true
    page.rerender(
      <TransferPutAwayPage transferId={transfer.id} shipmentId={sheet.receipt.shipmentId} />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(false)
    mock.sheetFetching = false
    page.rerender(
      <TransferPutAwayPage transferId={transfer.id} shipmentId={sheet.receipt.shipmentId} />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(true)
  })
  it('renders the ready work area without waiting for optional rule suggestions', () => {
    mock.rulesLoading = true
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    expect(screen.queryByLabelText('Đang tải dữ liệu')).not.toBeInTheDocument()
    expect(screen.getByText(/Chỉ cất hàng tốt thực nhận/)).toBeInTheDocument()
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
