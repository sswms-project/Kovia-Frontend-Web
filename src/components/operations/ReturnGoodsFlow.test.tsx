import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import GoodsReturnRequestsPage from '@/features/stock-issue/pages/GoodsReturnRequestsPage'
import SupplierReturnsPage from '@/features/supplier-return/pages/SupplierReturnsPage'
import { buildSupplierReturn } from '@/features/supplier-return/components/SupplierReturnsPage/fixtures'
import type { GoodsReturnRequestSummary } from '@/features/stock-issue/types/stock-issue.types'
import { queryKeys } from '@/lib/query-keys'

const state = vi.hoisted(() => ({
  customerList: vi.fn(),
  customerDetail: vi.fn(),
  supplierList: vi.fn(),
  supplierDetail: vi.fn(),
  searchText: '',
  permissions: [] as string[],
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/supplier-returns',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/use-return-list-state', () => ({
  useReturnListState: () => ({
    page: 1,
    pageSize: 10,
    searchText: state.searchText,
    status: '',
    warehouseId: '',
    supplierId: '',
    dateFrom: '',
    dateTo: '',
    listHref: '/returns',
    detailHref: (id: string) => `/returns/${id}`,
  }),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'staff', permissions: state.permissions } }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => ({ data: { items: [] } }),
}))
vi.mock('@/features/supplier/hooks/use-suppliers', () => ({
  useSuppliersQuery: () => ({ data: { items: [] } }),
}))
vi.mock('@/hooks/use-return-document-editing', () => ({
  useReturnDocumentEditing: () => ({ dialog: {} }),
  useSaveReturnDocument: () => ({}),
}))
vi.mock('@/features/stock-issue/hooks/use-create-goods-return', () => ({
  useCreateGoodsReturn: () => ({ picker: {}, dialog: {}, openPicker: vi.fn() }),
}))
vi.mock('@/features/stock-issue/services/stock-issue.service', () => ({
  stockIssueService: {
    getGoodsReturnRequests: state.customerList,
    getGoodsReturnRequest: state.customerDetail,
  },
}))
vi.mock('@/features/supplier-return/services/supplier-return.service', () => ({
  supplierReturnService: {
    getSupplierReturns: state.supplierList,
    getSupplierReturn: state.supplierDetail,
  },
}))
vi.mock('@/components/operations/ReturnDocumentActions', () => ({
  ReturnDocumentActions: () => null,
  ReturnDocumentActionDialog: () => null,
}))
vi.mock('@/components/operations/OperationalMasterDetail', () => ({
  OperationalMasterDetail: ({
    children,
    detail,
    expanded,
    onExpandedChange,
  }: {
    children: ReactNode
    detail: ReactNode
    expanded: boolean
    onExpandedChange: (open: boolean) => void
  }) => (
    <>
      {children}
      <button onClick={() => onExpandedChange(!expanded)}>Mở khung</button>
      {detail}
    </>
  ),
}))
vi.mock('@/features/stock-issue/components/GoodsReturnRequestsPage', async () => ({
  GoodsReturnRequestDirectory: (
    await import('@/features/stock-issue/components/GoodsReturnRequestsPage/GoodsReturnRequestDirectory')
  ).GoodsReturnRequestDirectory,
  GoodsReturnRequestDetail: () => null,
  SelectStockIssueForReturnDialog: () => null,
  CreateGoodsReturnRequestDialog: () => null,
  RejectGoodsReturnRequestDialog: () => null,
  SelfApproveGoodsReturnDialog: () => null,
  RestockReturnDialog: () => null,
}))
vi.mock('@/features/supplier-return/components/SupplierReturnsPage', async () => ({
  SupplierReturnDirectory: (
    await import('@/features/supplier-return/components/SupplierReturnsPage/SupplierReturnDirectory')
  ).SupplierReturnDirectory,
  SupplierReturnDetail: () => null,
  CreateSupplierReturnDialog: () => null,
  ConfirmSupplierReturnDeliveryDialog: () => null,
  SupplierReturnDecisionDialog: () => null,
}))

const customer: GoodsReturnRequestSummary = {
  id: 'customer-1',
  goodsReturnRequestCode: 'RTN-1',
  stockIssueRequestId: 'issue',
  stockIssueRequestCode: 'XK-1',
  reason: 'Kiểm tra trả hàng',
  status: 'Approved',
  createdAt: '2026-10-27T00:00:00Z',
  createdBy: 'maker',
  approvedBy: null,
  approvedAt: null,
  rejectionReason: null,
  items: [
    {
      id: 'item',
      stockIssuePickDetailId: null,
      productId: 'product',
      productName: 'Bia',
      sku: 'SKU-CUSTOMER',
      quantity: 1,
      unitName: 'Thùng',
      condition: 'Good',
      restockSlotId: null,
      lotId: null,
      lotNumber: null,
    },
  ],
}
const supplier = buildSupplierReturn()
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  state.searchText = ''
  state.permissions = [P.GOODS_RETURN_REQUESTS_VIEW, P.SUPPLIER_RETURNS_VIEW]
  state.customerList.mockReset().mockResolvedValue({ data: { items: [customer], totalCount: 1 } })
  state.customerDetail.mockReset().mockResolvedValue({ data: customer })
  state.supplierList.mockReset().mockResolvedValue({ data: { items: [supplier], totalCount: 1 } })
  state.supplierDetail.mockReset().mockResolvedValue({ data: supplier })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it.each(['customer', 'supplier'] as const)(
  '%s never displays A under B while B is loading or a refetch fails',
  async (kind) => {
    const secondCustomer = {
      ...customer,
      id: 'customer-2',
      goodsReturnRequestCode: 'RTN-2',
      reason: 'Dòng thứ hai',
      items: customer.items.map((line) => ({ ...line, sku: 'SECOND-SKU' })),
    }
    const secondSupplier = {
      ...supplier,
      id: 'supplier-2',
      code: 'TNCC-2',
      supplierName: 'Dòng thứ hai',
      items: supplier.items.map((line) => ({ ...line, sku: 'SECOND-SKU' })),
    }
    state.customerList.mockResolvedValue({
      data: { items: [customer, secondCustomer], totalCount: 2 },
    })
    state.supplierList.mockResolvedValue({
      data: { items: [supplier, secondSupplier], totalCount: 2 },
    })
    let resolveSecond: (value: unknown) => void = () => {
      throw new Error('Second request not started')
    }
    const delayed = new Promise((resolve) => {
      resolveSecond = resolve
    })
    const detail = kind === 'customer' ? state.customerDetail : state.supplierDetail
    detail.mockImplementation((id: string) =>
      id === (kind === 'customer' ? customer.id : supplier.id)
        ? Promise.resolve({ data: kind === 'customer' ? customer : supplier })
        : delayed
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const Page = kind === 'customer' ? GoodsReturnRequestsPage : SupplierReturnsPage
    render(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    )
    await screen.findAllByText('Dòng thứ hai')
    const listTable = screen.getByRole('table')
    fireEvent.click(
      within(listTable).getByText(kind === 'customer' ? customer.reason : supplier.supplierName)
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mở khung' }))
    let preview = screen.getByRole('region', { name: 'Chi tiết hàng hóa trả lại' })
    await waitFor(() => expect(within(preview).getByRole('table')).toBeInTheDocument())
    fireEvent.click(within(listTable).getByText('Dòng thứ hai'))
    preview = screen.getByRole('region', { name: 'Chi tiết hàng hóa trả lại' })
    expect(within(preview).queryByRole('table')).not.toBeInTheDocument()
    expect(within(preview).getByText(kind === 'customer' ? 'RTN-2' : 'TNCC-2')).toBeInTheDocument()
    await act(async () =>
      resolveSecond({ data: kind === 'customer' ? secondCustomer : secondSupplier })
    )
    await waitFor(() => expect(within(preview).getByRole('table')).toBeInTheDocument())
    expect(
      within(within(preview).getByRole('table')).getAllByText('SECOND-SKU').length
    ).toBeGreaterThan(0)
    detail.mockRejectedValue(new Error('Permission denied'))
    await act(async () => {
      await client.invalidateQueries({
        queryKey:
          kind === 'customer'
            ? queryKeys.goodsReturnRequests.detail(secondCustomer.id)
            : queryKeys.supplierReturns.detail(secondSupplier.id),
      })
    })
    await waitFor(() =>
      expect(within(preview).getByRole('status')).toHaveTextContent(
        'Không thể tải chi tiết hàng hóa'
      )
    )
    expect(within(preview).queryByRole('table')).not.toBeInTheDocument()
  }
)

it.each(['customer', 'supplier'] as const)(
  '%s fetches only a selected, expanded preview and masks rows after filters/permission change',
  async (kind) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const Page = kind === 'customer' ? GoodsReturnRequestsPage : SupplierReturnsPage
    const detail = kind === 'customer' ? state.customerDetail : state.supplierDetail
    const content = (
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    )
    const view = render(content)
    const rowText = kind === 'customer' ? 'Kiểm tra trả hàng' : supplier.supplierName
    await screen.findAllByText(rowText)
    expect(detail).not.toHaveBeenCalled()
    const table = screen.getByRole('table')
    fireEvent.click(within(table).getByText(rowText))
    expect(detail).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Mở khung' }))
    await waitFor(() => expect(detail).toHaveBeenCalledTimes(1))
    const preview = screen.getByRole('region', { name: 'Chi tiết hàng hóa trả lại' })
    await waitFor(() => expect(within(preview).getByRole('table')).toBeInTheDocument())
    const code = within(table).getByRole('link', {
      name: kind === 'customer' ? 'RTN-1' : supplier.code,
    })
    expect(code).toHaveAttribute(
      'href',
      `/returns/${kind === 'customer' ? customer.id : supplier.id}`
    )
    state.permissions = []
    view.rerender(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    )
    expect(within(preview).queryByRole('table')).not.toBeInTheDocument()
    expect(detail).toHaveBeenCalledTimes(1)
    state.permissions = [P.GOODS_RETURN_REQUESTS_VIEW, P.SUPPLIER_RETURNS_VIEW]
    state.searchText = 'different'
    view.rerender(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    )
    expect(within(preview).queryByRole('table')).not.toBeInTheDocument()
  }
)
