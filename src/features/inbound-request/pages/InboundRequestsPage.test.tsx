import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InboundRequestDirectory } from '../components/InboundRequestsPage'
import type {
  InboundMasterDetail,
  InboundGoodsPreview,
} from '@/features/inbound/components/InboundWorkspace'
import InboundRequestsPage from './InboundRequestsPage'

const state = vi.hoisted(() => ({
  items: [
    { id: 'first', inboundRequestCode: 'NK000001' },
    { id: 'second', inboundRequestCode: 'NK000002' },
  ],
  isError: false,
  isPlaceholderData: false,
  detail: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'owner', permissions: [] } }),
}))
vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false }),
}))
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }))
vi.mock('../hooks/use-inbound-requests', () => {
  const mutation = () => ({ isPending: false, mutate: vi.fn() })
  return {
    useDeleteInboundRequestMutation: mutation,
    useDeleteInboundRequestsMutation: mutation,
    useApproveInboundRequestsMutation: mutation,
    useDuplicateInboundRequestMutation: mutation,
    useSubmitInboundRequestsMutation: mutation,
    useSubmitInboundRequestMutation: mutation,
    useInboundRequestsQuery: () => ({
      data: { items: state.items, totalCount: state.items.length },
      isError: state.isError,
      isPlaceholderData: state.isPlaceholderData,
      isLoading: false,
      isFetching: false,
    }),
    useInboundRequestQuery: (id: string) => state.detail(id),
  }
})
vi.mock('../components/InboundRequestsPage', () => ({
  InboundRequestDirectory: ({
    items,
    onOpen,
    previewId,
  }: ComponentProps<typeof InboundRequestDirectory>) => (
    <div>
      {items.map((item) => (
        <button key={item.id} aria-pressed={previewId === item.id} onClick={() => onOpen?.(item)}>
          {item.inboundRequestCode}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/features/inbound/components/InboundWorkspace', () => ({
  INBOUND_DETAIL_STORAGE_KEY: 'inbound-goods-detail:v1',
  InboundPageHeader: () => null,
  InboundMasterDetail: ({
    children,
    detail,
    expanded,
    onExpandedChange,
    referenceCode,
  }: ComponentProps<typeof InboundMasterDetail>) => (
    <div>
      {children}
      <button onClick={() => onExpandedChange(!expanded)}>Toggle detail</button>
      {expanded && (
        <section aria-label="Chi tiết hàng hóa">
          {referenceCode}
          {detail}
        </section>
      )}
    </div>
  ),
  InboundGoodsPreview: ({
    selected,
    rows,
    isError,
    onRetry,
  }: ComponentProps<typeof InboundGoodsPreview>) => (
    <div>
      {!selected ? (
        'Chọn chứng từ'
      ) : isError ? (
        <button onClick={onRetry}>Thử lại</button>
      ) : (
        rows.map((row) => <span key={row.id}>{row.name}</span>)
      )}
    </div>
  ),
}))

function detailResult(id: string): {
  data?: { lines: unknown[] }
  isError: boolean
  isLoading: boolean
  refetch: () => void
} {
  return {
    data: id
      ? {
          lines: [
            {
              id: `line-${id}`,
              productName: `Hàng ${id}`,
              productSKU: id,
              quantity: 10,
              receivedQuantity: 2,
            },
          ],
        }
      : undefined,
    isError: false,
    isLoading: false,
    refetch: state.refetch,
  }
}

beforeEach(() => {
  localStorage.clear()
  state.isError = false
  state.isPlaceholderData = false
  state.items = [
    { id: 'first', inboundRequestCode: 'NK000001' },
    { id: 'second', inboundRequestCode: 'NK000002' },
  ]
  state.detail.mockReset().mockImplementation(detailResult)
  state.refetch.mockClear()
})
afterEach(cleanup)

describe('inbound request goods preview wiring', () => {
  it('fetches only the selected document when expanded and stops when collapsed', () => {
    render(<InboundRequestsPage />)
    expect(state.detail).toHaveBeenLastCalledWith('')
    fireEvent.click(screen.getByRole('button', { name: 'NK000001' }))
    expect(state.detail).toHaveBeenLastCalledWith('')
    expect(screen.queryByRole('region', { name: 'Chi tiết hàng hóa' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle detail' }))
    expect(state.detail).toHaveBeenLastCalledWith('first')
    expect(screen.getByRole('region', { name: 'Chi tiết hàng hóa' })).toHaveTextContent(
      'NK000001Hàng first'
    )
    expect(screen.getByRole('button', { name: 'NK000001' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'NK000002' }))
    expect(state.detail).toHaveBeenLastCalledWith('second')
    expect(screen.queryByText('Hàng first')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle detail' }))
    expect(state.detail).toHaveBeenLastCalledWith('')
    expect(screen.queryByRole('region', { name: 'Chi tiết hàng hóa' })).not.toBeInTheDocument()
  })

  it.each(['placeholder', 'error', 'different page'])(
    'does not preview a selection from %s list data',
    (scenario) => {
      const view = render(<InboundRequestsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'NK000001' }))
      fireEvent.click(screen.getByRole('button', { name: 'Toggle detail' }))
      if (scenario === 'placeholder') state.isPlaceholderData = true
      else if (scenario === 'error') state.isError = true
      else state.items = []
      view.rerender(<InboundRequestsPage />)
      expect(state.detail).toHaveBeenLastCalledWith('')
      expect(screen.getByText('Chọn chứng từ')).toBeInTheDocument()
      expect(screen.queryByText('Hàng first')).not.toBeInTheDocument()
    }
  )

  it('retries a failed detail without losing the selected document', () => {
    state.detail.mockImplementation((id: string) => ({ ...detailResult(id), isError: Boolean(id) }))
    render(<InboundRequestsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'NK000001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle detail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(state.refetch).toHaveBeenCalledOnce()
    expect(state.detail).toHaveBeenLastCalledWith('first')
  })
})
