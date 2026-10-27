import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GoodsReceiptsPage from './GoodsReceiptsPage'
import type { ReceiptDirectory } from '../components/ReceiptsPage'
import type { InboundMasterDetail, InboundStageGoodsPreview } from '../components/InboundWorkspace'

const state = vi.hoisted(() => ({
  detailId: 'A',
  placeholder: false,
  error: false,
  detailError: false,
  view: true,
  detailCalls: vi.fn(),
  actionsCalls: vi.fn(),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: state.view ? ['goods_receipts.view'] : [] } }),
}))
vi.mock('@/config/permissionCodes', () => ({
  P: {
    GOODS_RECEIPTS_VIEW: 'goods_receipts.view',
    GOODS_RECEIPTS_APPROVE: 'goods_receipts.approve',
  },
}))
vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false }),
}))
vi.mock('../hooks/use-inbound', () => ({
  useGoodsReceiptsQuery: () => ({
    data: {
      items: [
        { id: 'A', receiptCode: 'PN-A' },
        { id: 'B', receiptCode: 'PN-B' },
      ],
      totalCount: 2,
    },
    isLoading: false,
    isFetching: false,
    isError: state.error,
    isPlaceholderData: state.placeholder,
    refetch: vi.fn(),
  }),
  useGoodsReceiptQuery: (id: string) => {
    state.detailCalls(id)
    return {
      data: id ? { id: state.detailId, status: 'Approved', items: [] } : undefined,
      isLoading: false,
      isError: state.detailError,
      refetch: vi.fn(),
    }
  },
  useInboundAllowedActionsQuery: (id: string) => {
    state.actionsCalls(id)
    return { data: { allowedActions: [] } }
  },
  useApproveGoodsReceiptMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
vi.mock('../components/InboundWorkspace', () => ({
  InboundPageHeader: () => null,
  InboundMasterDetail: ({
    children,
    detail,
    expanded,
    referenceCode,
  }: ComponentProps<typeof InboundMasterDetail>) => (
    <>
      <div>{children}</div>
      <div data-testid="detail" hidden={!expanded}>
        {referenceCode}
        {detail}
      </div>
    </>
  ),
  InboundStageGoodsPreview: ({
    selected,
    isLoading,
    isError,
  }: ComponentProps<typeof InboundStageGoodsPreview>) => (
    <span>
      {isError
        ? 'preview-error'
        : isLoading
          ? 'preview-loading'
          : selected
            ? 'preview-ready'
            : 'preview-empty'}
    </span>
  ),
}))
vi.mock('../components/ReceiptsPage', () => ({
  ReceiptDirectory: ({
    items,
    onPreview,
    previewAction,
    onSearchChange,
  }: ComponentProps<typeof ReceiptDirectory>) => (
    <>
      {items.map((item) => (
        <button key={item.id} onClick={() => onPreview?.(item)}>
          select-{item.id}
        </button>
      ))}
      {previewAction}
      <button onClick={() => onSearchChange('new')}>filter</button>
    </>
  ),
}))
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  localStorage.clear()
  Object.assign(state, {
    detailId: 'A',
    placeholder: false,
    error: false,
    detailError: false,
    view: true,
  })
  state.detailCalls.mockClear()
  state.actionsCalls.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('does not enable receipt detail until explicitly opened, and does not fetch allowed-actions for preview', () => {
  render(<GoodsReceiptsPage />)
  fireEvent.click(screen.getByText('select-A'))
  expect(state.detailCalls.mock.calls.flat().filter(Boolean)).toEqual([])
  fireEvent.click(screen.getByRole('button', { name: 'Xem hàng hóa PN-A' }))
  expect(state.detailCalls).toHaveBeenCalledWith('A')
  expect(state.actionsCalls.mock.calls.flat().filter(Boolean)).toEqual([])
  expect(screen.getByTestId('detail')).toHaveTextContent('PN-Apreview-ready')
  fireEvent.click(screen.getByText('select-B'))
  expect(screen.getByTestId('detail')).toHaveTextContent('PN-Bpreview-loading')
  fireEvent.click(screen.getByText('filter'))
  expect(screen.getByTestId('detail')).toHaveTextContent('preview-empty')
})
it('does not select placeholder rows or issue detail requests without effective receipt permission', () => {
  state.placeholder = true
  const { rerender } = render(<GoodsReceiptsPage />)
  fireEvent.click(screen.getByText('select-A'))
  expect(screen.getByRole('button', { name: 'Xem hàng hóa' })).toBeDisabled()
  state.placeholder = false
  state.view = false
  rerender(<GoodsReceiptsPage />)
  fireEvent.click(screen.getByText('select-A'))
  expect(state.detailCalls.mock.calls.flat().filter(Boolean)).toEqual([])
})
it('shows detail errors rather than successful zero quantities', () => {
  state.detailError = true
  render(<GoodsReceiptsPage />)
  fireEvent.click(screen.getByText('select-A'))
  fireEvent.click(screen.getByRole('button', { name: 'Xem hàng hóa PN-A' }))
  expect(screen.getByTestId('detail')).toHaveTextContent('preview-error')
})
