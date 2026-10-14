import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransferPutAwayRulesQuery } from './use-transfer-putaway-plan'
import { useTransferPlanEditor } from './use-transfer-plan-editor'
import { putAwaySuggestionsFixture } from '../utils/transfer-receipt-test-fixtures'
import { buildTransfer, buildTransferItem } from '../utils/transfer-test-fixtures'
import { planLine } from '../utils/transfer-plan-test-fixtures'

const mock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }))
vi.mock('../services/transfer.service', () => ({
  transferService: { getPutAwayPlanSuggestions: mock.get, setPutAwayPlan: mock.set },
}))
vi.mock('./use-transfers', () => ({
  invalidateTransferQueries: vi.fn(),
  TRANSFER_MUTATION_KEY: ['transfer'],
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  mock.get.mockResolvedValue({ data: putAwaySuggestionsFixture() })
})
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('Tự điền theo quy tắc kho', () => {
  it('fills remaining quantity around locked previously stored locations, without duplicating them', () => {
    const suggestions = putAwaySuggestionsFixture()
    const slot = suggestions.items[0]!.suggestions[0]!
    slot.suggestedQuantity = 5
    const transfer = buildTransfer({
      items: [
        buildTransferItem({
          id: suggestions.items[0]!.itemId,
          putAwayPlan: [],
          receivedPutAwayLocations: [{ slotId: slot.slotId, path: slot.path, receivedQuantity: 3 }],
        }),
      ],
    })
    const { result } = renderHook(() => useTransferPlanEditor(transfer, new Map(), true), {
      wrapper: setup(),
    })
    act(() => result.current.open())
    act(() => result.current.seedSuggestions(suggestions))
    expect(result.current.draft[0]?.lines).toHaveLength(1)
    expect(result.current.draft[0]?.lines[0]?.plannedTotal).toBe(8)
    expect(mock.set).not.toHaveBeenCalled()
  })
  it('keeps an existing saved plan untouched even with different rule suggestions', () => {
    const suggestions = putAwaySuggestionsFixture()
    const transfer = buildTransfer({
      items: [
        buildTransferItem({
          id: suggestions.items[0]!.itemId,
          putAwayPlan: [planLine({ plannedTotal: 4, receivedQuantity: 0 })],
        }),
      ],
    })
    const { result } = renderHook(() => useTransferPlanEditor(transfer, new Map(), true), {
      wrapper: setup(),
    })
    act(() => result.current.open())
    const before = result.current.draft
    act(() => result.current.seedSuggestions(suggestions))
    expect(result.current.draft).toEqual(before)
    expect(result.current.isDirty).toBe(false)
  })
  it('does not request suggestions without capability', async () => {
    renderHook(() => useTransferPutAwayRulesQuery('transfer', 'shipment', 'v1', false), {
      wrapper: setup(),
    })
    expect(mock.get).not.toHaveBeenCalled()
  })
  it('explicitly disables AI and requests fresh rules after a version change', async () => {
    const { result, rerender } = renderHook(
      ({ version }) => useTransferPutAwayRulesQuery('transfer', 'shipment', version, true),
      { initialProps: { version: 'v1' }, wrapper: setup() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mock.get).toHaveBeenCalledWith('transfer', 'shipment', false)
    rerender({ version: 'v2' })
    await waitFor(() => expect(mock.get).toHaveBeenCalledTimes(2))
  })
  it('seeds an empty plan with quantities, requires saving and never overwrites an edited draft', () => {
    const suggestions = putAwaySuggestionsFixture()
    const transfer = buildTransfer({
      items: [
        buildTransferItem({
          id: suggestions.items[0]!.itemId,
          putAwayPlan: [],
          receivedPutAwayLocations: [],
        }),
      ],
    })
    const { result } = renderHook(() => useTransferPlanEditor(transfer, new Map(), true), {
      wrapper: setup(),
    })
    act(() => result.current.open())
    act(() => result.current.seedSuggestions(suggestions))
    expect(result.current.draft[0]?.lines[0]?.plannedTotal).toBe(8)
    expect(result.current.isDirty).toBe(true)
    const edited = result.current.draft.map((item) => ({
      ...item,
      lines: item.lines.map((line) => ({ ...line, plannedTotal: 3 })),
    }))
    act(() => result.current.change(edited))
    act(() => result.current.seedSuggestions(suggestions))
    expect(result.current.draft[0]?.lines[0]?.plannedTotal).toBe(3)
    expect(mock.set).not.toHaveBeenCalled()
  })
  it('does not overwrite a saved plan or seed for a viewer without management capability', () => {
    const suggestions = putAwaySuggestionsFixture()
    const transfer = buildTransfer({
      items: [buildTransferItem({ id: suggestions.items[0]!.itemId })],
    })
    const { result } = renderHook(() => useTransferPlanEditor(transfer, new Map(), false), {
      wrapper: setup(),
    })
    act(() => result.current.open())
    const before = result.current.draft
    act(() => result.current.seedSuggestions(suggestions))
    expect(result.current.draft).toEqual(before)
    expect(result.current.isDirty).toBe(false)
  })
})
