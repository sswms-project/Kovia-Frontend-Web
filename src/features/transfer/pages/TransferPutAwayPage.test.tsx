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
  canResume: true,
  resume: vi.fn(),
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
  reloadRequired: false,
  notice: null,
  unknownResult: false,
  changedLines: new Set(),
  confirmOpen: false,
  setConfirmOpen: vi.fn(),
  applySuggestions: mock.apply,
  requestConfirm: vi.fn(),
  acceptFresh: vi.fn(),
}
const editor = {
  isOpen: true,
  isDirty: false,
  isPending: false,
  open: vi.fn(),
  seedSuggestions: mock.seed,
  rebase: vi.fn(),
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
    refetch: async () => ({ data: transfer, isError: false }),
  }),
  useTransferPutAwaySlotsQuery: () => ({ data: [], isFetching: false }),
}))
vi.mock('../hooks/use-transfer-receipt', () => ({
  useResumeTransferPutAwayMutation: () => ({ isPending: false, mutateAsync: mock.resume }),
  useTransferPutAwaySheetQuery: () => ({
    data: mock.missingSheet ? undefined : sheet,
    isLoading: mock.missingSheet,
    isFetching: mock.sheetFetching,
    refetch: async () => ({ data: sheet, isError: false }),
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
  canHandleTransferPutAway: () => mock.canResume,
}))
vi.mock('../components/TransferDetailPage', () => ({ TransferPutawayPlanWorkspace: () => null }))
vi.mock('../components/TransferFormPage', () => ({ TransferSlotMapDialog: () => null }))
vi.mock('../components/TransferWork', async () => ({
  TransferPutAwayStatus: (await import('../components/TransferWork/TransferPutAwayStatus'))
    .TransferPutAwayStatus,
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
  mock.canResume = true
  mock.resume.mockResolvedValue(undefined)
  sheet.canResumePutAway = false
  sheet.receipt.keptAtReceiving = false
  sheet.receipt.status = 'AwaitingPutAway'
  putAway.reloadRequired = false
  putAway.unknownResult = false
  transfer.status = 'InProgress'
  mock.form.formState.isDirty = false
  mock.ai.mockResolvedValue({ data: suggestions, isError: false })
})
afterEach(cleanup)
describe('Trang cất hàng — tự điền và AI theo yêu cầu', () => {
  it('offers continuation for eligible kept stock and reloads the existing workflow after reopening', async () => {
    sheet.canResumePutAway = true
    sheet.receipt.keptAtReceiving = true
    sheet.receipt.status = 'Received'
    transfer.status = 'Completed'
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục cất vào kệ' }))
    await waitFor(() => expect(mock.resume).toHaveBeenCalledOnce())
    expect(mock.resume).toHaveBeenCalledWith({
      transferId: transfer.id,
      shipmentId: sheet.receipt.shipmentId,
      request: { expectedVersion: sheet.receipt.version, commandId: expect.any(String) },
    })
    await waitFor(() => expect(putAway.acceptFresh).toHaveBeenCalledWith(sheet))
  })

  it('does not offer continuation to an unassigned viewer without task management permission', () => {
    sheet.canResumePutAway = true
    sheet.receipt.keptAtReceiving = true
    mock.canResume = false
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    expect(screen.queryByRole('button', { name: 'Tiếp tục cất vào kệ' })).not.toBeInTheDocument()
  })

  it('still allows valid putaway suggestions while another discrepancy awaits resolution', () => {
    transfer.status = 'AwaitingResolution'
    render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(true)
  })
  it('does not request or apply suggestions between a committed write and fresh snapshots', () => {
    putAway.reloadRequired = true
    const page = render(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(false)
    expect(mock.apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý AI' }))
    expect(mock.ai).not.toHaveBeenCalled()
    putAway.reloadRequired = false
    transfer.status = 'Completed'
    page.rerender(
      <TransferPutAwayPage
        transferId={transfer.id}
        shipmentId={sheet.receipt.shipmentId}
        initialTab="execution"
      />
    )
    expect(mock.rules.mock.lastCall?.[3]).toBe(false)
    expect(mock.apply).not.toHaveBeenCalled()
  })

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
    expect(
      screen.getByRole('button', { name: 'Thông tin về tồn kho khi cất hàng' })
    ).toBeInTheDocument()
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
    expect(
      screen.getByRole('button', { name: 'Thông tin về tồn kho khi cất hàng' })
    ).toBeInTheDocument()
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
