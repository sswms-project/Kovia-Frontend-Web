import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReceiveGoodsDialog, ReceivingTaskDirectory } from '../components/ReceivingPage'
import InboundReceivingPage from './InboundReceivingPage'
import { APP_ROUTES } from '@/routes/app-routes'
import { OrderType } from '@/types/api'
import { OperationalDateSort } from '@/components/operations/OperationalDateSort'
import type { ReceivingTaskQuery } from '../types/inbound.types'

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
    refreshCreated: vi.fn(),
    nextCodeEnabled: vi.fn(),
    receivingQuery: vi.fn(),
    toastError: vi.fn(),
    receivingLocations: vi.fn(),
    getReceipt: vi.fn(),
    submit: vi.fn(),
    push: vi.fn(),
    task: {
      version: 'AQ==',
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
      assignedTo: '10000000-0000-4000-8000-000000000007',
      assignedToName: 'Nhân viên nhận hàng',
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
  useRouter: () => ({ push: fixtures.push }),
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
  useWarehouseTaskAssignmentAccess: () => ({
    canAssign: false,
    currentUserId: fixtures.task.assignedTo,
  }),
}))
vi.mock('../hooks/use-assign-warehouse-task', () => ({ useAssignWarehouseTask: () => ({}) }))
vi.mock('../components/TaskAssignment', () => ({ AssignWarehouseTaskDialog: () => null }))
vi.mock('@/components/operations/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: () => null,
}))
vi.mock('../hooks/use-inbound', () => ({
  useReceivingTasksQuery: (params: ReceivingTaskQuery) => {
    fixtures.receivingQuery(params)
    return { data: { items: [fixtures.task], totalCount: 1 } }
  },
  useGoodsReceiptQuery: () => ({}),
  useCreateGoodsReceiptMutation: () => ({
    mutateAsync: fixtures.create,
    isPending: false,
    refresh: fixtures.refreshCreated,
  }),
  useSubmitGoodsReceiptMutation: () => ({ mutateAsync: fixtures.submit, isPending: false }),
  useNextGoodsReceiptCodeQuery: (enabled: boolean) => {
    fixtures.nextCodeEnabled(enabled)
    return fixtures.codeQuery
  },
  useInboundDocumentImportQuery: () => ({}),
  useStartInboundDocumentImportMutation: () => ({}),
  useReviewInboundDocumentImportMutation: () => ({}),
  useCreateDraftFromDocumentMutation: () => ({}),
}))
vi.mock('../services/inbound.service', () => ({
  inboundService: {
    receivingLocations: fixtures.receivingLocations,
    getReceipt: fixtures.getReceipt,
  },
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
    <>
      <button onClick={() => props.onReceive(fixtures.task)}>Nhập thủ công</button>
      <button onClick={() => props.onPageChange(2)}>Trang tiếp</button>
      <button
        onClick={() => {
          props.onCreatedFromChange('2026-10-25T09:00')
          props.onCreatedToChange('2026-10-25T17:00')
        }}
      >
        Áp dụng giờ lọc
      </button>
      <OperationalDateSort value={props.sortDirection} onChange={props.onSortDirectionChange} />
    </>
  ),
  ReceiveGoodsDialog: (props: ComponentProps<typeof ReceiveGoodsDialog>) => {
    dialog = props
    if (!props.task) return null
    return (
      <>
        {props.receivingLocationField}
        <input
          aria-label="Mã phiếu nhận"
          {...props.form.register('receiptCode', { onChange: props.onReceiptCodeChange })}
        />
        <input
          aria-label="Số lượng chấp nhận nhận"
          type="number"
          {...props.form.register('lines.0.receivedQty', { valueAsNumber: true })}
        />
        <input
          aria-label="Số từ chối trước nhận"
          type="number"
          {...props.form.register('lines.0.rejectedQty', {
            setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
          })}
        />
        <input
          aria-label="Lý do từ chối nhận"
          {...props.form.register('lines.0.exceptionReason')}
        />
        <button onClick={props.onSaveDraft}>Lưu nháp</button>
        <button onClick={props.onSaveAndSubmit}>Lưu và gửi duyệt</button>
        <button onClick={() => props.onOpenChange(false)}>Đóng</button>
      </>
    )
  },
}))

function renderReceivingPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(<InboundReceivingPage />, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  fixtures.codeQuery.data = undefined
  fixtures.codeQuery.isFetching = true
  fixtures.codeQuery.isError = false
  fixtures.create.mockResolvedValue({ data: 'receipt' })
  fixtures.submit.mockResolvedValue({})
  fixtures.getReceipt.mockResolvedValue({ data: { version: 'Ag==' } })
  fixtures.receivingLocations.mockResolvedValue({
    data: {
      items: [
        {
          id: '10000000-0000-4000-8000-000000000006',
          zoneCode: 'K01',
          rackCode: 'A01',
          slotCode: '01',
          displayPath: 'Khu K01 / Kệ A01 / Ô 01',
        },
      ],
      totalCount: 1,
    },
  })
})
afterEach(cleanup)

describe('manual receipt code suggestion and persistence', () => {
  it('defaults to newest and resets pagination on sort changes while preserving the date-time filter', async () => {
    const user = userEvent.setup()
    renderReceivingPage()
    expect(fixtures.receivingQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageNumber: 1,
        sortDirection: OrderType.Descending,
      })
    )
    await user.click(screen.getByRole('button', { name: 'Áp dụng giờ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Trang tiếp' }))
    expect(fixtures.receivingQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 2 })
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sắp xếp theo ngày tạo' }),
      'Cũ nhất trước'
    )
    expect(fixtures.receivingQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageNumber: 1,
        sortDirection: OrderType.Ascending,
        createdFrom: '2026-10-25T09:00:00+07:00',
        createdTo: '2026-10-25T17:00:59.999+07:00',
      })
    )
  })
  it('fetches only while open, fills the suggestion and sends normalized code', async () => {
    const user = userEvent.setup()
    const page = renderReceivingPage()
    expect(fixtures.nextCodeEnabled).toHaveBeenLastCalledWith(false)
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    expect(fixtures.nextCodeEnabled).toHaveBeenLastCalledWith(true)
    fixtures.codeQuery.data = 'PN000001'
    fixtures.codeQuery.isFetching = false
    page.rerender(<InboundReceivingPage />)
    await waitFor(() => expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue('PN000001'))
    await user.clear(screen.getByLabelText('Mã phiếu nhận'))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), ' dn-pn0099 ')
    await user.clear(screen.getByLabelText('Số lượng chấp nhận nhận'))
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
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
    expect(fixtures.refreshCreated).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])(
    'never overwrites typing or an intentional clear when a suggestion arrives (clear=%s)',
    async (clear) => {
      const user = userEvent.setup()
      const page = renderReceivingPage()
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
    renderReceivingPage()
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
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    expect(dialog.isCodeSuggestionError).toBe(true)
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000001')
    await user.clear(screen.getByLabelText('Số lượng chấp nhận nhận'))
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(dialog.form.getFieldState('receiptCode').error?.type).toBe('server'))
    expect(screen.getByLabelText('Mã phiếu nhận')).toHaveValue('PN000001')
    expect(fixtures.toastError).toHaveBeenCalledWith('Mã phiếu nhận đã tồn tại.')
    act(() => dialog.form.clearErrors('receiptCode'))
  })

  it('reopening waits for a fresh suggestion and resets the previous custom code', async () => {
    const user = userEvent.setup()
    const page = renderReceivingPage()
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

describe('accepted receipt submission and receiving location', () => {
  it('submits with the creation version without fetching the full receipt', async () => {
    const user = userEvent.setup()
    fixtures.create.mockResolvedValueOnce({ data: 'receipt', version: 'Aw==' })
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000020')
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
    await screen.findByRole('option', { name: 'Khu K01 / Kệ A01 / Ô 01' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Vị trí tại khu chờ cất hàng' }),
      '10000000-0000-4000-8000-000000000006'
    )
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    await waitFor(() =>
      expect(fixtures.submit).toHaveBeenCalledWith(
        expect.objectContaining({ expectedVersion: 'Aw==' })
      )
    )
    expect(fixtures.getReceipt).not.toHaveBeenCalled()
  })

  it('keeps saving locked through the version read and skips intermediate refresh', async () => {
    const user = userEvent.setup()
    let resolveReceipt: (value: { data: { version: string } }) => void = () => undefined
    fixtures.getReceipt.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReceipt = resolve
      })
    )
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000010')
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
    await screen.findByRole('option', { name: 'Khu K01 / Kệ A01 / Ô 01' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Vị trí tại khu chờ cất hàng' }),
      '10000000-0000-4000-8000-000000000006'
    )
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    await waitFor(() => expect(fixtures.getReceipt).toHaveBeenCalledTimes(1))
    expect(dialog.isPending).toBe(true)
    expect(fixtures.refreshCreated).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    expect(fixtures.create).toHaveBeenCalledTimes(1)
    await act(async () => resolveReceipt({ data: { version: 'Ag==' } }))
    await waitFor(() => expect(fixtures.submit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByLabelText('Mã phiếu nhận')).not.toBeInTheDocument())
    expect(fixtures.refreshCreated).not.toHaveBeenCalled()
  })

  it('starts with no accepted quantity and refuses an empty receipt even with a valid code', async () => {
    const user = userEvent.setup()
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000010')
    expect(screen.getByLabelText('Số lượng chấp nhận nhận')).toHaveValue(0)
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() =>
      expect(dialog.form.getFieldState('lines.0.receivedQty').error?.message).toBe(
        'Nhập lượng chấp nhận hoặc từ chối lớn hơn 0.'
      )
    )
    expect(fixtures.create).not.toHaveBeenCalled()
    expect(fixtures.submit).not.toHaveBeenCalled()
  })

  it('requires a receiving location before creating and submitting accepted goods', async () => {
    const user = userEvent.setup()
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000010')
    await user.clear(screen.getByLabelText('Số lượng chấp nhận nhận'))
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
    await screen.findByRole('option', { name: 'Khu K01 / Kệ A01 / Ô 01' })
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    await waitFor(() =>
      expect(fixtures.toastError).toHaveBeenCalledWith(
        'Vui lòng chọn vị trí thực tế nhận hàng trước khi xác nhận.'
      )
    )
    expect(fixtures.create).not.toHaveBeenCalled()
    expect(fixtures.submit).not.toHaveBeenCalled()
  })

  it('creates a draft first then submits using the fresh receipt version and chosen location', async () => {
    const user = userEvent.setup()
    renderReceivingPage()
    expect(fixtures.receivingLocations).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000010')
    await user.clear(screen.getByLabelText('Số lượng chấp nhận nhận'))
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
    await screen.findByRole('option', { name: 'Khu K01 / Kệ A01 / Ô 01' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Vị trí tại khu chờ cất hàng' }),
      '10000000-0000-4000-8000-000000000006'
    )
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    await waitFor(() =>
      expect(fixtures.submit).toHaveBeenCalledWith({
        receiptId: 'receipt',
        expectedVersion: 'Ag==',
        receivingSlotId: '10000000-0000-4000-8000-000000000006',
      })
    )
    expect(fixtures.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInboundVersion: 'AQ==',
        lines: [expect.objectContaining({ receivedQty: 5, damagedQty: 0, rejectedQty: 0 })],
      })
    )
    expect(fixtures.getReceipt).toHaveBeenCalledWith('receipt')
    expect(fixtures.receivingLocations.mock.calls[0]![0]).toBe(fixtures.task.warehouseId)
    expect(fixtures.create.mock.invocationCallOrder[0]!).toBeLessThan(
      fixtures.getReceipt.mock.invocationCallOrder[0]!
    )
    expect(fixtures.getReceipt.mock.invocationCallOrder[0]!).toBeLessThan(
      fixtures.submit.mock.invocationCallOrder[0]!
    )
  })

  it('requires evidence for a refused-only receipt without demanding an accepted-stock location', async () => {
    const user = userEvent.setup()
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000010')
    await user.clear(screen.getByLabelText('Số từ chối trước nhận'))
    await user.type(screen.getByLabelText('Số từ chối trước nhận'), '2')
    await user.type(screen.getByLabelText('Lý do từ chối nhận'), 'Sai quy cách')
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    await waitFor(() =>
      expect(fixtures.toastError).toHaveBeenCalledWith(
        'Xác nhận bên giao giữ/mang về hàng từ chối và đính kèm bằng chứng trước khi gửi.'
      )
    )
    expect(fixtures.create).not.toHaveBeenCalled()
    expect(fixtures.submit).not.toHaveBeenCalled()
  })

  it('opens the saved draft after a failed submit without creating another receipt', async () => {
    const user = userEvent.setup()
    fixtures.submit.mockRejectedValueOnce(new Error('Network Error'))
    renderReceivingPage()
    await user.click(screen.getByRole('button', { name: 'Nhập thủ công' }))
    await user.type(screen.getByLabelText('Mã phiếu nhận'), 'PN000010')
    await user.clear(screen.getByLabelText('Số lượng chấp nhận nhận'))
    await user.type(screen.getByLabelText('Số lượng chấp nhận nhận'), '5')
    await screen.findByRole('option', { name: 'Khu K01 / Kệ A01 / Ô 01' })
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Vị trí tại khu chờ cất hàng' }),
      '10000000-0000-4000-8000-000000000006'
    )
    await user.click(screen.getByRole('button', { name: 'Lưu và gửi duyệt' }))
    await waitFor(() =>
      expect(fixtures.push).toHaveBeenCalledWith(APP_ROUTES.goodsReceiptDetail('receipt'))
    )
    expect(fixtures.create).toHaveBeenCalledTimes(1)
    expect(fixtures.submit).toHaveBeenCalledTimes(1)
    expect(fixtures.refreshCreated).toHaveBeenCalledTimes(1)
    expect(fixtures.toastError).toHaveBeenCalledWith(
      'Phiếu nhận hàng đã được lưu nháp nhưng chưa gửi duyệt. Bạn có thể thử lại từ trang chi tiết.'
    )
  })
})
