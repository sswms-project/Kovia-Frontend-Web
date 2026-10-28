import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { OrderType } from '@/types/api'
import type { Supplier } from '../types/supplier.types'
import type { InboundRequestSummary } from '@/features/inbound-request/types/inbound-request.types'
import { queryKeys } from '@/lib/query-keys'
import SupplierDetailPage from './SupplierDetailPage'

const state = vi.hoisted(() => ({
  supplierId: 'supplier-a',
  permissions: [] as string[],
  fetch: vi.fn(),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: state.permissions } }),
}))
vi.mock('../hooks/use-suppliers', () => ({
  useSupplierQuery: () => ({
    data: {
      id: state.supplierId,
      supplierCode: 'NCC1',
      supplierName: 'Nhà cung cấp',
      phone: '',
      status: 'Active',
      createdAt: '2026-10-28T00:00:00Z',
    } satisfies Partial<Supplier>,
  }),
  useUpdateSupplierMutation: () => ({}),
  useDeactivateSupplierMutation: () => ({}),
  useReactivateSupplierMutation: () => ({}),
}))
vi.mock('../components/SuppliersPage', () => ({
  SupplierStatusBadge: () => null,
  SupplierEditDialog: () => null,
  SupplierDeactivateDialog: () => null,
  SupplierReactivateDialog: () => null,
}))
vi.mock('@/features/inbound-request/services/inbound-request.service', () => ({
  inboundRequestService: { getInboundRequests: state.fetch },
}))

const row: InboundRequestSummary = {
  id: 'request-a',
  inboundRequestCode: 'NK000016',
  warehouseId: 'warehouse',
  warehouseCode: 'DN-01',
  warehouseName: 'Đà Nẵng',
  supplierId: 'supplier-a',
  supplierName: 'Nhà cung cấp',
  sourceType: 'Supplier',
  sourceName: null,
  sourceReference: null,
  status: 'Approved',
  createdBy: 'maker',
  createdByName: 'Người lập',
  expectedDate: '2026-10-28T14:35:00+07:00',
  createdAt: '2026-10-28T00:00:00Z',
  lineCount: 1,
  orderedQuantity: 10,
  receivedQuantity: 4,
}

beforeEach(() => {
  state.supplierId = 'supplier-a'
  state.permissions = [P.SUPPLIERS_VIEW, P.INBOUND_REQUESTS_VIEW]
  state.fetch.mockReset().mockResolvedValue({ data: { items: [row], totalCount: 21 } })
})
afterEach(cleanup)
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <SupplierDetailPage supplierId={state.supplierId} />
    </QueryClientProvider>
  )
  return {
    client,
    view,
    rerender: () =>
      view.rerender(
        <QueryClientProvider client={client}>
          <SupplierDetailPage supplierId={state.supplierId} />
        </QueryClientProvider>
      ),
  }
}

it('fetches newest requests from this supplier only, links details, and paginates on the server', async () => {
  mount()
  const panel = await screen.findByRole('region', { name: 'Lịch sử yêu cầu nhập kho' })
  await within(panel).findByRole('table')
  expect(state.fetch).toHaveBeenCalledWith({
    supplierId: 'supplier-a',
    pageNumber: 1,
    pageSize: 10,
    sortDirection: OrderType.Descending,
  })
  const table = within(panel).getByRole('table')
  expect(within(table).getByRole('link', { name: 'NK000016' })).toHaveAttribute(
    'href',
    '/inbound-requests/request-a'
  )
  expect(within(table).getByText('28/10/2026 14:35')).toBeInTheDocument()
  fireEvent.click(within(panel).getByRole('button', { name: 'Trang sau' }))
  await waitFor(() =>
    expect(state.fetch).toHaveBeenLastCalledWith({
      supplierId: 'supplier-a',
      pageNumber: 2,
      pageSize: 10,
      sortDirection: OrderType.Descending,
    })
  )
})

it('does not fetch or render history without inbound view permission even when supplier view is allowed', () => {
  state.permissions = [P.SUPPLIERS_VIEW]
  mount()
  expect(state.fetch).not.toHaveBeenCalled()
  expect(screen.queryByRole('region', { name: 'Lịch sử yêu cầu nhập kho' })).not.toBeInTheDocument()
})

it('resets page and hides previous supplier/page placeholder rows while the next supplier loads', async () => {
  const view = mount()
  const panel = await screen.findByRole('region', { name: 'Lịch sử yêu cầu nhập kho' })
  await within(panel).findByRole('table')
  fireEvent.click(within(panel).getByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(2))
  await within(panel).findByRole('table')
  let resolveNext: (value: unknown) => void = () => {
    throw new Error('Request not started')
  }
  state.fetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveNext = resolve
      })
  )
  state.supplierId = 'supplier-b'
  view.rerender()
  expect(within(panel).queryByText('NK000016')).not.toBeInTheDocument()
  expect(within(panel).queryByRole('table')).not.toBeInTheDocument()
  await waitFor(() =>
    expect(state.fetch).toHaveBeenLastCalledWith({
      supplierId: 'supplier-b',
      pageNumber: 1,
      pageSize: 10,
      sortDirection: OrderType.Descending,
    })
  )
  await act(async () =>
    resolveNext({
      data: {
        items: [{ ...row, id: 'request-b', supplierId: 'supplier-b', inboundRequestCode: 'NK-B' }],
        totalCount: 1,
      },
    })
  )
  await within(panel).findByRole('table')
  expect(within(within(panel).getByRole('table')).getByText('NK-B')).toBeInTheDocument()
  expect(within(panel).queryByText('NK000016')).not.toBeInTheDocument()
})

it('masks cached history on refetch failure and after the user loses view permission', async () => {
  const view = mount()
  const panel = await screen.findByRole('region', { name: 'Lịch sử yêu cầu nhập kho' })
  await within(panel).findByRole('table')
  state.fetch.mockRejectedValue(new Error('Denied'))
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: queryKeys.inboundRequests.all })
  })
  await within(panel).findByText('Không thể tải lịch sử nhập kho')
  expect(within(panel).queryByRole('table')).not.toBeInTheDocument()
  state.permissions = [P.SUPPLIERS_VIEW]
  view.rerender()
  expect(screen.queryByRole('region', { name: 'Lịch sử yêu cầu nhập kho' })).not.toBeInTheDocument()
})
