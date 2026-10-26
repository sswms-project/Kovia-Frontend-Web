import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useReceivingLocationSelection } from './use-receiving-location-selection'
import { ReceivingLocationPicker } from '../components/ReceivingLocationPicker'

const receivingLocations = vi.hoisted(() => vi.fn())
vi.mock('../services/inbound.service', () => ({ inboundService: { receivingLocations } }))
afterEach(() => vi.clearAllMocks())

function DamageLocationPicker() {
  const state = useReceivingLocationSelection('A', 'damage', true, true)
  return <ReceivingLocationPicker state={state} />
}

it('keeps damaged-stock isolation separate from the receiving waiting-area wording', () => {
  const client = new QueryClient()
  receivingLocations.mockResolvedValue({ data: { items: [], totalCount: 0 } })
  render(
    <QueryClientProvider client={client}>
      <DamageLocationPicker />
    </QueryClientProvider>
  )
  expect(screen.getByRole('combobox', { name: 'Vị trí cách biệt hàng hỏng' })).toBeInTheDocument()
  expect(screen.queryByText('Vị trí tại khu chờ cất hàng')).not.toBeInTheDocument()
  expect(screen.getByText(/không đặt chung với hàng đạt hoặc chờ kiểm/)).toBeInTheDocument()
})

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  receivingLocations.mockResolvedValue({
    data: { items: [{ id: 'slot', displayPath: 'Điểm chờ 01' }], totalCount: 1 },
  })
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    ({ warehouse, session }) => useReceivingLocationSelection(warehouse, session, true),
    {
      initialProps: { warehouse: 'A', session: 'first' },
      wrapper,
    }
  )
}

it('debounces rapid typing and keeps a chosen physical location', async () => {
  const { result } = setup()
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
  act(() => result.current.choose('slot'))
  act(() => result.current.searchFor('K'))
  act(() => result.current.searchFor('Kh'))
  act(() => result.current.searchFor('Khu chờ'))
  expect(result.current.isSearching).toBe(true)
  expect(receivingLocations).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(receivingLocations).toHaveBeenCalledTimes(2))
  expect(receivingLocations.mock.calls[1]?.slice(0, 3)).toEqual(['A', 'Khu chờ', 1])
  expect(result.current.selected?.id).toBe('slot')
})

it('does not reuse the previous warehouse selection or pending search in a new session', async () => {
  const { result, rerender } = setup()
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
  act(() => {
    result.current.choose('slot')
    result.current.searchFor('old')
  })
  rerender({ warehouse: 'B', session: 'second' })
  expect(result.current.selected).toBeNull()
  expect(result.current.search).toBe('')
  await waitFor(() =>
    expect(receivingLocations).toHaveBeenCalledWith('B', '', 1, expect.any(AbortSignal), false)
  )
  expect(
    receivingLocations.mock.calls.some(
      ([warehouse, search]) => warehouse === 'B' && search === 'old'
    )
  ).toBe(false)
})

it('autofills only an explicit suggestion and keeps a staff override after refresh', async () => {
  const items = [
    { id: 'default', displayPath: 'Khu A / Điểm chờ nhận', isSuggested: true },
    { id: 'other', displayPath: 'Khu B / Điểm chờ nhận' },
  ]
  receivingLocations.mockResolvedValueOnce({ data: { items, totalCount: 2 } })
  const { result } = setup()
  await waitFor(() => expect(result.current.selected?.id).toBe('default'))
  act(() => result.current.choose('other'))
  receivingLocations.mockResolvedValue({ data: { items, totalCount: 2 } })
  await act(async () => {
    await result.current.query.refetch()
  })
  expect(result.current.selected?.id).toBe('other')
})

it.each(['search', 'page'] as const)(
  'keeps the autofilled point while browsing by %s',
  async (action) => {
    receivingLocations.mockResolvedValueOnce({
      data: {
        items: [{ id: 'default', displayPath: 'Khu A / Điểm chờ nhận', isSuggested: true }],
        totalCount: 40,
      },
    })
    const { result } = setup()
    await waitFor(() => expect(result.current.selected?.id).toBe('default'))
    act(() => {
      if (action === 'search') result.current.searchFor('Khu B')
      else result.current.changePage(2)
    })
    expect(result.current.selected?.id).toBe('default')
    await waitFor(() =>
      expect(result.current.query.isSuccess && !result.current.isSearching).toBe(true)
    )
    expect(result.current.selected?.id).toBe('default')
  }
)

it('preserves the latest explicit choice or clear when search updates are batched', async () => {
  receivingLocations.mockResolvedValueOnce({
    data: {
      items: [
        { id: 'default', displayPath: 'Khu A', isSuggested: true },
        { id: 'other', displayPath: 'Khu B' },
      ],
      totalCount: 2,
    },
  })
  const { result } = setup()
  await waitFor(() => expect(result.current.selected?.id).toBe('default'))
  act(() => {
    result.current.choose('other')
    result.current.searchFor('Khu B')
  })
  expect(result.current.selected?.id).toBe('other')
  act(() => {
    result.current.choose('')
    result.current.searchFor('')
  })
  expect(result.current.selected).toBeNull()
})
