import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReceiveGoodsDialog, ReceivingTaskDirectory } from '../components/ReceivingPage'
import InboundReceivingPage from './InboundReceivingPage'

vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false, buttonProps: { isPending: false, onExport: vi.fn() } }),
}))

const fixtures = vi.hoisted(() => {
  const codeQuery: { data?: string; isFetching: boolean; isError: boolean } = {
    isFetching: true,
    isError: false,
  }
  return {
    codeQuery,
    create: vi.fn(),
    nextCodeEnabled: vi.fn(),
    toastError: vi.fn(),
    task: {
      inboundRequestId: '10000000-0000-4000-8000-000000000001',
      inboundRequestCode: 'IR000001',
      warehouseId: '10000000-0000-4000-8000-000000000003',
      warehouseCode: 'WH01',
      warehouseName: 'Đà Nẵng',
      supplierId: '',
      supplierCode: null,
      supplierName: '',
      expectedDate: null,
      orderedQuantity: 10,
      receivedQuantity: 0,
      remainingQuantity: 10,
      activeDocumentImportId: null,
      activeGoodsReceiptId: null,
      activeGoodsReceiptStatus: null,
      assignedTo: null,
      assignedToName: null,
      assignedAt: null,
      executionStatus: 'Queued' as const,
      priority: 'Normal' as const,
      dueAt: null,
      lines: [
        {
          inboundRequestItemId: '10000000-0000-4000-8000-000000000002',
          productId: '10000000-0000-4000-8000-000000000004',
          productSKU: 'BIA',
          productName: 'Bia',
          barcodeValue: null,
          isLotTracked: false,
          orderedQuantity: 10,
          receivedQuantity: 0,
          remainingQuantity: 10,
          baseUnitId: '10000000-0000-4000-8000-000000000005',
          baseUnitName: 'Lon',
          enteredUnitId: '10000000-0000-4000-8000-000000000005',
          enteredUnitName: 'Lon',
          conversionFactorSnapshot: 1,
          baseUnitQuantityPrecision: 0,
          enteredUnitQuantityPrecision: 0,
        },
      ],
    },
  }
})
let dialog: ComponentProps<typeof ReceiveGoodsDialog>
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: fixtures.toastError } }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [] } }),
}))
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }))
vi.mock('@/hooks/use-local-storage', () => ({ useLocalStorage: () => [false, vi.fn()] }))
vi.mock('@/features/inbound-request/hooks/use-inbound-requests', () => ({
  useInboundRequestQuery: () => ({}),
}))
vi.mock('../hooks/use-warehouse-task-assignment-access', () => ({
  useWarehouseTaskAssignmentAccess: () => ({ canAssign: false }),
}))
vi.mock('../hooks/use-assign-warehouse-task', () => ({ useAssignWarehouseTask: () => ({}) }))
vi.mock('../components/TaskAssignment', () => ({ AssignWarehouseTaskDialog: () => null }))
vi.mock('@/components/operations/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: () => null,
}))
vi.mock('../hooks/use-inbound', () => ({
  useReceivingTasksQuery: () => ({ data: { items: [fixtures.task], totalCount: 1 } }),
  useGoodsReceiptQuery: () => ({}),
  useCreateGoodsReceiptMutation: () => ({ mutateAsync: fixtures.create, isPending: false }),
  useSubmitGoodsReceiptMutation: () => ({ isPending: false }),
  useNextGoodsReceiptCodeQuery: (enabled: boolean) => {
    fixtures.nextCodeEnabled(enabled)
    return fixtures.codeQuery
  },
  useInboundDocumentImportQuery: () => ({}),
  useStartInboundDocumentImportMutation: () => ({}),
  useReviewInboundDocumentImportMutation: () => ({}),
  useCreateDraftFromDocumentMutation: () => ({}),
}))
vi.mock('../components/InboundWorkspace', () => ({
  INBOUND_DETAIL_STORAGE_KEY: 'test',
  InboundPageHeader: () => null,
  InboundGoodsPreview: () => null,
  InboundMasterDetail: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../components/ReceivingPage', () => ({
  InboundDocumentImportDialog: () => null,
  ReceivingTaskStatsCards: () => null,
  ReceivingTaskDirectory: (props: ComponentProps<typeof ReceivingTaskDirectory>) => (
    <button onClick={() => props.onReceive(fixtures.task)}>Nhập thủ công</button>
  ),
  ReceiveGoodsDialog: (props: ComponentProps<typeof ReceiveGoodsDialog>) => {
    dialog = props
    if (!props.task) return null
    return (
      <>
        <input
          aria-label="Mã phiếu nhận"
          {...props.form.register('receiptCode', { onChange: props.onReceiptCodeChange })}
        />
        <button onClick={props.onSaveDraft}>Lưu nháp</button>
        <button onClick={() => props.onOpenChange(false)}>Đóng</button>
      </>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  fixtures.codeQuery.data = undefined
  fixtures.codeQuery.isFetching = true
  fixtures.codeQuery.isError = false
  fixtures.create.mockResolvedValue({ data: 'receipt' })
})
afterEach(cleanup)

describe('manual receipt code suggestion and persistence', () => {
  it('fetches only while open, fills the suggestion and sends normalized code', async () => {
    const user = userEvent.setup()
    const page = render(<InboundReceivingPage />)
    expect(fixtures.nextCodeEnabled).toHaveBeenLastCalledWith(false)
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    expect(fixtures.nextCodeEnabled).toHaveBeenLastCalledWith(true)
    fixtures.codeQuery.data = 'PN000001'
    fixtures.codeQuery.isFetching = false
    page.rerender(<InboundReceivingPage />)
    await waitFor(() => expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue('PN000001'))
    await user.clear(screen.getByLabelText('Mã phiếu nhận'))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), ' dn-pn0099 ')
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() =>
      expect(fixtures.create).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptCode: 'DN-PN0099',
          inboundRequestId: fixtures.task.inboundRequestId,
        })
      )
    )
    expect(fixtures.nextCodeEnabled).toHaveBeenLastCalledWith(false)
  })

  it.each([false, true])(
    'never overwrites typing or an intentional clear when a suggestion arrives (clear=%s)',
    async (clear) => {
      const user = userEvent.setup()
      const page = render(<InboundReceivingPage />)
      await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
      await user.type(screen.getByLabelText('Mã phiếu nhận'), 'CUSTOM01')
      if (clear) await user.clear(screen.getByLabelText('Mã phiếu nhận'))
      fixtures.codeQuery.data = 'PN000002'
      fixtures.codeQuery.isFetching = false
      page.rerender(<InboundReceivingPage />)
      expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue(clear ? '' : 'CUSTOM01')
    }
  )

  it('blocks an empty code on the first save and keeps the popup open', async () => {
    const user = userEvent.setup()
    render(<InboundReceivingPage />)
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() =>
      expect(dialog.form.getFieldState('receiptCode').error?.message).toBe(
        'Vui lòng nhập mã phiếu nhận.'
      )
    )
    expect(fixtures.create).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Mã phiếu nhận')).toBeInTheDocument()
  })

  it('allows manual entry when suggestions fail and preserves input after a duplicate error', async () => {
    const user = userEvent.setup()
    fixtures.codeQuery.isError = true
    fixtures.codeQuery.isFetching = false
    fixtures.create.mockRejectedValue({
      statusCode: 409,
      message: 'Mã phiếu nhận đã tồn tại.',
      errors: { code: ['GOODS_RECEIPT_CODE_CONFLICT'] },
    })
    render(<InboundReceivingPage />)
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    expect(dialog.isCodeSuggestionError).toBe(true)
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000001')
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(dialog.form.getFieldState('receiptCode').error?.type).toBe('server'))
    expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue('PN000001')
    expect(fixtures.toastError).toHaveBeenCalledWith('Mã phiếu nhận đã tồn tại.')
    act(() => dialog.form.clearErrors('receiptCode'))
  })

  it('reopening waits for a fresh suggestion and resets the previous custom code', async () => {
    const user = userEvent.setup()
    const page = render(<InboundReceivingPage />)
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'CUSTOM01')
    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    fixtures.codeQuery.data = 'PN000001'
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue('')
    fixtures.codeQuery.data = 'PN000002'
    fixtures.codeQuery.isFetching = false
    page.rerender(<InboundReceivingPage />)
    await waitFor(() => expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue('PN000002'))
  })
})
